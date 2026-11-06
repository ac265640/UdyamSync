"""Business analytics on the case data: baseline funnel, "Replay the Quarter" counterfactual,
compliance leak report, segment opportunity matrix, and live product telemetry.

Every projection is computed from smb_leads.csv plus explicitly stated, adjustable assumptions.
Nothing is hard-coded as a "projected" number.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd

from . import store
from .data import SEGMENT_CODES, get_dataset
from .partner import FEATURE_FOR_REASON, RECOVERABILITY
from .rules import BusinessContext, violations_for_bundle

STAGES = ["Lead", "Contacted", "Needs assessed", "Quote accepted", "KYC complete", "Activated"]
STAGE_DATE = {"Contacted": "contacted_date", "Needs assessed": "needs_assessed_date", "Quote accepted": "quote_accepted_date", "KYC complete": "kyc_complete_date", "Activated": "activated_date"}


def _reached(leads: pd.DataFrame, stage: str) -> pd.Series:
    if stage == "Lead":
        return pd.Series(True, index=leads.index)
    return leads[STAGE_DATE[stage]].notna()


@lru_cache
def baseline() -> dict:
    L = get_dataset().leads
    act = L[L.outcome == "Activated"]
    funnel = []
    prev = None
    for st in STAGES:
        n = int(_reached(L, st).sum())
        funnel.append({"stage": st, "count": n, "pct_prev": round(100 * n / prev, 1) if prev else None})
        prev = n
    drops = (
        L[L.outcome == "Dropped"].groupby(["stage_reached", "drop_reason"]).size().reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    churn = (act.churned_within_6_months == "Y")
    by_calls = act.groupby("customer_follow_up_calls").agg(n=("lead_id", "size"), churn=("churned_within_6_months", lambda s: (s == "Y").mean()), nps=("nps_score", "mean")).reset_index()
    return {
        "leads": len(L),
        "activations": len(act),
        "conversion_pct": round(100 * len(act) / len(L), 2),
        "avg_days_to_activate": round(float(act.days_lead_to_activation.mean()), 1),
        "avg_chase_calls": round(float(act.customer_follow_up_calls.mean()), 2),
        "total_acquisition_cost": int(L.acquisition_cost_inr.sum()),
        "cac_per_activation": int(L.acquisition_cost_inr.sum() / len(act)),
        "churn_6m_pct": round(float(100 * churn.mean()), 1),
        "avg_nps": round(float(act.nps_score.mean()), 2),
        "median_bundle_value": int(act.monthly_bundle_value_inr.median()),
        "activation_with_gstin_pct": round(100 * (L[L.has_gstin == "Y"].outcome == "Activated").mean(), 1),
        "activation_without_gstin_pct": round(100 * (L[L.has_gstin == "N"].outcome == "Activated").mean(), 1),
        "funnel": funnel,
        "drops": [{"stage": r.stage_reached, "reason": r.drop_reason, "count": int(r.count), "feature": FEATURE_FOR_REASON.get(r.drop_reason), "default_recovery": RECOVERABILITY.get(r.drop_reason, 0.0)} for r in drops.itertuples()],
        "churn_by_calls": [{"calls": int(r.customer_follow_up_calls), "n": int(r.n), "churn_pct": round(100 * r.churn, 1), "nps": round(float(r.nps), 2)} for r in by_calls.itertuples()],
        "by_source": _group(L, "lead_source"),
        "by_segment": _group(L, "segment"),
    }


def _group(L: pd.DataFrame, col: str) -> list[dict]:
    g = L.groupby(col).agg(leads=("lead_id", "size"), activated=("outcome", lambda s: (s == "Activated").sum()), cost=("acquisition_cost_inr", "sum")).reset_index()
    g["conversion_pct"] = (100 * g.activated / g.leads).round(1)
    g["cac_per_activation"] = (g.cost / g.activated.replace(0, np.nan)).round(0)
    return [{col: r[col], "leads": int(r.leads), "activated": int(r.activated), "conversion_pct": float(r.conversion_pct), "cac_per_activation": None if pd.isna(r.cac_per_activation) else int(r.cac_per_activation)} for _, r in g.iterrows()]


@lru_cache
def _install_days_digital() -> float:
    """Days to activate in the new journey, from the actual bundles bought: quote + KYC same day,
    then the slowest product's install time (+1 day for scheduling)."""
    ds = get_dataset()
    act = ds.leads[ds.leads.outcome == "Activated"]
    days = []
    for b in act.bundle_products.dropna():
        ids = [x.split("x")[0] for x in b.split(";")]
        days.append(max(ds.products[i].install_days for i in ids) + 1)
    return float(np.mean(days))


def replay(recovery: dict[str, float] | None = None, *, chase_calls_new: float = 0.5, field_cost_avoided_pct: float = 40.0, platform_cost_per_lead: float = 40.0) -> dict:
    """Counterfactual: run the same 5,000 leads through UdyamSync.

    At each funnel stage, the leads that historically dropped are split by drop reason; a share
    `recovery[reason]` of them is won back by the digital feature that removes that reason, and
    continues down the funnel (where it can still drop at the new stage rates).
    """
    b = baseline()
    L = get_dataset().leads
    rec = {**RECOVERABILITY, **(recovery or {})}
    rows = []
    survivors = float(len(L))
    old_counts = {f["stage"]: f["count"] for f in b["funnel"]}
    for i, st in enumerate(STAGES[:-1]):
        nxt = STAGES[i + 1]
        at = old_counts[st]
        passed = old_counts[nxt]
        dropped_here = L[(L.outcome == "Dropped") & (L.stage_reached == st)]
        recovered = sum(len(g) * rec.get(reason, 0.0) for reason, g in dropped_here.groupby("drop_reason"))
        old_rate = passed / at
        new_rate = min(0.99, (passed + recovered) / at)
        new_survivors = survivors * new_rate
        rows.append({"from": st, "to": nxt, "old_rate_pct": round(100 * old_rate, 1), "new_rate_pct": round(100 * new_rate, 1)})
        survivors = new_survivors
    new_acts = survivors
    old_acts = b["activations"]
    # Acquisition cost: field/partner spend falls for leads that self-serve; add platform run-cost.
    spend_old = b["total_acquisition_cost"]
    spend_new = spend_old * (1 - field_cost_avoided_pct / 100) + platform_cost_per_lead * len(L)
    # Churn/NPS from the observed relationship with chase calls (interpolated).
    cb = pd.DataFrame(b["churn_by_calls"])
    churn_new = float(np.interp(max(1.0, chase_calls_new), cb.calls, cb.churn_pct))
    nps_new = float(np.interp(max(1.0, chase_calls_new), cb.calls, cb.nps))
    days_new = round(_install_days_digital(), 1)
    act = L[L.outcome == "Activated"]
    mrr_by_seg = act.groupby("segment").monthly_bundle_value_inr.median().to_dict()
    seg_mix = act.segment.value_counts(normalize=True).to_dict()
    blended_mrr = sum(mrr_by_seg[s] * w for s, w in seg_mix.items())
    extra = new_acts - old_acts
    return {
        "assumptions": {"recovery": rec, "chase_calls_new": chase_calls_new, "field_cost_avoided_pct": field_cost_avoided_pct, "platform_cost_per_lead": platform_cost_per_lead,
                        "notes": [
                            "Recovered leads continue down the funnel and can still drop at later stages.",
                            "Days to activate = quote + KYC on day 0, then the slowest product's install time in each historically bought bundle, +1 day scheduling.",
                            "Churn and NPS are read off the observed relationship between chase calls and churn/NPS (1 call → 5.9% churn).",
                            "Acquisition cost: field/partner spend reduced by the stated %, plus platform cost per lead (AI, OCR, hosting).",
                        ]},
        "stages": rows,
        "before": {"activations": old_acts, "conversion_pct": b["conversion_pct"], "days_to_activate": b["avg_days_to_activate"], "chase_calls": b["avg_chase_calls"],
                   "cac": b["cac_per_activation"], "churn_6m_pct": b["churn_6m_pct"], "nps": b["avg_nps"]},
        "after": {"activations": int(round(new_acts)), "conversion_pct": round(100 * new_acts / len(L), 2), "days_to_activate": days_new, "chase_calls": chase_calls_new,
                  "cac": int(spend_new / new_acts), "churn_6m_pct": round(churn_new, 1), "nps": round(nps_new, 2)},
        "impact": {
            "extra_activations_per_quarter": int(round(extra)),
            "extra_annual_recurring_revenue_inr": int(round(extra * blended_mrr * 12 * 4)),
            "blended_monthly_bundle_value": int(blended_mrr),
        },
    }


@lru_cache
def compliance() -> dict:
    """Historical activations that broke catalogue rules (GSTIN, tier, size, dependencies),
    re-run through the UdyamSync rules engine."""
    ds = get_dataset()
    L = ds.leads
    act = L[L.outcome == "Activated"].merge(ds.gstin[["status"]], left_on="gstin", right_index=True, how="left")
    cases = []
    for r in act.itertuples():
        status = "none" if pd.isna(r.gstin) else str(r.status).lower() if not pd.isna(r.status) else "unverified"
        ctx = BusinessContext(city_tier=int(r.city_tier), employees=int(r.employee_count), sites=int(r.num_sites), gstin_status=status)
        ids = [x.split("x")[0] for x in r.bundle_products.split(";")]
        v = violations_for_bundle(ids, ctx)
        if v:
            cases.append({"lead_id": r.lead_id, "business_type": r.business_type, "segment": r.segment, "city": r.city, "gstin_status": status,
                          "bundle": r.bundle_products, "monthly_value": int(r.monthly_bundle_value_inr),
                          "violations": [{"product": ds.products[x["product_id"]].name, "rule": x["code"], "message": x["message"]} for x in v]})
    by_rule: dict[str, int] = {}
    for c in cases:  # activations affected per rule (an activation can break several)
        for rule in {v["rule"] for v in c["violations"]}:
            by_rule[rule] = by_rule.get(rule, 0) + 1
    return {"activations_checked": len(act), "violating_activations": len(cases), "blocked_by_rules_engine": len(cases), "after": 0,
            "by_rule": by_rule, "monthly_revenue_at_risk": sum(c["monthly_value"] for c in cases), "cases": cases}


@lru_cache
def segments() -> list[dict]:
    L = get_dataset().leads
    out = []
    for seg, g in L.groupby("segment"):
        a = g[g.outcome == "Activated"]
        churn = (a.churned_within_6_months == "Y").mean()
        mrr = float(a.monthly_bundle_value_inr.median())
        cac = g.acquisition_cost_inr.sum() / max(1, len(a))
        out.append({
            "segment": seg, "code": SEGMENT_CODES[seg], "leads": len(g), "share_of_leads_pct": round(100 * len(g) / len(L), 1),
            "conversion_pct": round(100 * len(a) / len(g), 1), "median_mrr": int(mrr), "churn_6m_pct": round(100 * churn, 1),
            "nps": round(float(a.nps_score.mean()), 2), "cac_per_activation": int(cac),
            "payback_months": round(cac / mrr, 1) if mrr else None,
            "value_12m_per_activation": int(mrr * 12 * (1 - churn)),
            "avg_days": round(float(a.days_lead_to_activation.mean()), 1),
        })
    order = {"prof": 1, "micro": 2, "multi": 3, "mfg": 4}
    plays = {
        "prof": "Lead segment: digital-first advisor + OneBill. High conversion, low churn, fast payback.",
        "micro": "Scale segment: WhatsApp-first, Essential bundle, partner-assisted KYC. Volume play — cost-to-serve must stay low.",
        "multi": "Value segment: advisor qualifies, field sales closes multi-site design (SD-WAN, failover).",
        "mfg": "Enterprise-like: route to solutions experts; advisor captures the need and books a survey.",
    }
    for s in out:
        s["priority"] = order[s["code"]]
        s["play"] = plays[s["code"]]
    return sorted(out, key=lambda s: s["priority"])


def live() -> dict:
    """Real telemetry from this running instance (sessions, orders, handoffs)."""
    sessions = [s for s in store.find("sessions", limit=5000) if s.get("channel") != "eval"]
    orders = store.find("orders", limit=5000)
    leads = [l for l in store.find("leads", limit=5000) if not l.get("test")]
    stages = {"started": len(sessions), "recommended": sum(1 for s in sessions if s.get("recommendation")),
              "checkout": sum(1 for s in sessions if s.get("stage") in ("checkout", "ordered")), "ordered": len(orders)}
    mins = []
    for o in orders:
        s = next((x for x in sessions if x["id"] == o["session_id"]), None)
        if s:
            mins.append((pd.Timestamp(o["created"]) - pd.Timestamp(s["created"])).total_seconds() / 60)
    return {"funnel": stages, "avg_minutes_to_order": round(float(np.mean(mins)), 1) if mins else None,
            "handoffs": len(leads), "orders_live": sum(1 for o in orders if o["status"] == "live"),
            "by_lang": pd.Series([s["lang"] for s in sessions]).value_counts().to_dict() if sessions else {},
            "by_channel": pd.Series([s["channel"] for s in sessions]).value_counts().to_dict() if sessions else {}}

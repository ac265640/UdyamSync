"""Partner Co-Pilot: inbox of leads the advisor couldn't close, scoring, actions, earnings, KYC queue."""
import math

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import store
from ..data import SEGMENT_CODES
from ..partner import FEATURE_FOR_REASON, historical_inbox, model, next_action
from ..privacy import mask_name, mask_phone

router = APIRouter(prefix="/api/partner", tags=["partner"])
PARTNERS = {
    "P-LKO-014": {"name": "Shree Telecom (Lucknow)", "type": "Channel partner"},
    "P-PUN-007": {"name": "Deccan Digital (Pune)", "type": "Channel partner"},
    "FS-MUM-22": {"name": "Field sales — Mumbai West", "type": "Field sales"},
}


class ActionIn(BaseModel):
    action: str  # contacted | whatsapp_sent | won | lost | snooze
    note: str = ""


@router.get("/partners")
def partners() -> dict:
    return PARTNERS


@router.get("/inbox")
def inbox(partner_id: str | None = None, segment: str | None = None, reason: str | None = None, min_score: int = 0, limit: int = 25, page: int = 1) -> dict:
    live = []
    for l in store.find("leads", limit=2000):
        if l.get("test") or l.get("status") in ("won", "lost"):
            continue
        if partner_id and l.get("partner_id") not in (partner_id, None):
            continue
        p = l.get("profile") or {}
        live.append({
            "id": l["id"], "live": True, "business": p.get("business_name") or p.get("business_type") or "New business", "business_type": p.get("business_type"),
            "segment": p.get("segment_name"), "city": p.get("city"), "lang": l.get("lang"), "source": l.get("source"),
            "stage": l.get("stage_reached"), "reason": l.get("reason"), "score": l.get("score", 50), "factors": l.get("score_factors", []),
            "summary": l.get("summary"), "quote_monthly": l.get("quote_monthly"), "status": l.get("status"), "created": l.get("created"),
            "next_action": next_action(l.get("reason")), "recovered_by": FEATURE_FOR_REASON.get(l.get("reason") or ""), "events": l.get("events", [])[-5:],
        })
    live.sort(key=lambda x: -x["score"])
    h = historical_inbox()
    if segment:
        h = h[h.segment.map(SEGMENT_CODES) == segment] if segment in SEGMENT_CODES.values() else h[h.segment == segment]
    if reason:
        h = h[h.drop_reason == reason]
    h = h[h.score >= min_score]
    total = len(h)
    page_df = h.iloc[(page - 1) * limit: page * limit]
    X_expl = model().explain(_feat(page_df)) if len(page_df) else []
    hist = []
    for (_, r), factors in zip(page_df.iterrows(), X_expl):
        hist.append({
            "id": r.lead_id, "live": False, "business": r.business_name, "business_type": r.business_type, "segment": r.segment, "city": r.city,
            "lang": r.preferred_language, "source": r.lead_source, "stage": r.stage_reached, "reason": r.drop_reason, "score": int(r.score),
            "propensity_pct": round(100 * float(r.propensity), 1), "factors": factors,
            "contact": f"{mask_name(r.contact_name)} ({r.contact_role})", "phone": mask_phone("9" + r.lead_id[-4:].rjust(9, "8")),
            "summary": f"{r.business_type} in {r.city}, {r.employee_count} people, {r.num_sites} site(s); asked about {r.products_of_interest}. Dropped at '{r.stage_reached}': {r.drop_reason}.",
            "next_action": next_action(r.drop_reason), "recovered_by": FEATURE_FOR_REASON.get(r.drop_reason), "created": r.created_date,
        })
    return {"live": live, "historical": hist, "historical_total": total, "pages": math.ceil(total / limit) if limit else 1,
            "model": {"auc": round(model().auc, 3), "base_rate_pct": round(100 * model().base_rate, 1)}}


def _feat(df):
    from ..partner import _features
    return _features(df)


@router.post("/leads/{lead_id}/action")
def act(lead_id: str, body: ActionIn) -> dict:
    lead = store.get("leads", lead_id)
    if lead is None:
        # historical leads: record the action as a new CRM event
        lead = {"id": lead_id, "historical": True, "events": [], "status": "open"}
    lead.setdefault("events", []).append({"at": store.now_iso(), "event": body.action, "note": body.note[:200]})
    if body.action in ("won", "lost"):
        lead["status"] = body.action
    elif body.action in ("contacted", "whatsapp_sent"):
        lead["status"] = "in_progress"
    store.put("leads", lead, ref=lead.get("partner_id"))
    store.audit("partner", f"lead.{body.action}", lead_id)
    return {"ok": True, "status": lead["status"], "events": lead["events"][-5:]}


@router.get("/{partner_id}/earnings")
def earnings(partner_id: str) -> dict:
    if partner_id not in PARTNERS:
        raise HTTPException(404, "Unknown partner")
    orders = [o for o in store.find("orders", limit=5000) if o.get("partner_id") == partner_id]
    leads = [l for l in store.find("leads", limit=5000) if l.get("partner_id") == partner_id and not l.get("test")]
    total = sum(o.get("commission_illustrative", 0) for o in orders)
    return {
        "partner": PARTNERS[partner_id], "leads_submitted": len(leads) + len(orders), "assisted_checkouts": sum(1 for o in orders if o.get("assisted")),
        "orders": [{"id": o["id"], "business": o.get("business"), "monthly": o["quote"]["monthly_total"], "commission": o.get("commission_illustrative", 0), "status": o["status"], "created": o["created"]} for o in orders],
        "commission_total_illustrative": total,
        "policy_note": "Illustrative commission policy: assisted digital sale = 1x first month's recurring value + 10% of setup; a partner's lead that completes online on its own = 0.5x first month. Partners never lose a lead to the app.",
    }


@router.get("/kyc-queue")
def kyc_queue() -> list[dict]:
    out = []
    for case in store.find("documents", limit=2000):
        if case.get("kind") != "case" or not case.get("result") or case["result"]["verdict"] == "verified":
            continue
        s = store.get("sessions", case["session_id"]) or {}
        p = s.get("profile") or {}
        out.append({"session_id": case["session_id"], "business": p.get("business_name") or p.get("business_type"), "city": p.get("city"),
                    "verdict": case["result"]["verdict_label"], "issues": [c["message"] for c in case["result"]["checks"] if c["status"] != "pass"][:4]})
    return out

"""Partner Co-Pilot brains: lead propensity model, win-back scoring and next-best-action.

Model: logistic regression trained on the 5,000 historical leads (target = activated). It uses
only facts known at lead time (no funnel-stage leakage), so it can score a brand-new lead.
Explainability: per-feature contribution = coefficient x value, top factors shown to the partner.

Win-back score (0-100) for a lead that stalled = activation propensity, adjusted by how
recoverable its drop reason is with the digital journey (RECOVERABILITY below — the same
assumptions drive the "Replay the Quarter" simulator so the two stay consistent).
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from .data import SEGMENT_NAMES, get_dataset

CATEGORICAL = ["segment", "lead_source", "city_tier", "has_gstin", "has_udyam", "current_internet", "annual_turnover_band"]
NUMERIC = ["log_employees", "sites", "log_spend", "n_interest"]

# How much of each drop reason the digital journey can win back (0-1). Stated assumptions,
# editable as sliders in the executive dashboard.
RECOVERABILITY = {
    "Owner had no time for a visit": 0.80,
    "Visit not scheduled by sales": 0.85,
    "Quote too complex to understand": 0.80,
    "Quote took too long to arrive": 0.85,
    "Found paperwork too long": 0.75,
    "Missing GST or Udyam document": 0.55,
    "Authorised signatory not available": 0.70,
    "Document details did not match": 0.60,
    "First payment failed": 0.70,
    "Site not feasible for fibre": 0.70,
    "Installation delayed beyond 21 days": 0.50,
    "Price too high": 0.30,
    "Competitor offered cheaper plan": 0.25,
    "Decided to wait": 0.40,
    "Only wanted a mobile plan": 0.60,
    "Locked in with current provider": 0.30,
    "Customer cancelled before install": 0.30,
    "Unreachable after 3 attempts": 0.20,
    "Not interested on first call": 0.10,
    "Wrong or invalid number": 0.0,
}

# Which UdyamSync feature recovers which drop reason (shown in the simulator and cockpit).
FEATURE_FOR_REASON = {
    "Owner had no time for a visit": "Self-serve advisor (no visit needed)",
    "Visit not scheduled by sales": "Self-serve advisor (no visit needed)",
    "Quote too complex to understand": "OneBill: one plain-language monthly price",
    "Quote took too long to arrive": "OneBill: instant quote",
    "Found paperwork too long": "Smart KYC: registry lookups + DigiLocker",
    "Missing GST or Udyam document": "Smart KYC: registry lookup replaces the paper copy",
    "Authorised signatory not available": "Remote e-sign link to the signatory",
    "Document details did not match": "Smart KYC: instant mismatch feedback + retake",
    "First payment failed": "UPI AutoPay retry",
    "Site not feasible for fibre": "Automatic 5G AirFiber fallback",
    "Installation delayed beyond 21 days": "Tracker + SLA early warning",
    "Price too high": "Essential tier + 24-month price",
    "Competitor offered cheaper plan": "Essential tier + savings comparison",
    "Decided to wait": "Saved quote + WhatsApp resume link",
    "Only wanted a mobile plan": "Mobile-only quick path",
    "Locked in with current provider": "Contract-end reminder with locked quote",
    "Customer cancelled before install": "Tracker transparency",
    "Unreachable after 3 attempts": "WhatsApp-first contact",
    "Not interested on first call": "WhatsApp nurture",
    "Wrong or invalid number": "OTP-verified numbers",
}

NEXT_ACTION = {
    "Owner had no time for a visit": ("whatsapp", "Send the 2-minute WhatsApp advisor link — no visit needed."),
    "Visit not scheduled by sales": ("whatsapp", "Apologise and send the self-serve quote link today."),
    "Quote too complex to understand": ("whatsapp", "Send the one-page OneBill quote in their language."),
    "Quote took too long to arrive": ("whatsapp", "Send an instant OneBill quote now."),
    "Found paperwork too long": ("call", "Call and walk them through DigiLocker KYC (2 minutes)."),
    "Missing GST or Udyam document": ("call", "Offer GSTIN lookup instead of the paper certificate."),
    "Authorised signatory not available": ("whatsapp", "Send the remote e-sign link to the signatory."),
    "Document details did not match": ("call", "Call to fix the mismatch flagged by Smart KYC."),
    "First payment failed": ("whatsapp", "Send a fresh UPI AutoPay link."),
    "Site not feasible for fibre": ("whatsapp", "Offer 5G AirFiber — installed in ~2 days."),
    "Installation delayed beyond 21 days": ("call", "Escalate install and offer a goodwill credit."),
    "Price too high": ("whatsapp", "Send the Essential bundle on a 24-month price."),
    "Competitor offered cheaper plan": ("call", "Show the savings comparison; offer setup-fee waiver."),
    "Decided to wait": ("whatsapp", "Nudge with the saved quote before it expires."),
    "Only wanted a mobile plan": ("whatsapp", "Sell the mobile line now; add internet later."),
    "Locked in with current provider": ("schedule", "Set a reminder 30 days before their contract ends."),
    "Customer cancelled before install": ("call", "Understand why; offer a faster install slot."),
    "Unreachable after 3 attempts": ("whatsapp", "Try WhatsApp instead of calls."),
    "Not interested on first call": ("whatsapp", "Add to a light WhatsApp nurture."),
    "Wrong or invalid number": ("skip", "Verify the number with the source partner."),
    "Customer asked to talk to a person": ("call", "Call now — the customer asked for it."),
    "Advisor could not understand the customer": ("call", "Call in their language and finish discovery."),
    "Large account — needs solutions expert": ("visit", "Book a site survey with a solutions expert."),
}

FEATURE_LABELS = {
    "segment": "Segment", "lead_source": "Lead source", "city_tier": "City tier", "has_gstin": "Has GSTIN",
    "has_udyam": "Has Udyam", "current_internet": "Current internet", "annual_turnover_band": "Turnover",
    "log_employees": "Team size", "sites": "Number of sites", "log_spend": "Current telecom spend", "n_interest": "Products asked about",
}


def _features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    for c in CATEGORICAL:
        out[c] = df[c].astype(str)
    out["log_employees"] = np.log1p(df["employee_count"].astype(float))
    out["sites"] = df["num_sites"].astype(float)
    out["log_spend"] = np.log1p(df["monthly_telecom_spend_inr"].astype(float))
    out["n_interest"] = df["products_of_interest"].fillna("").str.count(";") + 1
    return out


class PropensityModel:
    @np.errstate(all="ignore")  # macOS Accelerate BLAS emits spurious matmul warnings
    def __init__(self) -> None:
        leads = get_dataset().leads
        X = _features(leads)
        y = (leads["outcome"] == "Activated").astype(int).values
        self.columns = list(pd.get_dummies(X, columns=CATEGORICAL).columns)
        Xd = self._design(X)
        self.mean, self.std = Xd.mean(0), Xd.std(0) + 1e-9
        Xtr, Xte, ytr, yte = train_test_split(Xd, y, test_size=0.25, random_state=7, stratify=y)
        m = LogisticRegression(max_iter=2000, C=0.5)
        m.fit((Xtr - self.mean) / self.std, ytr)
        self.auc = float(roc_auc_score(yte, m.predict_proba((Xte - self.mean) / self.std)[:, 1]))
        m.fit((Xd - self.mean) / self.std, y)  # refit on all data
        self.model = m
        self.base_rate = float(y.mean())

    def _design(self, X: pd.DataFrame) -> np.ndarray:
        d = pd.get_dummies(X, columns=CATEGORICAL)
        return d.reindex(columns=self.columns, fill_value=0).astype(float).values

    @np.errstate(all="ignore")
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba((self._design(X) - self.mean) / self.std)[:, 1]

    @np.errstate(all="ignore")
    def explain(self, X: pd.DataFrame, top: int = 3) -> list[list[dict]]:
        z = (self._design(X) - self.mean) / self.std
        contrib = z * self.model.coef_[0]
        out = []
        for row in contrib:
            by_feat: dict[str, float] = {}
            for col, v in zip(self.columns, row):
                base = next((c for c in CATEGORICAL + NUMERIC if col == c or col.startswith(c + "_")), col)
                by_feat[base] = by_feat.get(base, 0) + v
            ranked = sorted(by_feat.items(), key=lambda kv: -abs(kv[1]))[:top]
            out.append([{"feature": FEATURE_LABELS.get(k, k), "effect": "up" if v > 0 else "down", "weight": round(float(v), 2)} for k, v in ranked])
        return out


@lru_cache
def model() -> PropensityModel:
    return PropensityModel()


def winback_score(propensity: float, reason: str | None) -> int:
    rec = RECOVERABILITY.get(reason or "", 0.6)
    # propensity is ~0-0.4; stretch to 0-100 with a soft log so ranking stays meaningful
    p = min(1.0, propensity / 0.35)
    return int(round(100 * (0.55 * math.sqrt(p) + 0.45 * rec)))


@lru_cache
def historical_inbox() -> pd.DataFrame:
    """Dropped historical leads ranked for win-back."""
    leads = get_dataset().leads
    X = _features(leads)
    leads = leads.assign(propensity=model().predict(X))
    dropped = leads[leads["outcome"] == "Dropped"].copy()
    dropped["score"] = [winback_score(p, r) for p, r in zip(dropped["propensity"], dropped["drop_reason"])]
    return dropped.sort_values("score", ascending=False)


def lead_row_features(profile: dict, source: str) -> pd.DataFrame:
    spend = profile.get("current_spend") or {"micro": 900, "prof": 2500, "multi": 8000, "mfg": 9000}.get(profile.get("segment") or "micro", 1500)
    band = {"micro": "40 lakh - 1.5 cr", "prof": "40 lakh - 1.5 cr", "multi": "5 - 25 cr", "mfg": "5 - 25 cr"}.get(profile.get("segment") or "micro")
    row = {
        "segment": SEGMENT_NAMES.get(profile.get("segment") or "micro"),
        "lead_source": source or "Website form",
        "city_tier": str(profile.get("city_tier") or 2),
        "has_gstin": "Y" if profile.get("gstin_status") in ("active", "cancelled", "suspended") else "N",
        "has_udyam": "Y" if profile.get("udyam_masked") else "N",
        "current_internet": profile.get("current_internet") or "Mobile hotspot",
        "annual_turnover_band": band,
        "employee_count": profile.get("employees") or 3,
        "num_sites": profile.get("sites") or 1,
        "monthly_telecom_spend_inr": spend,
        "products_of_interest": ";".join(profile.get("needs") or ["x"]),
    }
    return _features(pd.DataFrame([row]))


def score_live_lead(lead: dict) -> tuple[int, list[dict]]:
    X = lead_row_features(lead.get("profile") or {}, lead.get("source") or "Website form")
    p = float(model().predict(X)[0])
    return winback_score(p, lead.get("reason")), model().explain(X)[0]


def next_action(reason: str | None) -> dict:
    channel, text = NEXT_ACTION.get(reason or "", ("call", "Call to understand what's blocking them."))
    return {"channel": channel, "text": text}

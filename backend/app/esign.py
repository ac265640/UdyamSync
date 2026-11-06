"""Remote e-sign: when the authorised signatory isn't at the counter (53 drops last quarter),
the owner sends them a link. They review the order and sign with an Aadhaar OTP (mocked) on
their own phone; the owner's screen updates by itself. Only the signature reference is stored.
"""
from __future__ import annotations

import secrets

from . import store
from .privacy import mask_name, mask_phone


class EsignError(Exception):
    pass


def create(session_id: str, signatory_name: str, phone: str) -> dict:
    s = store.get("sessions", session_id)
    if s is None:
        raise EsignError("Session not found")
    token = secrets.token_urlsafe(12)
    s["esign"] = {"token": token, "status": "sent", "name": signatory_name[:80], "phone_masked": mask_phone(phone), "sent_at": store.now_iso()}
    store.put("sessions", s, ref=s.get("partner_id"))
    store.put("documents", {"id": f"esign_{token}", "kind": "esign", "session_id": session_id}, ref=session_id)
    store.audit("customer", "esign.link_sent", session_id, {"to": mask_phone(phone)})
    return {"token": token, "path": f"/sign/{token}", "status": "sent", "phone_masked": mask_phone(phone)}


def _session(token: str) -> dict:
    ref = store.get("documents", f"esign_{token}")
    s = store.get("sessions", ref["session_id"]) if ref else None
    if not s or (s.get("esign") or {}).get("token") != token:
        raise EsignError("This signing link is invalid or has expired.")
    return s


def view(token: str) -> dict:
    s = _session(token)
    p = s.get("profile") or {}
    cart = (s.get("cart") or {}).get("quote")
    rec = s.get("recommendation") or {}
    q = cart or (rec.get("tiers") or {}).get(s.get("selected_tier") or rec.get("default_tier") or "", {})
    return {
        "business": p.get("business_name") or p.get("business_type"), "city": p.get("city"),
        "signatory": mask_name(s["esign"]["name"]), "status": s["esign"]["status"],
        "monthly": q.get("monthly_total"), "setup": q.get("one_time_setup"), "term_months": q.get("term_months"),
        "lines": [f"{l['quantity']} × {l['name']}" if l["quantity"] > 1 else l["name"] for l in q.get("lines", [])],
    }


def sign(token: str, otp: str) -> dict:
    if not (otp.isdigit() and len(otp) == 6):
        raise EsignError("Enter the 6-digit OTP.")
    s = _session(token)
    s["esign"].update(status="signed", signed_at=store.now_iso(), certificate_ref=f"ESIGN-{secrets.token_hex(4).upper()}")
    store.put("sessions", s, ref=s.get("partner_id"))
    store.audit("signatory", "esign.signed", s["id"], {"ref": s["esign"]["certificate_ref"]})
    return {"status": "signed", "certificate_ref": s["esign"]["certificate_ref"]}


def status(session_id: str) -> dict:
    s = store.get("sessions", session_id) or {}
    e = s.get("esign") or {}
    return {"status": e.get("status", "none"), "name": mask_name(e.get("name")), "phone_masked": e.get("phone_masked"), "certificate_ref": e.get("certificate_ref")}

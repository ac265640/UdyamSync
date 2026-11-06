"""DPDP consent ledger: append-only, hash-chained, HMAC-sealed.

Every grant/withdrawal is a record whose hash covers the previous record's hash, so any edit
or deletion in the middle of the chain is detectable (verify_chain). Notices are versioned so
we can prove exactly which text the person agreed to.
"""
from __future__ import annotations

import hashlib
import hmac
import json

from .. import store
from ..config import get_settings

NOTICE_VERSION = "2026-11-v1"

PURPOSES = {
    "kyc_verification": {
        "required": True,
        "title": "Verify your business to activate service",
        "what": ["GSTIN and Udyam number", "GST & Udyam certificates", "Address proof (utility bill)", "Signatory name, role and ID validity (not Aadhaar number)"],
        "why": "Telecom licence rules (DoT) require us to verify a business before activating connections.",
        "retention": "Document images are deleted {days} days after verification. Extracted fields (masked) are kept for the life of the contract plus the period telecom audit rules require.",
        "shared_with": "Only Accel Business. Registry checks are look-ups; your documents are not sent to anyone else.",
    },
    "service_updates": {
        "required": False,
        "title": "Order and installation updates on WhatsApp / SMS",
        "what": ["Mobile number", "Order status"],
        "why": "So you don't have to call us to know where your order is.",
        "retention": "Until your order is live + 30 days.",
        "shared_with": "Our messaging provider, only to deliver the message.",
    },
    "partner_assist": {
        "required": False,
        "title": "Let your local Accel partner help you",
        "what": ["Business profile and quote (no documents)"],
        "why": "So a nearby partner can call if you get stuck.",
        "retention": "90 days or until you withdraw.",
        "shared_with": "The one partner assigned to your area.",
    },
    "marketing": {
        "required": False,
        "title": "Offers and new products",
        "what": ["Business type and city"],
        "why": "Occasional offers relevant to your business.",
        "retention": "Until you withdraw.",
        "shared_with": "Nobody outside Accel.",
    },
}


def notice(lang: str = "en") -> dict:
    days = get_settings().doc_retention_days
    return {
        "version": NOTICE_VERSION,
        "controller": "Accel Business (Data Fiduciary)",
        "grievance_officer": "dpo@accelbusiness.example · 1800-000-0000 · replies within 7 days",
        "rights": ["See what we hold", "Correct it", "Withdraw consent any time", "Ask us to erase it", "Nominate someone", "Complain to the Data Protection Board of India"],
        "purposes": {k: {**v, "retention": v["retention"].format(days=days)} for k, v in PURPOSES.items()},
    }


def _seal(payload: dict, prev: str) -> str:
    body = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hmac.new(get_settings().app_secret.encode(), (prev + body).encode(), hashlib.sha256).hexdigest()


def _chain(subject: str) -> list[dict]:
    return sorted(store.find("consents", ref=subject), key=lambda r: r["n"])


def record(subject: str, purpose: str, granted: bool, actor: str = "customer", channel: str = "web") -> dict:
    if purpose not in PURPOSES:
        raise ValueError(f"unknown purpose {purpose}")
    chain = _chain(subject)
    prev = chain[-1]["hash"] if chain else "GENESIS"
    payload = {
        "subject": subject, "n": len(chain) + 1, "purpose": purpose, "granted": granted,
        "notice_version": NOTICE_VERSION, "actor": actor, "channel": channel, "at": store.now_iso(),
    }
    rec = {**payload, "prev": prev, "hash": _seal(payload, prev)}
    store.put("consents", rec, ref=subject)
    store.audit(actor, "consent.grant" if granted else "consent.withdraw", subject, {"purpose": purpose})
    return rec


def state(subject: str) -> dict:
    current: dict[str, dict] = {}
    for r in _chain(subject):
        current[r["purpose"]] = {"granted": r["granted"], "at": r["at"], "notice_version": r["notice_version"]}
    return current


def has(subject: str, purpose: str) -> bool:
    return bool(state(subject).get(purpose, {}).get("granted"))


def verify_chain(subject: str) -> dict:
    prev = "GENESIS"
    for r in _chain(subject):
        payload = {k: r[k] for k in ("subject", "n", "purpose", "granted", "notice_version", "actor", "channel", "at")}
        if r["prev"] != prev or r["hash"] != _seal(payload, prev):
            return {"valid": False, "broken_at": r["n"]}
        prev = r["hash"]
    return {"valid": True, "records": len(_chain(subject)), "head": prev[:16]}


def receipt(subject: str) -> dict:
    chain = _chain(subject)
    return {"subject": subject, "records": [{k: r[k] for k in ("n", "purpose", "granted", "at", "notice_version", "hash")} for r in chain], "integrity": verify_chain(subject)}

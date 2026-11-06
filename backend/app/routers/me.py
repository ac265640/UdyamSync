"""DPDP data-principal rights: see, export, withdraw, erase ("My Data")."""
from fastapi import APIRouter, HTTPException

from .. import store
from ..kyc import consent, service

router = APIRouter(prefix="/api/me", tags=["my data"])


@router.get("/{session_id}")
def my_data(session_id: str) -> dict:
    s = store.get("sessions", session_id)
    if s is None:
        raise HTTPException(404, "Not found")
    case = store.get("documents", f"case_{session_id}")
    orders = [o for o in store.find("orders") if o.get("session_id") == session_id]
    return {
        "profile": s.get("profile"),
        "chat_messages": len(s.get("messages", [])),
        "documents": [{"type": k, "uploaded_at": d["uploaded_at"], "purge_after": d.get("purge_after"), "purged": d.get("purged", False)} for k, d in (case or {}).get("docs", {}).items()],
        "consents": consent.state(session_id),
        "consent_receipt": consent.receipt(session_id),
        "orders": [{"id": o["id"], "status": o["status"], "created": o["created"]} for o in orders],
        "shared_with_partner": consent.has(session_id, "partner_assist") or bool(s.get("partner_id")),
        "activity": [{"at": a["created"], "action": a["action"]} for a in store.find("audit", ref=session_id, limit=50)],
        "erased": bool(s.get("erased_at")),
    }


@router.post("/{session_id}/erase")
def erase(session_id: str) -> dict:
    return service.erase_subject(session_id)

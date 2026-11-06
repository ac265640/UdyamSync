"""Conversational advisor API (used by the web app, WhatsApp view and partner assisted mode)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..advisor import conversation, llm
from ..advisor.i18n import LANGUAGES, NEED_LABELS

router = APIRouter(prefix="/api/advisor", tags=["advisor"])


class StartIn(BaseModel):
    lang: str = "en"
    channel: str = Field("web", pattern="^(web|whatsapp|partner)$")
    partner_id: str | None = None
    source: str | None = None


class MessageIn(BaseModel):
    text: str = Field(..., max_length=1000)


class SelectIn(BaseModel):
    tier: str | None = None
    term_months: int | None = Field(None, ge=1, le=36)


class ProfileIn(BaseModel):
    employees: int | None = Field(None, ge=1, le=10000)
    sites: int | None = Field(None, ge=1, le=500)
    city: str | None = None
    business_type: str | None = None
    pincode: str | None = Field(None, pattern=r"^[1-9]\d{5}$")
    current_spend: int | None = Field(None, ge=0)
    needs: list[str] | None = None


@router.get("/meta")
def meta() -> dict:
    return {"languages": LANGUAGES, "needs": {k: v["en"] for k, v in NEED_LABELS.items()}, "llm": llm.stats()}


_EVAL_CACHE: dict = {}


@router.get("/eval")
def evaluate(refresh: bool = False) -> dict:
    """Run our advisor scenario suite (pass-rate badge in the UI)."""
    from ..advisor.scenarios import run_all

    if refresh or not _EVAL_CACHE:
        _EVAL_CACHE.clear()
        _EVAL_CACHE.update(run_all())
    return _EVAL_CACHE


@router.post("/sessions")
def start(body: StartIn) -> dict:
    return conversation.start(body.lang, body.channel, body.partner_id, body.source)


def _session_or_404(fn, *args):
    try:
        return fn(*args)
    except KeyError:
        raise HTTPException(404, "Session not found or expired")


@router.get("/sessions/{session_id}")
def resume(session_id: str) -> dict:
    s = conversation.get_session(session_id)
    if s is None:
        raise HTTPException(404, "Session not found or expired")
    return {**conversation._response(s, [], []), "messages": s["messages"]}


@router.post("/sessions/{session_id}/messages")
def message(session_id: str, body: MessageIn) -> dict:
    return _session_or_404(conversation.handle, session_id, body.text)


@router.post("/sessions/{session_id}/select")
def select(session_id: str, body: SelectIn) -> dict:
    return _session_or_404(conversation.select, session_id, body.tier, body.term_months)


@router.patch("/sessions/{session_id}/profile")
def profile(session_id: str, body: ProfileIn) -> dict:
    return _session_or_404(conversation.update_profile, session_id, body.model_dump(exclude_none=True))

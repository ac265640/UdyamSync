"""OneBill: price any bundle (add-on toggles call this on every change)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..advisor import conversation
from ..advisor.i18n import benefit, lang_or_default
from ..advisor.profile import Profile
from ..advisor.recommender import context_for
from ..quote import QuoteRequest, build_quote
from ..rules import ResolvedLine

router = APIRouter(prefix="/api/quote", tags=["quote"])


class LineIn(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1, le=500)


class QuoteIn(BaseModel):
    session_id: str
    lines: list[LineIn]
    term_months: int = 12


@router.post("")
def price(body: QuoteIn) -> dict:
    s = conversation.get_session(body.session_id)
    if s is None:
        raise HTTPException(404, "Session not found")
    p = Profile.from_dict(s["profile"])
    q = build_quote(QuoteRequest(
        lines=[ResolvedLine(l.product_id.upper(), l.quantity) for l in body.lines],
        ctx=context_for(p),
        term_months=body.term_months,
        current_monthly_spend=p.current_spend,
    ))
    lang = lang_or_default(s["lang"])
    for line in q["lines"]:
        line["why"] = benefit(line["product_id"], lang)
    s["cart"] = {"lines": [l.model_dump() for l in body.lines], "term_months": body.term_months, "quote": q}
    from .. import store

    store.put("sessions", s, ref=s.get("partner_id"))
    return q

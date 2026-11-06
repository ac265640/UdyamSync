"""Executive dashboard APIs."""
from fastapi import APIRouter
from pydantic import BaseModel

from .. import analytics
from ..advisor import llm

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class ReplayIn(BaseModel):
    recovery: dict[str, float] = {}
    chase_calls_new: float = 0.5
    field_cost_avoided_pct: float = 40.0
    platform_cost_per_lead: float = 40.0


@router.get("/baseline")
def baseline() -> dict:
    return analytics.baseline()


@router.post("/replay")
def replay(body: ReplayIn) -> dict:
    rec = {k: max(0.0, min(1.0, v)) for k, v in body.recovery.items()}
    return analytics.replay(rec, chase_calls_new=max(0.0, body.chase_calls_new), field_cost_avoided_pct=max(0.0, min(90.0, body.field_cost_avoided_pct)), platform_cost_per_lead=max(0.0, body.platform_cost_per_lead))


@router.get("/compliance")
def compliance() -> dict:
    return analytics.compliance()


@router.get("/segments")
def segments() -> list[dict]:
    return analytics.segments()


@router.get("/live")
def live() -> dict:
    return {**analytics.live(), "llm": llm.stats()}

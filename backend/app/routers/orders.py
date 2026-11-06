"""Orders + tracker + ops."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import orders

router = APIRouter(prefix="/api/orders", tags=["orders"])


class CreateIn(BaseModel):
    session_id: str
    simulate_payment_failure: bool = False
    esign: bool = True


class RescheduleIn(BaseModel):
    date: str
    slot: str


def _do(fn, *args, **kw):
    try:
        return fn(*args, **kw)
    except orders.OrderError as e:
        raise HTTPException(400, str(e))


@router.post("")
def create(body: CreateIn) -> dict:
    return _do(orders.create, body.session_id, payment_ok=not body.simulate_payment_failure, esign=body.esign)


@router.get("/ops/sla-alerts")
def sla_alerts() -> list[dict]:
    return orders.sla_alerts()


@router.get("/{order_id}")
def get(order_id: str) -> dict:
    return _do(orders.get, order_id)


@router.post("/{order_id}/retry-payment")
def retry(order_id: str) -> dict:
    return _do(orders.retry_payment, order_id)


@router.post("/{order_id}/advance")
def advance(order_id: str) -> dict:
    return _do(orders.advance, order_id)


@router.post("/{order_id}/reschedule")
def reschedule(order_id: str, body: RescheduleIn) -> dict:
    return _do(orders.reschedule, order_id, body.date, body.slot)

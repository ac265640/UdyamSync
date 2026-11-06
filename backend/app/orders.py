"""Orders + Accel Track: a 5-stage tracker the owner can check instead of calling support.

Stages: Order confirmed -> KYC verified -> Feasibility & port reserved -> Technician scheduled -> Live.
Each product has its own ETA (typical_install_days). Every stage change emits a WhatsApp/SMS
notification (simulated) — which is what removes the "3 chase calls per customer".
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from . import store
from .advisor.i18n import benefit
from .advisor.profile import Profile
from .advisor.recommender import context_for
from .data import get_dataset
from .kyc import consent
from .kyc import service as kyc_service
from .quote import QuoteRequest, build_quote
from .rules import ResolvedLine

STAGES = [
    ("confirmed", "Order confirmed"),
    ("kyc_verified", "KYC verified"),
    ("feasibility", "Feasibility checked & port reserved"),
    ("scheduled", "Technician scheduled"),
    ("live", "Service live"),
]
SLA_DAYS = 21
TECHNICIANS = [("Ravi Kumar", "4.8"), ("Sunita Yadav", "4.9"), ("Imran Shaikh", "4.7"), ("Priya Nair", "4.9"), ("Arjun Mehta", "4.6")]
SLOTS = ["09:00–11:00", "11:00–13:00", "14:00–16:00", "16:00–18:00"]


class OrderError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(d: datetime) -> str:
    return d.isoformat(timespec="minutes")


def _notify(order: dict, text: str, channel: str = "whatsapp") -> None:
    if channel == "whatsapp" and not consent.has(order["session_id"], "service_updates"):
        channel = "in_app"
    order.setdefault("notifications", []).append({"at": _iso(_now()), "channel": channel, "text": text})


def commission_for(monthly: int, setup: int, assisted: bool) -> int:
    """Illustrative partner commission policy (labelled as such in the UI):
    assisted sale = 1x first month + 10% of setup; digital close of a partner's lead = 0.5x first month."""
    return int(monthly * (1.0 if assisted else 0.5) + (0.1 * setup if assisted else 0))


def create(session_id: str, *, payment_ok: bool = True, esign: bool = True) -> dict:
    s = store.get("sessions", session_id)
    if s is None:
        raise OrderError("Session not found")
    if not consent.has(session_id, "kyc_verification"):
        raise OrderError("KYC consent is required before placing an order.")
    case = kyc_service.case_for(session_id)
    verdict = (case.get("result") or {}).get("verdict")
    if verdict not in ("verified", "verified_with_notes"):
        raise OrderError("KYC must be verified before the order can be placed.")
    if not esign:
        raise OrderError("The order form must be e-signed.")
    p = Profile.from_dict(s["profile"])
    if s.get("cart"):
        lines = [ResolvedLine(l["product_id"], l["quantity"]) for l in s["cart"]["lines"]]
        term = s["cart"]["term_months"]
    else:
        rec = s.get("recommendation") or {}
        q = rec["tiers"][s.get("selected_tier") or rec["default_tier"]]
        lines = [ResolvedLine(l["product_id"], l["quantity"]) for l in q["lines"]]
        term = rec["term_months"]
    # Re-price server-side and re-run the rules engine: a client can never sneak in an ineligible product.
    quote = build_quote(QuoteRequest(lines, context_for(p), term))
    if not quote["lines"]:
        raise OrderError("Nothing to order.")
    now = _now()
    tech, rating = random.Random(session_id).choice(TECHNICIANS)
    order = {
        "id": store.new_id("ord"),
        "session_id": session_id,
        "partner_id": s.get("partner_id"),
        "assisted": bool(s.get("partner_id")),
        "business": p.business_name or p.business_type,
        "city": p.city,
        "segment": p.segment,
        "lang": s["lang"],
        "quote": quote,
        "status": "payment_failed" if not payment_ok else "confirmed",
        "payment": {"method": "UPI AutoPay", "status": "failed" if not payment_ok else "mandate_active", "attempts": 1},
        "stages": [],
        "products": [],
        "technician": {"name": tech, "rating": rating, "phone_masked": "••••••" + str(random.Random(tech).randint(1000, 9999))},
        "chase_calls": 0,
    }
    order["stages"] = [{"key": k, "label": l, "status": "pending", "at": None, "eta": None} for k, l in STAGES]
    for line in quote["lines"]:
        order["products"].append({
            "product_id": line["product_id"], "name": line["name"], "quantity": line["quantity"],
            "eta": _iso(now + timedelta(days=line["install_days"])), "status": "pending",
            "why": benefit(line["product_id"], "en"),
        })
    live_eta = now + timedelta(days=quote["full_activation_days"])
    sched = now + timedelta(days=max(1, quote["full_activation_days"] - 1))
    order["stages"][0].update(status="done", at=_iso(now))
    order["stages"][1].update(status="done" if payment_ok else "pending", at=_iso(now) if payment_ok else None)
    order["stages"][2].update(eta=_iso(now + timedelta(days=1)), status="active" if payment_ok else "pending")
    order["stages"][3].update(eta=_iso(sched), slot=SLOTS[1])
    order["stages"][4].update(eta=_iso(live_eta))
    order["eta_live"] = _iso(live_eta)
    order["sla_due"] = _iso(now + timedelta(days=SLA_DAYS))
    if payment_ok:
        _notify(order, f"✅ Order {order['id']} confirmed: {len(quote['lines'])} services, ₹{quote['monthly_total']:,}/month + GST. Everything will be live by {live_eta:%d %b}. Track anytime — no need to call.")
    else:
        _notify(order, "⚠️ Your UPI AutoPay setup didn't go through. Tap the link to retry — your order and price are saved.")
    if order["assisted"] or (s.get("lead_id") and (store.get("leads", s["lead_id"]) or {}).get("partner_id")):
        order["commission_illustrative"] = commission_for(quote["monthly_total"], quote["one_time_setup"], order["assisted"])
    store.put("orders", order, ref=s.get("partner_id"))
    s["stage"] = "ordered"
    s["order_id"] = order["id"]
    store.put("sessions", s, ref=s.get("partner_id"))
    if s.get("lead_id"):
        lead = store.get("leads", s["lead_id"])
        if lead:
            lead["status"] = "won"
            lead.setdefault("events", []).append({"at": store.now_iso(), "event": "Order placed"})
            store.put("leads", lead, ref=lead.get("partner_id"))
    store.audit("customer", "order.create", order["id"], {"monthly": quote["monthly_total"], "payment": order["payment"]["status"]})
    return public(order)


def retry_payment(order_id: str) -> dict:
    o = _get(order_id)
    if o["payment"]["status"] != "failed":
        return public(o)
    o["payment"].update(status="mandate_active", attempts=o["payment"]["attempts"] + 1)
    o["status"] = "confirmed"
    now = _now()
    o["stages"][1].update(status="done", at=_iso(now))
    o["stages"][2].update(status="active")
    _notify(o, f"✅ Payment set up. Order {o['id']} is confirmed — live by {o['eta_live'][:10]}.")
    store.put("orders", o, ref=o.get("partner_id"))
    return public(o)


def _get(order_id: str) -> dict:
    o = store.get("orders", order_id)
    if o is None:
        raise OrderError("Order not found")
    return o


def advance(order_id: str) -> dict:
    """Ops/demo: move the order to its next stage (in production, field-ops systems call this)."""
    o = _get(order_id)
    if o["payment"]["status"] == "failed":
        raise OrderError("Payment pending")
    now = _now()
    idx = next((i for i, st in enumerate(o["stages"]) if st["status"] != "done"), None)
    if idx is None:
        return public(o)
    st = o["stages"][idx]
    st.update(status="done", at=_iso(now))
    if idx + 1 < len(o["stages"]):
        o["stages"][idx + 1]["status"] = "active"
    msgs = {
        "kyc_verified": "✅ Your documents are verified.",
        "feasibility": "📡 Good news — your site is ready and a port is reserved for you.",
        "scheduled": f"👷 {o['technician']['name']} (★{o['technician']['rating']}) will visit on {o['stages'][3]['eta'][:10]}, {o['stages'][3].get('slot', SLOTS[1])}. Reschedule anytime from the tracker.",
        "live": "🎉 You're live! One bill, one support number: 1800-000-0000.",
    }
    if st["key"] == "scheduled":
        for p in o["products"]:
            if p["status"] == "pending":
                p["status"] = "installing"
    if st["key"] == "live":
        for p in o["products"]:
            p["status"] = "live"
        o["status"] = "live"
    else:
        o["status"] = st["key"]
    _notify(o, msgs.get(st["key"], f"Update: {st['label']}"))
    store.put("orders", o, ref=o.get("partner_id"))
    store.audit("ops", "order.advance", o["id"], {"stage": st["key"]})
    return public(o)


def reschedule(order_id: str, date_iso: str, slot: str) -> dict:
    o = _get(order_id)
    if slot not in SLOTS:
        raise OrderError("Unknown slot")
    st = o["stages"][3]
    if st["status"] == "done":
        raise OrderError("Technician visit already completed")
    st.update(eta=date_iso + "T" + slot[:5], slot=slot)
    _notify(o, f"🔁 Visit moved to {date_iso}, {slot}. {o['technician']['name']} has been informed.")
    store.put("orders", o, ref=o.get("partner_id"))
    return public(o)


def log_chase_call(order_id: str) -> dict:
    o = _get(order_id)
    o["chase_calls"] = o.get("chase_calls", 0) + 1
    store.put("orders", o, ref=o.get("partner_id"))
    return public(o)


def public(o: dict) -> dict:
    now = _now()
    out = {k: v for k, v in o.items() if k not in ("session_id",)}
    open_stage = next((s for s in o["stages"] if s["status"] != "done"), None)
    out["current_stage"] = open_stage["key"] if open_stage else "live"
    out["progress"] = sum(1 for s in o["stages"] if s["status"] == "done") / len(o["stages"])
    out["sla_breach_risk"] = o["status"] != "live" and o["eta_live"] > o["sla_due"]
    out["days_left"] = max(0, (datetime.fromisoformat(o["eta_live"]) - now).days) if o["status"] != "live" else 0
    out["slots"] = SLOTS
    return out


def get(order_id: str) -> dict:
    return public(_get(order_id))


def sla_alerts() -> list[dict]:
    """Ops early warning: orders whose ETA is past the 21-day SLA, or a stage is overdue."""
    now = _iso(_now())
    out = []
    for o in store.find("orders"):
        if o["status"] == "live":
            continue
        overdue = [s for s in o["stages"] if s["status"] != "done" and s.get("eta") and s["eta"] < now]
        if o["eta_live"] > o["sla_due"] or overdue:
            out.append({"order_id": o["id"], "business": o.get("business"), "city": o.get("city"),
                        "reason": "ETA beyond 21-day SLA" if o["eta_live"] > o["sla_due"] else f"Stage overdue: {overdue[0]['label']}",
                        "eta_live": o["eta_live"], "sla_due": o["sla_due"]})
    return out


def products_index() -> dict:
    return {p.id: p.name for p in get_dataset().products.values()}

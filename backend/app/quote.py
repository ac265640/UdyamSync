"""Accel OneBill: one transparent monthly price for a bundle.

Pricing policy (explainable, from the catalogue's price range):
  * 24-month contract  -> bottom of the price range  (best price)
  * 12-month contract  -> middle of the range
  * shorter / monthly  -> top of the range
  A product is never priced on a term shorter than its own min_contract_months.
  24-month contracts also get 50% off one-time setup fees.
Prices are shown excluding 18% GST, with the GST line shown separately.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta

from .config import get_settings
from .data import Product, get_dataset
from .rules import BusinessContext, ResolvedLine, resolve_bundle

GST_RATE = 0.18
TERMS = (6, 12, 24)


def _nice(x: float) -> int:
    """Round to a retail-looking price (…49 / …99 style)."""
    if x < 100:
        return int(round(x))
    if x < 1000:
        return int(math.floor(x / 10) * 10 + 9) if x % 10 else int(x - 1)
    return int(round(x / 50) * 50 - 1)


def unit_price(p: Product, term_months: int) -> int:
    term = max(term_months, p.min_contract_months)
    if term >= 24:
        return p.price_min
    if term >= 12:
        return min(p.price_max, max(p.price_min, _nice((p.price_min + p.price_max) / 2)))
    return p.price_max


@dataclass
class QuoteRequest:
    lines: list[ResolvedLine]
    ctx: BusinessContext
    term_months: int = 12
    current_monthly_spend: int | None = None
    current_vendor_count: int | None = None
    setup_waiver_pct: int = 0  # partner lever (e.g. "waive setup fee" win-back offer)


def build_quote(req: QuoteRequest) -> dict:
    ds = get_dataset()
    res = resolve_bundle(req.lines, req.ctx)
    term = req.term_months if req.term_months in TERMS else 12
    today = get_settings().reference_date
    lines_out = []
    monthly = setup = 0
    for l in res.lines:
        p = ds.products[l.product_id]
        price = unit_price(p, term)
        line_setup = p.setup_fee * l.quantity
        waiver = 50 if term >= 24 else 0
        waiver = max(waiver, req.setup_waiver_pct)
        line_setup_after = int(line_setup * (100 - waiver) / 100)
        monthly += price * l.quantity
        setup += line_setup_after
        lines_out.append({
            "product_id": p.id,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "unit": p.unit,
            "quantity": l.quantity,
            "unit_price": price,
            "monthly": price * l.quantity,
            "setup_fee": line_setup,
            "setup_fee_after_waiver": line_setup_after,
            "contract_months": max(term, p.min_contract_months),
            "install_days": p.install_days,
            "eta": (today + timedelta(days=p.install_days)).isoformat(),
            "added_by": l.added_by,
            "note": l.note,
            "requires_gstin": p.requires_gstin,
        })
    # List price at monthly/no-commitment for the "you save by committing" line.
    list_monthly = sum(ds.products[l["product_id"]].price_max * l["quantity"] for l in lines_out)
    connectivity = sum(l["monthly"] for l in lines_out if l["category"] == "Connectivity")
    gst = round(monthly * GST_RATE)
    install_days = max((l["install_days"] for l in lines_out), default=0)
    out = {
        "term_months": term,
        "lines": lines_out,
        "blocked": res.blocked,
        "auto_added": res.auto_added,
        "monthly_total": monthly,
        "monthly_gst": gst,
        "monthly_total_incl_gst": monthly + gst,
        "one_time_setup": setup,
        "list_monthly_total": list_monthly,
        "commitment_saving_per_month": max(0, list_monthly - monthly),
        "connectivity_monthly": connectivity,
        "full_activation_days": install_days,
        "activation_eta": (today + timedelta(days=install_days)).isoformat() if lines_out else None,
        "products_count": len(lines_out),
        "price_valid_until": (today + timedelta(days=7)).isoformat(),
        "terms_available": [t for t in TERMS],
    }
    if req.current_monthly_spend:
        out["current_monthly_spend"] = req.current_monthly_spend
        out["current_vendor_count"] = req.current_vendor_count or 1
        out["connectivity_vs_current"] = req.current_monthly_spend - connectivity
    return out

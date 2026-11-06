"""Deterministic catalogue rules engine.

The AI never decides eligibility, dependencies or price — this module does, straight from
product_catalogue.csv. Every decision carries a machine reason code and a plain-language reason.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .data import Product, get_dataset


@dataclass
class BusinessContext:
    """The facts eligibility depends on."""

    city_tier: int = 2
    employees: int = 1
    sites: int = 1
    gstin_status: str = "none"  # "active" | "cancelled" | "suspended" | "none" | "unverified"
    fibre_feasible: bool = True

    @property
    def has_active_gstin(self) -> bool:
        return self.gstin_status == "active"


@dataclass
class Eligibility:
    product_id: str
    eligible: bool
    reasons: list[dict] = field(default_factory=list)  # [{code, message}]

    def to_dict(self) -> dict:
        return {"product_id": self.product_id, "eligible": self.eligible, "reasons": self.reasons}


def check_eligibility(p: Product, ctx: BusinessContext) -> Eligibility:
    reasons: list[dict] = []
    if ctx.city_tier not in p.city_tiers:
        reasons.append({"code": "CITY_TIER", "message": f"{p.name} is only sold in tier {'/'.join(map(str, sorted(p.city_tiers)))} cities."})
    if ctx.employees < p.min_employees:
        reasons.append({"code": "MIN_EMPLOYEES", "message": f"{p.name} needs at least {p.min_employees} employees."})
    if ctx.sites < p.min_sites:
        reasons.append({"code": "MIN_SITES", "message": f"{p.name} needs at least {p.min_sites} sites."})
    if p.requires_gstin and not ctx.has_active_gstin:
        why = {
            "cancelled": "your GSTIN is cancelled",
            "suspended": "your GSTIN is suspended",
            "unverified": "your GSTIN is not verified yet",
        }.get(ctx.gstin_status, "you don't have a GSTIN")
        reasons.append({"code": "GSTIN_REQUIRED", "message": f"{p.name} needs an active GSTIN, and {why}."})
    if p.id in FIBRE_PRODUCTS and not ctx.fibre_feasible:
        reasons.append({"code": "FIBRE_NOT_FEASIBLE", "message": f"Fibre is not available at your site, so {p.name} can't be installed. 5G AirFiber can."})
    return Eligibility(p.id, not reasons, reasons)


FIBRE_PRODUCTS = {"P01", "P02", "P03"}
# Products that satisfy a "requires_one_of" connectivity dependency, cheapest-first fallbacks.
CONNECTIVITY_FALLBACK = ["P01", "P04", "P02", "P03", "P05", "P06"]


@dataclass
class ResolvedLine:
    product_id: str
    quantity: int
    added_by: str = "user"  # "user" | "advisor" | "dependency"
    note: str = ""


@dataclass
class Resolution:
    lines: list[ResolvedLine]
    blocked: list[dict]  # [{product_id, name, reasons}]
    auto_added: list[dict]  # [{product_id, name, because_of}]


def resolve_bundle(requested: list[ResolvedLine], ctx: BusinessContext) -> Resolution:
    """Drop ineligible products (with reasons) and pull in required dependencies.

    Dependency rule: a product with requires_one_of needs at least one of those products in the
    same bundle. If none is present we add the cheapest eligible option.
    """
    ds = get_dataset()
    lines: list[ResolvedLine] = []
    blocked: list[dict] = []
    for line in requested:
        p = ds.products.get(line.product_id)
        if p is None:
            blocked.append({"product_id": line.product_id, "name": line.product_id, "reasons": [{"code": "UNKNOWN", "message": "Not in the catalogue."}]})
            continue
        e = check_eligibility(p, ctx)
        if e.eligible:
            lines.append(line)
        else:
            blocked.append({"product_id": p.id, "name": p.name, "reasons": e.reasons})

    auto_added: list[dict] = []
    changed = True
    while changed:  # iterate until the bundle is dependency-closed
        changed = False
        present = {l.product_id for l in lines}
        for line in list(lines):
            p = ds.products[line.product_id]
            if not p.requires_one_of or present & set(p.requires_one_of):
                continue
            options = [pid for pid in CONNECTIVITY_FALLBACK if pid in p.requires_one_of] + [
                pid for pid in p.requires_one_of if pid not in CONNECTIVITY_FALLBACK
            ]
            pick = next((pid for pid in options if check_eligibility(ds.products[pid], ctx).eligible), None)
            if pick is None:
                lines.remove(line)
                blocked.append({
                    "product_id": p.id,
                    "name": p.name,
                    "reasons": [{"code": "DEPENDENCY_UNMET", "message": f"{p.name} needs one of {', '.join(ds.products[x].name for x in p.requires_one_of)}, and none is available to you."}],
                })
            else:
                dep = ds.products[pick]
                qty = ctx.sites if dep.unit == "per site" else 1
                lines.append(ResolvedLine(pick, qty, "dependency", f"Needed for {p.name}"))
                auto_added.append({"product_id": pick, "name": dep.name, "because_of": p.name})
            changed = True
            break
    return Resolution(lines, blocked, auto_added)


def violations_for_bundle(product_ids: list[str], ctx: BusinessContext) -> list[dict]:
    """Every rule a (historical) bundle breaks. Used by the compliance report."""
    ds = get_dataset()
    out: list[dict] = []
    present = set(product_ids)
    for pid in product_ids:
        p = ds.products[pid]
        for r in check_eligibility(p, ctx).reasons:
            out.append({"product_id": pid, **r})
        if p.requires_one_of and not present & set(p.requires_one_of):
            out.append({"product_id": pid, "code": "DEPENDENCY_UNMET", "message": f"{p.name} sold without a required connectivity product."})
    return out

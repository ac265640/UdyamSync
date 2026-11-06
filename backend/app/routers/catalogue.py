from fastapi import APIRouter, HTTPException

from ..data import get_dataset
from ..rules import BusinessContext, check_eligibility

router = APIRouter(prefix="/api/catalogue", tags=["catalogue"])


@router.get("")
def list_products() -> list[dict]:
    return [p.to_dict() for p in get_dataset().products.values()]


@router.get("/cities")
def list_cities() -> list[dict]:
    ds = get_dataset()
    return [{"city": c, "tier": t, "state": ds.city_state[c]} for c, t in sorted(ds.city_tier.items())]


@router.get("/{product_id}/eligibility")
def eligibility(product_id: str, city_tier: int = 2, employees: int = 1, sites: int = 1, gstin_status: str = "none") -> dict:
    p = get_dataset().products.get(product_id.upper())
    if p is None:
        raise HTTPException(404, "Unknown product")
    ctx = BusinessContext(city_tier=city_tier, employees=employees, sites=sites, gstin_status=gstin_status)
    return check_eligibility(p, ctx).to_dict()

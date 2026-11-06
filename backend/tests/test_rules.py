from app.rules import BusinessContext, ResolvedLine, check_eligibility, resolve_bundle
from app.data import get_dataset


def P(pid):
    return get_dataset().products[pid]


def test_gstin_required_product_blocked_without_active_gstin():
    for status in ("none", "cancelled", "suspended"):
        e = check_eligibility(P("P15"), BusinessContext(gstin_status=status))
        assert not e.eligible and e.reasons[0]["code"] == "GSTIN_REQUIRED"
    assert check_eligibility(P("P15"), BusinessContext(gstin_status="active")).eligible


def test_tier_and_size_limits():
    assert not check_eligibility(P("P03"), BusinessContext(city_tier=2, employees=10, gstin_status="active")).eligible
    assert not check_eligibility(P("P10"), BusinessContext(city_tier=1, employees=20, sites=2, gstin_status="active")).eligible
    assert check_eligibility(P("P10"), BusinessContext(city_tier=1, employees=20, sites=3, gstin_status="active")).eligible


def test_cctv_pulls_in_connectivity():
    res = resolve_bundle([ResolvedLine("P23", 2)], BusinessContext())
    ids = {l.product_id for l in res.lines}
    assert "P23" in ids and "P01" in ids
    assert res.auto_added[0]["because_of"] == "Cloud CCTV"


def test_no_fibre_falls_back_to_airfiber():
    res = resolve_bundle([ResolvedLine("P23", 1)], BusinessContext(fibre_feasible=False))
    assert {l.product_id for l in res.lines} == {"P23", "P04"}


def test_sdwan_dependency_respected():
    ctx = BusinessContext(city_tier=1, employees=30, sites=4, gstin_status="active")
    res = resolve_bundle([ResolvedLine("P10", 4)], ctx)
    assert any(l.product_id in {"P01", "P02", "P03", "P05", "P06"} for l in res.lines)

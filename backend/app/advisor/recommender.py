"""Bundle recommender: profile -> Essential / Recommended / Pro bundles.

Deterministic and explainable. Each line carries reason codes ("need:cctv", "segment:prof",
"size:sites", ...) that the explanation layer turns into plain language. Eligibility and
dependencies are enforced afterwards by rules.resolve_bundle, so a recommendation can never
contain a product the business can't legally buy.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..quote import QuoteRequest, build_quote
from ..rules import BusinessContext, ResolvedLine
from .profile import Profile

RETAIL_COUNTER_TYPES = {
    "Kirana store", "Pharmacy", "Bakery", "Sweet shop", "Restaurant", "Hardware store", "Stationery shop",
    "Optician", "Boutique", "Retail shop", "Mobile repair shop", "Pharmacy chain", "Bakery chain",
    "Restaurant chain", "Apparel retail chain", "Electronics retail chain", "Retail chain",
}
WAITING_AREA_TYPES = {"Salon", "Restaurant", "Restaurant chain", "Budget hotel group", "Gym chain", "Dental clinic", "Clinic", "Physiotherapy clinic", "Diagnostic lab", "Bakery chain", "Salon chain"}
RECORDS_TYPES = {"Dental clinic", "Clinic", "Diagnostic lab", "Physiotherapy clinic", "CA firm", "Law office", "Insurance agency", "Architecture studio"}
REMINDER_TYPES = {"Dental clinic", "Clinic", "Diagnostic lab", "Physiotherapy clinic", "Coaching centre", "Pre-school chain", "Gym chain"}


@dataclass
class Pick:
    product_id: str
    quantity: int
    reasons: list[str] = field(default_factory=list)


def _clamp(x: float, lo: int, hi: int) -> int:
    return int(max(lo, min(hi, x)))


def context_for(profile: Profile) -> BusinessContext:
    return BusinessContext(
        city_tier=profile.city_tier or 2,
        employees=profile.employees or 1,
        sites=profile.sites or 1,
        gstin_status=profile.gstin_status,
        fibre_feasible=profile.fibre_feasible,
    )


def _connectivity(profile: Profile, tier: str, ctx: BusinessContext) -> Pick:
    seg, emp, sites = profile.segment, ctx.employees, ctx.sites
    needs = set(profile.needs)
    if not ctx.fibre_feasible:
        return Pick("P04", sites, ["feasibility:no_fibre"])
    if seg == "mfg":
        if tier == "pro" and emp >= 25 and ctx.has_active_gstin:
            return Pick("P06", 1, ["segment:mfg", "size:employees"])
        if tier != "essential" and emp >= 10 and ctx.has_active_gstin:
            return Pick("P05", 1, ["segment:mfg", "size:employees"])
        return Pick("P02", 1, ["segment:mfg"])
    if seg == "prof":
        if tier == "pro" and emp >= 5 and ctx.city_tier == 1 and ctx.has_active_gstin:
            return Pick("P03", sites, ["segment:prof", "need:fast_internet"])
        if emp >= 5 or "fast_internet" in needs:
            return Pick("P02" if tier != "essential" or emp >= 10 else "P01", sites, ["segment:prof"])
        return Pick("P01", sites, ["segment:prof"])
    if seg == "multi":
        return Pick("P01" if tier == "essential" else "P02", sites, ["segment:multi", "size:sites"])
    # micro
    if "fast_internet" in needs or emp >= 8:
        return Pick("P02", sites, ["segment:micro"])
    return Pick("P01", sites, ["segment:micro", "need:payments"])


def _picks(profile: Profile, tier: str) -> list[Pick]:
    ctx = context_for(profile)
    seg, emp, sites = profile.segment or "micro", ctx.employees, ctx.sites
    btype = profile.business_type or ""
    needs = set(profile.needs)
    rec, pro = tier in ("recommended", "pro"), tier == "pro"
    picks: list[Pick] = [_connectivity(profile, tier, ctx)]
    # Branch-by-branch feasibility: fibre where it reaches, 5G AirFiber where it doesn't, one bill.
    no_fibre = sum(1 for st in profile.site_list if not st.get("fibre", True))
    if profile.site_list and 0 < no_fibre < len(profile.site_list) and picks[0].product_id in ("P01", "P02", "P03"):
        picks[0].quantity = len(profile.site_list) - no_fibre
        picks.append(Pick("P04", no_fibre, ["feasibility:no_fibre"]))

    # Mobile lines
    if seg == "micro":
        picks.append(Pick("P07", 1 if emp <= 2 else 2, ["segment:micro", "need:mobile"]))
    elif seg == "prof":
        picks.append(Pick("P08" if rec else "P07", _clamp(math.ceil(emp / 4), 1, 10), ["segment:prof", "need:mobile"]))
    elif seg == "multi":
        picks.append(Pick("P08", sites, ["segment:multi", "size:sites"]))
    else:
        picks.append(Pick("P08", _clamp(math.ceil(emp / 10), 1, 10), ["segment:mfg"]))

    users = _clamp(emp if seg == "prof" else math.ceil(emp / 3), 1, 50)
    # Productivity + security
    if seg in ("prof", "mfg") or "cloud_email" in needs:
        picks.append(Pick("P16", users, ["need:cloud_email"] if "cloud_email" in needs else [f"segment:{seg}"]))
    if (seg in ("prof", "mfg") and rec) or "security" in needs:
        picks.append(Pick("P20", users, ["need:security"] if "security" in needs else [f"segment:{seg}"]))
    if "backup" in needs or (rec and btype in RECORDS_TYPES) or (pro and seg == "mfg"):
        picks.append(Pick("P17", 1, ["need:backup"] if "backup" in needs else ["type:records"]))

    # Payments / billing
    if "payments" in needs or (btype in RETAIL_COUNTER_TYPES and (rec or seg == "micro")):
        picks.append(Pick("P19", sites if seg == "multi" else 1, ["need:payments"]))

    # Customer reach
    if "whatsapp" in needs or (rec and seg in ("micro", "multi") and btype in RETAIL_COUNTER_TYPES):
        picks.append(Pick("P15", 1, ["need:whatsapp"]))
    if "sms" in needs or (pro and btype in REMINDER_TYPES):
        picks.append(Pick("P14", 1, ["need:sms"] if "sms" in needs else ["type:reminders"]))
    if "website" in needs or (pro and seg in ("micro", "prof")):
        picks.append(Pick("P18", 1, ["need:website"] if "website" in needs else ["tier:pro"]))
    if "telephony" in needs or (pro and seg == "prof" and emp >= 10):
        picks.append(Pick("P12", _clamp(math.ceil(emp / 10), 2, 10), ["need:telephony"]))
    if "tollfree" in needs or (pro and seg == "multi" and sites >= 3):
        picks.append(Pick("P13", 1, ["need:tollfree"]))

    # Physical / IoT
    if "cctv" in needs or (pro and seg in ("micro", "multi", "mfg")):
        per_site = 2 if seg in ("micro", "prof") else 4
        picks.append(Pick("P23", per_site * sites, ["need:cctv"] if "cctv" in needs else ["tier:pro"]))
        if seg in ("prof", "mfg") and rec and picks[0].product_id in ("P01", "P02", "P03"):
            picks.append(Pick("P11", 1, ["type:remote_view"]))  # leased lines already include static IPs
    elif "remote_access" in needs and picks[0].product_id in ("P01", "P02", "P03"):
        picks.append(Pick("P11", 1, ["need:remote_access"]))
    if "machines" in needs or (pro and seg == "mfg"):
        picks.append(Pick("P24", _clamp(math.ceil(emp / 5), 2, 20), ["need:machines"]))
    if "fleet" in needs:
        picks.append(Pick("P25", 3, ["need:fleet"]))

    # Resilience
    if "failover" in needs or (rec and seg == "multi") or (pro and seg in ("prof", "micro")):
        picks.append(Pick("P09", sites, ["need:failover"] if "failover" in needs else ["tier:resilience"]))
    if "guest_wifi" in needs or (pro and btype in WAITING_AREA_TYPES):
        picks.append(Pick("P22", sites, ["need:guest_wifi"] if "guest_wifi" in needs else ["type:waiting_area"]))
    if seg == "multi" and sites >= 3 and ("central_mgmt" in needs or pro):
        picks.append(Pick("P10", sites, ["need:central_mgmt"]))
    if pro and seg in ("mfg", "multi", "prof") and emp >= 10:
        picks.append(Pick("P21", 1 if seg != "multi" else sites, ["tier:security"]))

    if tier == "essential":  # keep it lean: connectivity, mobile, and the top 2 stated needs
        core = picks[:2]
        stated = [p for p in picks[2:] if any(r.startswith("need:") for r in p.reasons)]
        picks = core + stated[:2]

    merged: dict[str, Pick] = {}
    for p in picks:
        if p.product_id in merged:
            merged[p.product_id].quantity = max(merged[p.product_id].quantity, p.quantity)
            merged[p.product_id].reasons = list(dict.fromkeys(merged[p.product_id].reasons + p.reasons))
        else:
            merged[p.product_id] = p
    return list(merged.values())


def default_term(profile: Profile) -> int:
    return 24 if profile.segment in ("mfg", "multi") else 12


def recommend(profile: Profile, term_months: int | None = None) -> dict:
    ctx = context_for(profile)
    term = term_months or default_term(profile)
    tiers = {}
    for tier in ("essential", "recommended", "pro"):
        picks = _picks(profile, tier)
        quote = build_quote(QuoteRequest(
            lines=[ResolvedLine(p.product_id, p.quantity, "advisor") for p in picks],
            ctx=ctx,
            term_months=term,
            current_monthly_spend=profile.current_spend,
            current_vendor_count=profile.current_vendor_count,
        ))
        reasons = {p.product_id: p.reasons for p in picks}
        for line in quote["lines"]:
            line["reasons"] = reasons.get(line["product_id"], ["dependency"])
        tiers[tier] = quote
    # If two tiers came out identical (small businesses), keep the distinct ones only.
    seen, ordered = set(), {}
    for name, q in tiers.items():
        sig = tuple(sorted((l["product_id"], l["quantity"]) for l in q["lines"]))
        if sig not in seen:
            seen.add(sig)
            ordered[name] = q
    return {"default_tier": "recommended" if "recommended" in ordered else next(iter(ordered)), "tiers": ordered, "term_months": term}

"""Mock government registry lookups (backed by the case CSVs)."""
from fastapi import APIRouter

from ..registry import find_udyam_by_name, lookup_gstin, lookup_udyam

router = APIRouter(prefix="/api/registry", tags=["registry"])


@router.get("/gstin/{gstin}")
def gstin(gstin: str) -> dict:
    result = lookup_gstin(gstin)
    if result.get("found"):
        udyam = find_udyam_by_name(result["legal_name"]) or find_udyam_by_name(result["trade_name"])
        result["linked_udyam_found"] = bool(udyam)
    return result


@router.get("/udyam/{number}")
def udyam(number: str) -> dict:
    return lookup_udyam(number)

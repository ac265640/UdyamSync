"""Mock GSTIN and Udyam registries with real format/checksum validation.

GSTIN structure (15 chars): 2-digit state code + 10-char PAN + entity number + 'Z' + checksum.
The case data always has 'X' as the PAN's 4th character (not a real entity type) — we accept it.
Udyam numbers use district code '00' (fictional) — we accept it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .data import get_dataset
from .privacy import mask_gstin, mask_udyam

_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
# 4th PAN char = entity type. Real codes + 'X' used by the synthetic data.
_PAN_ENTITY = "PCHFATBLJGEX"
_GSTIN_RE = re.compile(rf"^(\d{{2}})([A-Z]{{3}}[{_PAN_ENTITY}][A-Z]\d{{4}}[A-Z])([1-9A-Z])Z([0-9A-Z])$")
_UDYAM_RE = re.compile(r"^UDYAM-([A-Z]{2})-(\d{2})-(\d{7})$")

GST_STATE_CODES = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
}
UDYAM_STATE_CODES = {
    "AP": "Andhra Pradesh", "BR": "Bihar", "DL": "Delhi", "GJ": "Gujarat", "KA": "Karnataka", "KR": "Karnataka",
    "KL": "Kerala", "MH": "Maharashtra", "MP": "Madhya Pradesh", "PB": "Punjab", "RJ": "Rajasthan",
    "TN": "Tamil Nadu", "TS": "Telangana", "UP": "Uttar Pradesh", "WB": "West Bengal",
}


def gstin_checksum(first14: str) -> str:
    total = 0
    for i, ch in enumerate(first14):
        product = _CHARS.index(ch) * (1 if i % 2 == 0 else 2)
        total += product // 36 + product % 36
    return _CHARS[(36 - total % 36) % 36]


@dataclass
class FormatCheck:
    valid: bool
    reason: str = ""


def validate_gstin_format(gstin: str) -> FormatCheck:
    g = (gstin or "").strip().upper()
    if len(g) != 15:
        return FormatCheck(False, f"GSTIN must be 15 characters (got {len(g)}).")
    m = _GSTIN_RE.match(g)
    if not m:
        return FormatCheck(False, "GSTIN pattern is wrong: expected 2-digit state, 10-character PAN, entity number, 'Z', checksum.")
    if m.group(1) not in GST_STATE_CODES:
        return FormatCheck(False, f"'{m.group(1)}' is not a valid GST state code.")
    if gstin_checksum(g[:14]) != g[14]:
        return FormatCheck(False, "Checksum digit does not match — likely a typo.")
    return FormatCheck(True)


def validate_udyam_format(num: str) -> FormatCheck:
    u = (num or "").strip().upper()
    m = _UDYAM_RE.match(u)
    if not m:
        return FormatCheck(False, "Udyam number must look like UDYAM-XX-00-0000000.")
    if m.group(1) not in UDYAM_STATE_CODES:
        return FormatCheck(False, f"'{m.group(1)}' is not a known state code.")
    return FormatCheck(True)


def lookup_gstin(gstin: str, *, reveal: bool = False) -> dict:
    g = (gstin or "").strip().upper()
    fmt = validate_gstin_format(g)
    result: dict = {"query": g if reveal else mask_gstin(g), "format_valid": fmt.valid, "format_reason": fmt.reason, "found": False}
    if not fmt.valid:
        return result
    ds = get_dataset()
    if g not in ds.gstin.index:
        result["reason"] = "Not found in the GST registry."
        return result
    r = ds.gstin.loc[g]
    status = r["status"]
    result.update(
        found=True,
        gstin=g if reveal else mask_gstin(g),
        legal_name=r["legal_name"],
        trade_name=r["trade_name"],
        constitution=r["constitution"],
        address=r["principal_place_of_business"],
        state=r["state"],
        state_code_state=GST_STATE_CODES.get(g[:2]),
        registration_date=r["registration_date"],
        status=status,
        is_active=status == "Active",
        pan_masked=f"{g[2:4]}•••••{g[9:12]}",
    )
    if status != "Active":
        result["reason"] = f"GSTIN is {status.lower()}. Products that need a GSTIN cannot be sold until it is active."
    return result


def lookup_udyam(num: str) -> dict:
    u = (num or "").strip().upper()
    fmt = validate_udyam_format(u)
    result: dict = {"query": mask_udyam(u), "format_valid": fmt.valid, "format_reason": fmt.reason, "found": False}
    if not fmt.valid:
        return result
    ds = get_dataset()
    if u not in ds.udyam.index:
        result["reason"] = "Not found in the Udyam registry."
        return result
    r = ds.udyam.loc[u]
    result.update(
        found=True,
        udyam_number=mask_udyam(u),
        enterprise_name=r["enterprise_name"],
        enterprise_type=r["enterprise_type"],
        major_activity=r["major_activity"],
        nic_description=r["nic_description"],
        state=r["state"],
        city=r["city"],
        date_of_registration=r["date_of_registration"],
    )
    return result


def find_udyam_by_name(name: str) -> str | None:
    """Udyam number for an exact enterprise name (used to link GSTIN → Udyam in the demo)."""
    ds = get_dataset()
    hit = ds.udyam[ds.udyam["enterprise_name"] == name]
    return None if hit.empty else str(hit.index[0])

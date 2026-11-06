"""Masking helpers. Identifiers are masked in every API response and log line by default."""
from __future__ import annotations

import logging
import re

_GSTIN_RE = re.compile(r"\b(\d{2})([A-Z0-9]{8})([A-Z0-9]{3})([A-Z0-9]{2})\b")
_UDYAM_RE = re.compile(r"\b(UDYAM-[A-Z]{2}-\d{2}-)(\d{3})(\d{4})\b")
_PHONE_RE = re.compile(r"(?<!\d)(\+?91[\s-]?)?([6-9]\d{1})(\d{4})(\d{4})(?!\d)")
_AADHAAR_RE = re.compile(r"(?<!\d)(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})(?!\d)")


def mask_gstin(gstin: str | None) -> str:
    if not gstin or len(gstin) != 15:
        return gstin or ""
    return f"{gstin[:2]}{'•' * 8}{gstin[10:13]}{gstin[13:]}"


def mask_udyam(num: str | None) -> str:
    if not num:
        return ""
    m = _UDYAM_RE.fullmatch(num)
    return f"{m.group(1)}•••{m.group(3)}" if m else num


def mask_phone(phone: str | None) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return f"••••••{digits[-4:]}" if len(digits) >= 10 else (phone or "")


def mask_name(name: str | None) -> str:
    """'Neha Kaur' -> 'Neha K.' (enough to recognise, not enough to profile)."""
    if not name:
        return ""
    parts = name.split()
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0]}."


def redact_text(text: str) -> str:
    """Scrub identifiers out of free text before it is logged or sent to an LLM."""
    text = _GSTIN_RE.sub(lambda m: mask_gstin(m.group(0)), text)
    text = _UDYAM_RE.sub(lambda m: mask_udyam(m.group(0)), text)
    text = _AADHAAR_RE.sub("XXXX-XXXX-XXXX", text)
    text = _PHONE_RE.sub(lambda m: mask_phone(m.group(0)), text)
    return text


class RedactingFilter(logging.Filter):
    """Logging filter: no raw GSTIN / Udyam / phone / Aadhaar ever reaches a log sink."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = redact_text(str(record.getMessage()))
            record.args = ()
        except Exception:  # never break logging
            pass
        return True


def install_log_redaction() -> None:
    for name in ("", "uvicorn", "uvicorn.access", "uvicorn.error", "udyamsync"):
        logging.getLogger(name).addFilter(RedactingFilter())

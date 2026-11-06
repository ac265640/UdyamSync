"""Encryption at rest for raw identifiers and KYC documents (Fernet: AES-128-CBC + HMAC-SHA256).

The key is derived from APP_SECRET. In production this would be a KMS-managed key with rotation.
"""
from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet

from .config import get_settings


@lru_cache
def _fernet() -> Fernet:
    key = hashlib.sha256(("udyamsync-vault:" + get_settings().app_secret).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def seal(data: bytes | str) -> str:
    raw = data.encode() if isinstance(data, str) else data
    return _fernet().encrypt(raw).decode()


def open_bytes(token: str) -> bytes:
    return _fernet().decrypt(token.encode())


def open_str(token: str) -> str:
    return open_bytes(token).decode()

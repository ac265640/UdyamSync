"""Tiny SQLite persistence layer (sessions, leads, orders, documents, consent ledger, audit log).

Everything is stored as JSON documents keyed by id; that keeps the prototype simple while the
API surface stays what a production service (Postgres + object storage) would expose.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from .config import get_settings
from .privacy import redact_text

_LOCK = threading.RLock()
_CONN: sqlite3.Connection | None = None
TABLES = ("sessions", "leads", "orders", "documents", "consents", "audit", "partners")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def conn() -> sqlite3.Connection:
    global _CONN
    with _LOCK:
        if _CONN is None:
            path = get_settings().var_dir / "udyamsync.sqlite3"
            _CONN = sqlite3.connect(path, check_same_thread=False)
            _CONN.execute("PRAGMA journal_mode=WAL")
            for t in TABLES:
                _CONN.execute(
                    f"CREATE TABLE IF NOT EXISTS {t} (id TEXT PRIMARY KEY, seq INTEGER, created TEXT, updated TEXT, ref TEXT, body TEXT)"
                )
                _CONN.execute(f"CREATE INDEX IF NOT EXISTS {t}_ref ON {t}(ref)")
            _CONN.commit()
        return _CONN


def put(table: str, doc: dict, ref: str | None = None) -> dict:
    assert table in TABLES
    with _LOCK:
        c = conn()
        doc.setdefault("id", new_id(table[:3]))
        doc.setdefault("created", now_iso())
        doc["updated"] = now_iso()
        seq = c.execute(f"SELECT COALESCE(MAX(seq),0)+1 FROM {table}").fetchone()[0]
        existing = c.execute(f"SELECT seq FROM {table} WHERE id=?", (doc["id"],)).fetchone()
        c.execute(
            f"INSERT OR REPLACE INTO {table}(id, seq, created, updated, ref, body) VALUES (?,?,?,?,?,?)",
            (doc["id"], existing[0] if existing else seq, doc["created"], doc["updated"], ref, json.dumps(doc, ensure_ascii=False)),
        )
        c.commit()
        return doc


def get(table: str, id_: str) -> dict | None:
    with _LOCK:
        row = conn().execute(f"SELECT body FROM {table} WHERE id=?", (id_,)).fetchone()
    return json.loads(row[0]) if row else None


def find(table: str, ref: str | None = None, limit: int = 1000) -> list[dict]:
    with _LOCK:
        if ref is None:
            rows = conn().execute(f"SELECT body FROM {table} ORDER BY seq DESC LIMIT ?", (limit,)).fetchall()
        else:
            rows = conn().execute(f"SELECT body FROM {table} WHERE ref=? ORDER BY seq DESC LIMIT ?", (ref, limit)).fetchall()
    return [json.loads(r[0]) for r in rows]


def delete(table: str, id_: str) -> None:
    with _LOCK:
        conn().execute(f"DELETE FROM {table} WHERE id=?", (id_,))
        conn().commit()


def audit(actor: str, action: str, entity: str, detail: Any = "") -> None:
    """Append-only audit trail. Details are redacted before they are written."""
    text = detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False, default=str)
    put("audit", {"actor": actor, "action": action, "entity": entity, "detail": redact_text(text)[:2000]}, ref=entity)

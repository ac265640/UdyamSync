"""KYC cases: consent-gated uploads, encrypted document storage, evaluation, DigiLocker (mock),
auto-purge, and the K01-K12 applicant inspector for demos.
"""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

from .. import store
from ..config import get_settings
from ..privacy import mask_name
from ..vault import open_str, seal
from . import consent
from .checks import REQUIRED_DOCS, evaluate
from .ocr import DOC_LABELS, OcrResult, analyse

MAX_UPLOAD = 6 * 1024 * 1024
ALLOWED_MAGIC = (b"\x89PNG", b"\xff\xd8\xff", b"RIFF")  # png, jpeg, webp


def _docs_dir() -> Path:
    d = get_settings().var_dir / "docs"
    d.mkdir(parents=True, exist_ok=True)
    return d


class ConsentRequired(Exception):
    pass


def _result_to_dict(r: OcrResult) -> dict:
    return {"doc_type": r.doc_type, "fields": r.fields, "field_conf": r.field_conf, "quality": r.quality, "mean_confidence": r.mean_confidence}


def _dict_to_result(d: dict) -> OcrResult:
    return OcrResult(d["doc_type"], d["fields"], d.get("field_conf", {}), d["quality"], [], d.get("mean_confidence", 0.0))


def case_for(session_id: str) -> dict:
    case = store.get("documents", f"case_{session_id}")
    if case is None:
        case = store.put("documents", {"id": f"case_{session_id}", "kind": "case", "session_id": session_id, "docs": {}, "digilocker": None, "result": None}, ref=session_id)
    return case


def upload(session_id: str, slot: str, data: bytes, filename: str = "") -> dict:
    if not consent.has(session_id, "kyc_verification"):
        raise ConsentRequired()
    if slot not in REQUIRED_DOCS:
        raise ValueError("unknown document slot")
    if len(data) > MAX_UPLOAD:
        raise ValueError("file too large (max 6 MB)")
    if not data.startswith(ALLOWED_MAGIC):
        raise ValueError("only PNG, JPEG or WEBP images are accepted")
    ocr = analyse(data)
    case = case_for(session_id)
    doc_id = store.new_id("doc")
    (_docs_dir() / f"{doc_id}.bin").write_text(seal(data))  # encrypted at rest
    case["docs"][slot] = {
        "doc_id": doc_id,
        "uploaded_at": store.now_iso(),
        "bytes": len(data),
        "ocr": _result_to_dict(ocr),
        "purge_after": None,
    }
    case["result"] = evaluate_case(case)
    store.put("documents", case, ref=session_id)
    store.audit("customer", "kyc.upload", session_id, {"slot": slot, "doc_id": doc_id, "quality": ocr.quality["issues"]})
    return public_case(case)


def evaluate_case(case: dict) -> dict:
    docs = {t: (_dict_to_result(case["docs"][t]["ocr"]) if t in case["docs"] else None) for t in REQUIRED_DOCS}
    gstin = None
    s = store.get("sessions", case["session_id"])
    if s and s.get("vault", {}).get("gstin"):
        gstin = open_str(s["vault"]["gstin"])
    dl = case.get("digilocker")
    if dl and docs["signatory_id"] is None:
        docs["signatory_id"] = OcrResult("signatory_id", {"name": dl["name"], "designation": dl.get("designation", "Owner"), "valid_till": "2099-12-31"},
                                         {}, {"issues": [], "ok": True, "skew_deg": 0.0}, [], 1.0)
    result = evaluate(docs, declared_gstin=gstin)
    if dl:
        result["checks"].insert(0, {"id": "digilocker", "label": "Identity verified via DigiLocker", "status": "pass",
                                    "message": f"{mask_name(dl['name'])} verified through DigiLocker. No Aadhaar number was stored.", "doc": "signatory_id", "fix": None, "evidence": {}})
    if result["verdict"] != "action_needed":
        purge = (datetime.now(timezone.utc) + timedelta(days=get_settings().doc_retention_days)).isoformat(timespec="seconds")
        for d in case["docs"].values():
            d["purge_after"] = d["purge_after"] or purge
    return result


def digilocker(session_id: str, name: str, designation: str = "Owner") -> dict:
    """Mock DigiLocker: in production this is an OAuth redirect; we receive a verified name + doc
    reference and NEVER the Aadhaar number."""
    if not consent.has(session_id, "kyc_verification"):
        raise ConsentRequired()
    case = case_for(session_id)
    case["digilocker"] = {"name": name, "designation": designation, "verified_at": store.now_iso(), "ref": store.new_id("dl")}
    case["result"] = evaluate_case(case)
    store.put("documents", case, ref=session_id)
    store.audit("customer", "kyc.digilocker", session_id, {"ref": case["digilocker"]["ref"]})
    return public_case(case)


def remove(session_id: str, slot: str) -> dict:
    case = case_for(session_id)
    d = case["docs"].pop(slot, None)
    if d:
        (_docs_dir() / f"{d['doc_id']}.bin").unlink(missing_ok=True)
    case["result"] = evaluate_case(case) if case["docs"] else None
    store.put("documents", case, ref=session_id)
    return public_case(case)


def public_case(case: dict) -> dict:
    """What the app may show: extracted fields + checks, never image bytes or raw identifiers."""
    from ..privacy import mask_gstin, mask_udyam

    docs = {}
    for slot, d in case["docs"].items():
        f = dict(d["ocr"]["fields"])
        for k in ("gstin", "gstin_raw"):
            if f.get(k):
                f[k] = mask_gstin(f[k]) if len(f[k]) == 15 else "•" * len(f[k])
        if f.get("udyam_number"):
            f["udyam_number"] = mask_udyam(f["udyam_number"])
        if f.get("id_no"):
            f["id_no"] = "•••" + f["id_no"][-3:]
        f.pop("consumer_no", None)
        docs[slot] = {"label": DOC_LABELS[slot], "uploaded_at": d["uploaded_at"], "fields": f, "quality": d["ocr"]["quality"],
                      "detected_type": d["ocr"]["doc_type"], "purge_after": d["purge_after"]}
    return {"session_id": case["session_id"], "docs": docs, "digilocker": bool(case.get("digilocker")), "result": case.get("result"),
            "missing": [t for t in REQUIRED_DOCS if t not in case["docs"] and not (t == "signatory_id" and case.get("digilocker"))
                        and not (t == "gst_certificate" and _has_declared_gstin(case["session_id"]))]}


def _has_declared_gstin(session_id: str) -> bool:
    s = store.get("sessions", session_id)
    return bool(s and s.get("vault", {}).get("gstin"))


def purge_expired() -> int:
    """Delete document images past their retention date (runs at startup and hourly)."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    n = 0
    for case in store.find("documents"):
        if case.get("kind") != "case":
            continue
        changed = False
        for d in case["docs"].values():
            if d.get("purge_after") and d["purge_after"] < now and not d.get("purged"):
                (_docs_dir() / f"{d['doc_id']}.bin").unlink(missing_ok=True)
                d["purged"] = True
                changed = True
                n += 1
        if changed:
            store.put("documents", case, ref=case["session_id"])
    if n:
        store.audit("system", "kyc.purge", "documents", {"count": n})
    return n


def erase_subject(session_id: str) -> dict:
    """Right to erasure: delete documents and personal fields; keep only a tombstone + audit."""
    case = store.get("documents", f"case_{session_id}")
    files = 0
    if case:
        for d in case["docs"].values():
            (_docs_dir() / f"{d['doc_id']}.bin").unlink(missing_ok=True)
            files += 1
        store.delete("documents", case["id"])
    s = store.get("sessions", session_id)
    if s:
        s.update({"profile": {"erased": True}, "messages": [], "vault": {}, "recommendation": None, "cart": None, "erased_at": store.now_iso()})
        store.put("sessions", s)
    for lead in store.find("leads"):
        if lead.get("session_id") == session_id:
            store.delete("leads", lead["id"])
    store.audit("customer", "subject.erase", session_id, {"files_deleted": files})
    return {"erased": True, "files_deleted": files}


# ----------------------------------------------------------------------- applicant inspector
SAMPLES = [f"K{i:02d}" for i in range(1, 13)]
_lock = threading.Lock()


@lru_cache(maxsize=None)
def sample_result(applicant: str) -> dict:
    """Run the full pipeline on a specimen applicant from the case dataset (cached)."""
    with _lock:
        base = get_settings().data_dir / "kyc_documents"
        docs: dict[str, OcrResult | None] = {}
        files = {}
        for t in REQUIRED_DOCS:
            f = base / f"{applicant}_{t}.png"
            docs[t] = analyse(f.read_bytes()) if f.exists() else None
            files[t] = f"/api/kyc/samples/{applicant}/{t}.png" if f.exists() else None
        result = evaluate(docs)
        extracted = {t: (d.fields | {"_quality": d.quality, "_type": d.doc_type, "_boxes": d.boxes}) if d else None for t, d in docs.items()}
        for f in extracted.values():
            if f:
                f.pop("consumer_no", None)
        return {"applicant": applicant, "files": files, "extracted": extracted, **result}

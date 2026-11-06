"""Smart KYC API: consent, uploads, DigiLocker, verdict, and the K01-K12 applicant inspector."""
import re

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..config import get_settings
from ..kyc import consent, service
from ..kyc.checks import REQUIRED_DOCS
from ..privacy import mask_gstin, mask_udyam

router = APIRouter(prefix="/api/kyc", tags=["kyc"])


class ConsentIn(BaseModel):
    purposes: dict[str, bool]
    channel: str = "web"
    actor: str = "customer"


class DigiLockerIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    designation: str = "Owner"


@router.get("/notice")
def notice(lang: str = "en") -> dict:
    return consent.notice(lang)


@router.post("/{session_id}/consent")
def give_consent(session_id: str, body: ConsentIn) -> dict:
    for purpose, granted in body.purposes.items():
        try:
            consent.record(session_id, purpose, granted, body.actor, body.channel)
        except ValueError as e:
            raise HTTPException(400, str(e))
    return {"state": consent.state(session_id), "receipt": consent.receipt(session_id)}


@router.get("/{session_id}/consent")
def get_consent(session_id: str) -> dict:
    return {"state": consent.state(session_id), "receipt": consent.receipt(session_id)}


def _guard(fn, *args):
    try:
        return fn(*args)
    except service.ConsentRequired:
        raise HTTPException(403, "Consent for KYC verification is required before uploading documents.")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{session_id}/documents/{slot}")
async def upload(session_id: str, slot: str, file: UploadFile = File(...)) -> dict:
    data = await file.read()
    return _guard(service.upload, session_id, slot, data, file.filename or "")


@router.delete("/{session_id}/documents/{slot}")
def remove(session_id: str, slot: str) -> dict:
    return service.remove(session_id, slot)


@router.post("/{session_id}/digilocker")
def digilocker(session_id: str, body: DigiLockerIn) -> dict:
    return _guard(service.digilocker, session_id, body.name, body.designation)


@router.post("/{session_id}/use-sample/{applicant}")
def use_sample(session_id: str, applicant: str) -> dict:
    """Demo helper: load a specimen applicant's documents as if the owner uploaded them."""
    applicant = applicant.upper()
    if applicant not in service.SAMPLES:
        raise HTTPException(404, "Unknown applicant")
    base = get_settings().data_dir / "kyc_documents"
    out = service.public_case(service.case_for(session_id))
    for t in REQUIRED_DOCS:
        f = base / f"{applicant}_{t}.png"
        if f.exists():
            out = _guard(service.upload, session_id, t, f.read_bytes(), f.name)
    return out


@router.get("/samples")
def samples() -> list[dict]:
    out = []
    for k in service.SAMPLES:
        info = service.sample_result.cache_info()
        r = service.sample_result(k)
        out.append({"applicant": k, "verdict": r["verdict"], "verdict_label": r["verdict_label"], "summary": r["summary"],
                    "business": (r.get("registry") or {}).get("trade_name") or (r["extracted"].get("udyam_certificate") or {}).get("enterprise_name")})
    return out


def _mask_extracted(ex: dict) -> dict:
    out = {}
    for t, f in ex.items():
        if not f:
            out[t] = None
            continue
        f = dict(f)
        for k in ("gstin", "gstin_raw"):
            if f.get(k) and len(f[k]) == 15:
                f[k] = mask_gstin(f[k])
        if f.get("udyam_number"):
            f["udyam_number"] = mask_udyam(f["udyam_number"])
        out[t] = f
    return out


@router.get("/samples/{applicant}")
def sample(applicant: str) -> dict:
    applicant = applicant.upper()
    if applicant not in service.SAMPLES:
        raise HTTPException(404, "Unknown applicant")
    r = dict(service.sample_result(applicant))
    r["extracted"] = _mask_extracted(r["extracted"])
    return r


@router.get("/samples/{applicant}/{doc}.png")
def sample_image(applicant: str, doc: str) -> FileResponse:
    if not re.fullmatch(r"K\d{2}", applicant.upper()) or doc not in REQUIRED_DOCS:
        raise HTTPException(404)
    f = get_settings().data_dir / "kyc_documents" / f"{applicant.upper()}_{doc}.png"
    if not f.exists():
        raise HTTPException(404)
    return FileResponse(f, media_type="image/png")


@router.get("/{session_id}")
def get_case(session_id: str) -> dict:
    return service.public_case(service.case_for(session_id))

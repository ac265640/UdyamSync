"""Remote e-sign link for an absent authorised signatory."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import esign

router = APIRouter(prefix="/api/esign", tags=["esign"])


class LinkIn(BaseModel):
    session_id: str
    name: str = Field(..., min_length=2, max_length=80)
    phone: str = Field(..., pattern=r"^\+?[0-9 -]{10,15}$")


class SignIn(BaseModel):
    otp: str


def _do(fn, *a):
    try:
        return fn(*a)
    except esign.EsignError as e:
        raise HTTPException(400, str(e))


@router.post("/links")
def create(body: LinkIn) -> dict:
    return _do(esign.create, body.session_id, body.name, body.phone)


@router.get("/status/{session_id}")
def status(session_id: str) -> dict:
    return esign.status(session_id)


@router.get("/{token}")
def view(token: str) -> dict:
    return _do(esign.view, token)


@router.post("/{token}/sign")
def sign(token: str, body: SignIn) -> dict:
    return _do(esign.sign, token, body.otp)

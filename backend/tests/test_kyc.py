"""KYC: every specimen applicant gets the verdict and the specific finding we expect."""
import pytest

from app.kyc import service

EXPECTED = {
    # applicant: (verdict, failing check ids that must be present)
    "K01": ("action_needed", {"gstin.status", "udyam.number"}),
    "K02": ("verified_with_notes", set()),          # 7° tilted scan, auto-straightened
    "K03": ("verified", set()),
    "K04": ("action_needed", {"quality.gst_certificate"}),  # blurry GST certificate
    "K05": ("action_needed", {"present.udyam_certificate"}),
    "K06": ("action_needed", {"gstin.format"}),      # GSTIN typo on certificate (checksum)
    "K07": ("action_needed", {"gstin.legal_name"}),  # business name edited vs registry
    "K08": ("verified_with_notes", set()),
    "K09": ("verified_with_notes", set()),
    "K10": ("verified_with_notes", set()),
    "K11": ("action_needed", {"address.date"}),      # utility bill older than 90 days
    "K12": ("verified", set()),
}


@pytest.mark.parametrize("applicant", sorted(EXPECTED))
def test_specimen(applicant):
    r = service.sample_result(applicant)
    verdict, fails = EXPECTED[applicant]
    failing = {c["id"] for c in r["checks"] if c["status"] == "fail"}
    assert r["verdict"] == verdict, (r["verdict"], failing)
    assert fails <= failing, failing


def test_upload_requires_consent(client):
    s = client.post("/api/advisor/sessions", json={"lang": "en"}).json()["session_id"]
    png = open("../data/kyc_documents/K03_address_proof.png", "rb").read()
    r = client.post(f"/api/kyc/{s}/documents/address_proof", files={"file": ("a.png", png, "image/png")})
    assert r.status_code == 403
    client.post(f"/api/kyc/{s}/consent", json={"purposes": {"kyc_verification": True}})
    r = client.post(f"/api/kyc/{s}/documents/address_proof", files={"file": ("a.png", png, "image/png")})
    assert r.status_code == 200 and "address_proof" in r.json()["docs"]


def test_consent_chain_tamper_evident(client):
    from app import store
    from app.kyc import consent
    s = client.post("/api/advisor/sessions", json={"lang": "en"}).json()["session_id"]
    client.post(f"/api/kyc/{s}/consent", json={"purposes": {"kyc_verification": True, "marketing": False}})
    assert consent.verify_chain(s)["valid"]
    rec = store.find("consents", ref=s)[0]
    rec["granted"] = not rec["granted"]
    store.put("consents", rec, ref=s)
    assert not consent.verify_chain(s)["valid"]


def test_documents_encrypted_and_erasable(client):
    from app.config import get_settings
    s = client.post("/api/advisor/sessions", json={"lang": "en"}).json()["session_id"]
    client.post(f"/api/kyc/{s}/consent", json={"purposes": {"kyc_verification": True}})
    png = open("../data/kyc_documents/K12_signatory_id.png", "rb").read()
    client.post(f"/api/kyc/{s}/documents/signatory_id", files={"file": ("id.png", png, "image/png")})
    files = list((get_settings().var_dir / "docs").glob("*.bin"))
    assert files and all(not f.read_bytes().startswith(b"\x89PNG") for f in files)
    r = client.post(f"/api/me/{s}/erase").json()
    assert r["erased"] and r["files_deleted"] == 1

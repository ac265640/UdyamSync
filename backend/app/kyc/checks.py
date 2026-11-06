"""Smart KYC validation rules.

Input: OCR results for the four documents (GST certificate, Udyam certificate, signatory ID,
address proof). Output: a list of checks, each pass / warn / fail with a plain-language
message and the fix the owner can do right now — plus an overall verdict.

Sources of truth: the mock GST and Udyam registries. A document is never trusted over a registry.
"""
from __future__ import annotations

import re
from datetime import date, timedelta

from rapidfuzz import fuzz

from ..config import get_settings
from ..data import get_dataset
from ..privacy import mask_gstin, mask_udyam
from ..registry import UDYAM_STATE_CODES, lookup_gstin, lookup_udyam, validate_gstin_format, validate_udyam_format
from .ocr import DOC_LABELS, OcrResult

REQUIRED_DOCS = ("gst_certificate", "udyam_certificate", "signatory_id", "address_proof")
AUTHORISED = {"owner", "proprietor", "partner", "designated partner", "director", "managing director", "authorised signatory", "authorized signatory", "ceo"}
ADDRESS_MAX_AGE_DAYS = 90


def _compact(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def similar(a: str | None, b: str | None) -> int:
    """Name similarity robust to OCR-dropped spaces and word order."""
    if not a or not b:
        return 0
    return int(max(fuzz.token_set_ratio(a.lower(), b.lower()), fuzz.ratio(_compact(a), _compact(b))))


def strict_similar(a: str | None, b: str | None) -> int:
    """For a document field that should be an exact copy of the registry (catches edited names)."""
    if not a or not b:
        return 0
    return int(fuzz.ratio(_compact(a), _compact(b)))


def address_similar(doc_addr: str | None, reg_addr: str | None) -> int:
    if not doc_addr or not reg_addr:
        return 0
    a, b = _compact(doc_addr), _compact(reg_addr)
    return int(fuzz.partial_ratio(a, b)) if min(len(a), len(b)) >= 20 else int(fuzz.ratio(a, b))


def proprietor_of(legal_name: str | None) -> str | None:
    m = re.match(r"^\s*(.+?)\s*\(\s*prop\.?", legal_name or "", re.I)
    return m.group(1).strip() if m else None


def _date(s: str | None) -> date | None:
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s or "")
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


class Checks:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def add(self, cid: str, label: str, status: str, message: str, *, doc: str | None = None, fix: str | None = None, evidence: dict | None = None) -> None:
        self.items.append({"id": cid, "label": label, "status": status, "message": message, "doc": doc, "fix": fix, "evidence": evidence or {}})


def evaluate(docs: dict[str, OcrResult | None], *, declared_gstin: str | None = None) -> dict:
    ref = get_settings().reference_date
    c = Checks()
    gst, udy, sig, adr = (docs.get(k) for k in REQUIRED_DOCS)
    gf, uf, sf, af = (d.fields if d else {} for d in (gst, udy, sig, adr))

    # 1. Completeness + right document in the right slot
    for t in REQUIRED_DOCS:
        d = docs.get(t)
        if d is None and t == "gst_certificate" and declared_gstin:
            c.add("present.gst_certificate", "GST details", "pass", "Fetched directly from the GST registry using your GSTIN — no certificate upload needed.", doc=t)
            continue
        if d is None:
            fix = {
                "udyam_certificate": "Upload it, or type your Udyam number and we'll fetch it from the Udyam registry. No Udyam yet? Registration is free at udyamregistration.gov.in.",
                "gst_certificate": "Upload it, or just type your GSTIN — we'll fetch the details from the GST registry.",
                "signatory_id": "Upload the signatory's ID, or verify instantly with DigiLocker.",
                "address_proof": "Upload a utility bill (electricity / water / landline) from the last 90 days.",
            }[t]
            c.add(f"present.{t}", f"{DOC_LABELS[t]} provided", "fail", f"{DOC_LABELS[t]} is missing.", doc=t, fix=fix)
        elif d.doc_type and d.doc_type != t:
            c.add(f"slot.{t}", f"{DOC_LABELS[t]} provided", "fail", f"This looks like a {DOC_LABELS[d.doc_type].lower()}, not a {DOC_LABELS[t].lower()}.", doc=t, fix="Upload the right document in this slot.")

    # 2. Image quality
    for t, d in docs.items():
        if d is None:
            continue
        q = d.quality
        if "blurry" in q["issues"] or "low_ocr_confidence" in q["issues"]:
            c.add(f"quality.{t}", f"{DOC_LABELS.get(t, t)} is readable", "fail", "The photo is too blurry to read reliably.", doc=t,
                  fix="Retake in good light, hold the phone steady, fill the frame with the document.", evidence={"sharpness": q["sharpness"], "edge_strength": q["edge_strength"]})
        elif q["issues"]:
            c.add(f"quality.{t}", f"{DOC_LABELS.get(t, t)} is readable", "fail", f"Image problem: {', '.join(q['issues']).replace('_', ' ')}.", doc=t, fix="Retake the photo.")
        elif q.get("skew_deg"):
            c.add(f"quality.{t}", f"{DOC_LABELS.get(t, t)} is readable", "warn", f"The photo was tilted by {abs(q['skew_deg'])}° — we straightened it automatically and could read it.", doc=t,
                  fix="No action needed. Next time, keep the document flat and square to the camera.")

    # 3. GSTIN: format, checksum, registry, status, names, address
    reg = None
    gst_readable = gst is not None and "blurry" not in gst.quality["issues"]
    gstin = gf.get("gstin") or declared_gstin
    if gst is not None and gst_readable and not gf.get("gstin"):
        c.add("gstin.read", "GSTIN found on certificate", "fail", "We couldn't find a GSTIN on the certificate.", doc="gst_certificate", fix="Retake the photo or type your GSTIN.")
    if gstin and (gst_readable or declared_gstin):
        fmt = validate_gstin_format(gstin)
        if not fmt.valid:
            suggestion = _suggest_gstin(gf)
            c.add("gstin.format", "GSTIN is valid", "fail", f"GSTIN {mask_gstin(gstin) if len(gstin) == 15 else gstin} fails validation: {fmt.reason}", doc="gst_certificate",
                  fix=("The GST registry has " + suggestion + " for this business — please check the certificate or type the correct GSTIN.") if suggestion else "Check the number on the certificate and type it in.",
                  evidence={"read_as": mask_gstin(gstin)})
        else:
            r = lookup_gstin(gstin, reveal=True)
            if not r.get("found"):
                c.add("gstin.registry", "GSTIN exists in GST registry", "fail", "This GSTIN is not in the GST registry.", doc="gst_certificate", fix="Check the number or contact your CA.")
            else:
                reg = r
                c.add("gstin.registry", "GSTIN exists in GST registry", "pass", f"Found {r['trade_name']} ({r['constitution']}), registered {r['registration_date']}.", doc="gst_certificate")
                if r["status"] != "Active":
                    c.add("gstin.status", "GSTIN is active", "fail", f"The GST registry shows this GSTIN as {r['status'].upper()}.", doc="gst_certificate",
                          fix="Products that need a GSTIN can't be activated until it is restored. You can still take internet, mobile and CCTV today — or reactivate your GST registration first.")
                else:
                    c.add("gstin.status", "GSTIN is active", "pass", "GST registration is active.", doc="gst_certificate")
                if gf.get("legal_name"):
                    s = strict_similar(gf["legal_name"], r["legal_name"])
                    c.add("gstin.legal_name", "Legal name matches GST registry", "pass" if s >= 93 else "fail",
                          "Legal name matches the registry." if s >= 93 else f"Certificate says \"{gf['legal_name']}\" but the GST registry says \"{r['legal_name']}\".",
                          doc="gst_certificate", fix=None if s >= 93 else "The certificate may be outdated or edited. Upload the latest certificate from the GST portal.", evidence={"similarity": s})
                if gf.get("trade_name"):
                    s = strict_similar(gf["trade_name"], r["trade_name"])
                    if s < 93:
                        c.add("gstin.trade_name", "Trade name matches GST registry", "fail", f"Certificate trade name \"{gf['trade_name']}\" differs from the registry's \"{r['trade_name']}\".", doc="gst_certificate",
                              fix="Upload the latest certificate from the GST portal.", evidence={"similarity": s})
                if gf.get("address"):
                    s = address_similar(gf["address"], r["address"])
                    c.add("gstin.address", "Address matches GST registry", "pass" if s >= 85 else "warn",
                          "Business address matches the registry." if s >= 85 else "The address on the certificate differs from the registry.", doc="gst_certificate",
                          fix=None if s >= 85 else "If you moved, update your GST registration (amendment) — we'll install at the registry address.", evidence={"similarity": s})
    elif gst is None and declared_gstin:
        pass

    # 4. Udyam
    business_names = [n for n in ((reg or {}).get("trade_name"), (reg or {}).get("legal_name"), gf.get("trade_name"), gf.get("legal_name")) if n]
    if udy is not None:
        num = (uf.get("udyam_number") or "").upper().replace(" ", "")
        if not num:
            hint = _suggest_udyam(uf)
            c.add("udyam.number", "Udyam number on certificate", "fail", "The Udyam registration number is blank on the certificate.", doc="udyam_certificate",
                  fix=("The Udyam registry has " + hint + " for this enterprise — confirm it and we'll use the registry record instead.") if hint else "Type your Udyam number or download the certificate again from udyamregistration.gov.in.")
        elif not validate_udyam_format(num).valid:
            c.add("udyam.number", "Udyam number is valid", "fail", f"Udyam number looks wrong ({validate_udyam_format(num).reason}).", doc="udyam_certificate", fix="Check the number and type it in.")
        else:
            u = lookup_udyam(num)
            if not u.get("found"):
                c.add("udyam.registry", "Udyam number exists in registry", "fail", "This Udyam number is not in the Udyam registry.", doc="udyam_certificate", fix="Check the number on the certificate.")
            else:
                c.add("udyam.registry", "Udyam number exists in registry", "pass", f"{u['enterprise_name']} — {u['enterprise_type']} enterprise ({u['major_activity']}).", doc="udyam_certificate")
                if business_names:
                    s = max(similar(u["enterprise_name"], n) for n in business_names)
                    c.add("udyam.name", "Udyam enterprise matches GST business", "pass" if s >= 85 else "fail",
                          "Udyam and GST records are for the same business." if s >= 85 else f"Udyam is for \"{u['enterprise_name']}\", which doesn't match the GST business.", doc="udyam_certificate",
                          fix=None if s >= 85 else "Upload the Udyam certificate of this business.", evidence={"similarity": s})
                if reg and u["state"] != reg["state"]:
                    c.add("udyam.state", "Udyam state matches GST state", "warn", f"Udyam is registered in {u['state']} but GST is in {reg['state']}.", doc="udyam_certificate")

    # 5. Address proof
    if adr is not None:
        bdate = _date(af.get("bill_date"))
        if not bdate:
            c.add("address.date", "Address proof is recent", "fail", "We couldn't read the bill date.", doc="address_proof", fix="Retake the photo so the bill date is visible.")
        elif bdate > ref:
            c.add("address.date", "Address proof is recent", "fail", f"The bill is dated {bdate.isoformat()}, which is in the future.", doc="address_proof", fix="Upload a genuine recent bill.")
        else:
            age = (ref - bdate).days
            ok = age <= ADDRESS_MAX_AGE_DAYS
            c.add("address.date", "Address proof is recent (≤ 90 days)", "pass" if ok else "fail",
                  f"Bill dated {bdate.isoformat()} ({age} days old)." if ok else f"Bill dated {bdate.isoformat()} is {age} days old — it must be from the last 90 days (after {(ref - timedelta(days=ADDRESS_MAX_AGE_DAYS)).isoformat()}).",
                  doc="address_proof", fix=None if ok else "Upload your latest electricity, water or landline bill.", evidence={"age_days": age})
        if af.get("billed_to") and business_names:
            s = max(similar(af["billed_to"], n) for n in business_names)
            c.add("address.name", "Bill is in the business's name", "pass" if s >= 85 else "fail",
                  "Bill is in the business's name." if s >= 85 else f"Bill is in the name of \"{af['billed_to']}\", not the business.", doc="address_proof",
                  fix=None if s >= 85 else "Upload a bill in the business's name, or a rent agreement plus the owner's NOC.", evidence={"similarity": s})
        ref_addr = (reg or {}).get("address") or gf.get("address")
        if af.get("address") and ref_addr:
            s = address_similar(af["address"], ref_addr)
            c.add("address.match", "Bill address matches GST address", "pass" if s >= 85 else "fail",
                  "Supply address matches the GST address." if s >= 85 else "The bill's supply address doesn't match the GST address.", doc="address_proof",
                  fix=None if s >= 85 else "Upload a bill for the GST-registered premises.", evidence={"similarity": s})

    # 6. Authorised signatory
    if sig is not None:
        name, desig = sf.get("name"), (sf.get("designation") or "").strip()
        if not name:
            c.add("signatory.name", "Signatory name readable", "fail", "We couldn't read the name on the ID.", doc="signatory_id", fix="Retake the photo or verify with DigiLocker.")
        vt = _date(sf.get("valid_till"))
        if vt is None:
            c.add("signatory.expiry", "ID is valid", "warn", "Couldn't read the ID's validity date.", doc="signatory_id", fix="Verify with DigiLocker instead.")
        elif vt < ref:
            c.add("signatory.expiry", "ID is valid", "fail", f"The ID expired on {vt.isoformat()}.", doc="signatory_id", fix="Upload a valid ID or verify with DigiLocker.")
        else:
            c.add("signatory.expiry", "ID is valid", "pass", f"Valid till {vt.isoformat()}.", doc="signatory_id")
        if sf.get("for_business") and business_names:
            s = max(similar(sf["for_business"], n) for n in business_names)
            if s < 85:
                c.add("signatory.business", "ID is for this business", "fail", f"The ID is for \"{sf['for_business']}\", not this business.", doc="signatory_id", fix="Upload the ID of this business's signatory.")
        constitution = (reg or {}).get("constitution") or ""
        prop = proprietor_of((reg or {}).get("legal_name") or gf.get("legal_name"))
        authorised_role = desig.lower() in AUTHORISED
        if name and prop:
            same = similar(name, prop) >= 88
            if same and authorised_role:
                c.add("signatory.authority", "Signatory can sign for the business", "pass", f"{name} is the registered proprietor.", doc="signatory_id")
            elif same:
                c.add("signatory.authority", "Signatory can sign for the business", "warn",
                      f"{name} is the registered proprietor, but the ID lists the role as \"{desig or 'unknown'}\".", doc="signatory_id",
                      fix="We'll confirm by Aadhaar e-sign from the proprietor — no extra paperwork.")
            else:
                c.add("signatory.authority", "Signatory can sign for the business", "fail",
                      f"{name} is not the proprietor ({prop}) of this business.", doc="signatory_id",
                      fix=f"Ask {prop} to sign — we'll send a remote e-sign link — or upload an authorisation letter signed by {prop}.")
        elif name:
            if authorised_role and desig.lower() in ("partner", "designated partner", "director", "managing director", "authorised signatory", "authorized signatory"):
                c.add("signatory.authority", "Signatory can sign for the business", "pass", f"{name} signs as {desig} of the {constitution.lower() or 'business'}.", doc="signatory_id")
            elif authorised_role:
                c.add("signatory.authority", "Signatory can sign for the business", "warn",
                      f"\"{desig}\" isn't a formal role in a {constitution.lower() or 'company'}.", doc="signatory_id",
                      fix="We'll collect a one-line authorisation (board resolution / partner letter) by e-sign.")
            else:
                c.add("signatory.authority", "Signatory can sign for the business", "fail",
                      f"A \"{desig or 'unknown role'}\" cannot sign for a {constitution.lower() or 'business'}.", doc="signatory_id",
                      fix="A partner / director must sign — we'll send them a remote e-sign link.")

    statuses = [i["status"] for i in c.items]
    verdict = "action_needed" if "fail" in statuses else "verified_with_notes" if "warn" in statuses else "verified"
    return {
        "verdict": verdict,
        "verdict_label": {"verified": "Verified", "verified_with_notes": "Verified — 1 quick confirmation", "action_needed": "Action needed"}[verdict],
        "summary": {s: statuses.count(s) for s in ("pass", "warn", "fail")},
        "checks": c.items,
        "fixes": [{"doc": i["doc"], "message": i["message"], "fix": i["fix"]} for i in c.items if i["status"] in ("fail", "warn") and i["fix"]],
        "registry": {k: (reg or {}).get(k) for k in ("trade_name", "legal_name", "constitution", "status", "state")} if reg else None,
        "gstin_masked": mask_gstin(gstin) if gstin and len(gstin) == 15 else None,
    }


def _suggest_gstin(gf: dict) -> str | None:
    """When the certificate's GSTIN fails validation, find the business in the registry by name + address."""
    ds = get_dataset()
    name = gf.get("legal_name") or gf.get("trade_name")
    if not name:
        return None
    cand = ds.gstin[ds.gstin["legal_name"] == name]
    if gf.get("address") and len(cand) > 1:
        cand = cand[[address_similar(gf["address"], a) >= 85 for a in cand["principal_place_of_business"]]]
    if len(cand) != 1:
        return None
    right, read = str(cand.index[0]), fix_gstin_read(gf.get("gstin", ""))
    diff = [i for i, (x, y) in enumerate(zip(right, read)) if x != y]
    if diff and len(read) == 15:
        a, b = min(diff), max(diff) + 1
        return f"a GSTIN that differs at characters {a + 1}–{b}: the certificate shows \"{read[a:b]}\", the registry has \"{right[a:b]}\""
    return mask_gstin(right)


def fix_gstin_read(g: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (g or "").upper())


def _suggest_udyam(uf: dict) -> str | None:
    ds = get_dataset()
    name, city = uf.get("enterprise_name"), uf.get("city")
    if not name:
        return None
    cand = ds.udyam[(ds.udyam["enterprise_name"] == name) & ((ds.udyam["city"] == city) if city else True)]
    return mask_udyam(str(cand.index[0])) if len(cand) == 1 else None


__all__ = ["evaluate", "REQUIRED_DOCS", "UDYAM_STATE_CODES"]

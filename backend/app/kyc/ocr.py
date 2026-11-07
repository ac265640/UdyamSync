"""Document OCR + field extraction, fully on our own server (no document leaves to a third party).

Pipeline:
  1. Quality gate: blur (variance of Laplacian), resolution, brightness.
  2. Clean: drop the pink "SPECIMEN" watermark by keeping only dark (ink) pixels.
  3. OCR with RapidOCR (ONNX, offline) -> text boxes with positions + confidence.
  4. Layout-aware key/value pairing: label in the left column, value on the same row.
  5. Classify the document type from its title.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

DOC_TYPES = {
    "gst_certificate": r"gst registration certificate|gst reg",
    "udyam_certificate": r"udyam registration certificate|udyam reg",
    "signatory_id": r"signatory id|authori[sz]ed signatory",
    "address_proof": r"electricity bill|utility|address proof|telephone bill|water bill",
}
DOC_LABELS = {
    "gst_certificate": "GST registration certificate",
    "udyam_certificate": "Udyam registration certificate",
    "signatory_id": "Authorised signatory ID",
    "address_proof": "Address proof (utility bill)",
}

# canonical field -> label patterns (normalised: lowercase, no spaces)
LABELS = {
    "gstin": r"^gstin",
    "legal_name": r"^legalname",
    "trade_name": r"^tradename",
    "constitution": r"^constitution",
    "address": r"^addressof(principal)?|^supplyaddress|^address$",
    "date_of_liability": r"^dateofliability",
    "registration_type": r"^typeofreg",
    "udyam_number": r"^udyamreg|^udyamno|^registrationnumber",
    "enterprise_name": r"^enterprisename",
    "enterprise_type": r"^enterprisetype|^type$|^category",
    "major_activity": r"^majoractivity",
    "city": r"^city|^district",
    "state": r"^state$",
    "date_of_registration": r"^dateofreg",
    "consumer_no": r"^consumerno",
    "billed_to": r"^billedto",
    "bill_date": r"^billdate|^dateofbill|^issuedate",
    "units": r"^units",
    "amount_due": r"^amountdue",
    "name": r"^name$",
    "designation": r"^designation",
    "for_business": r"^forbusiness",
    "id_no": r"^idno",
    "valid_till": r"^validtill|^validupto|^expiry",
}
CONTINUATION = r"^placeofbusiness|^\(?contd"
NOISE = re.compile(r"specimen|valid docu|not a valid|synthetic|hackathon|ocr testing|fictional|^docu|^cimen|^thetic", re.I)


@dataclass
class OcrResult:
    doc_type: str | None
    fields: dict[str, str]
    field_conf: dict[str, float]
    quality: dict
    lines: list[str] = field(default_factory=list)
    mean_confidence: float = 0.0
    boxes: dict[str, list[float]] = field(default_factory=dict)  # field -> [x0,y0,x1,y1] in 0..1 of the (deskewed) page


@lru_cache
def _engine():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def load_image(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def quality(img: np.ndarray) -> dict:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # Measure sharpness on ink only (text strokes), so big blank areas don't skew it.
    sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    ink = gray < 120
    ink_ratio = float(ink.mean())
    # Edge contrast: strong text has hard edges; blurred scans have soft gradients.
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1)
    mag = np.hypot(gx, gy)
    edge_strength = float(np.percentile(mag[mag > 20], 90)) if (mag > 20).any() else 0.0
    brightness = float(gray.mean())
    issues = []
    if min(h, w) < 500:
        issues.append("low_resolution")
    if edge_strength < 260 or sharp < 120:
        issues.append("blurry")
    if brightness < 80:
        issues.append("too_dark")
    if brightness > 252 or ink_ratio < 0.002:
        issues.append("blank_or_overexposed")
    return {
        "width": w, "height": h, "sharpness": round(sharp, 1), "edge_strength": round(edge_strength, 1),
        "brightness": round(brightness, 1), "ink_ratio": round(ink_ratio, 4), "issues": issues, "ok": not issues,
    }


def deskew(img: np.ndarray) -> tuple[np.ndarray, float]:
    """Straighten a tilted photo/scan using the angle of the dark ink (text + border)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    b, g, r = cv2.split(img.astype(np.int16))
    ink = (gray < 110) & ~((r - np.minimum(g, b)) > 35)
    edges = cv2.Canny((ink * 255).astype(np.uint8), 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 720, threshold=120, minLineLength=img.shape[1] // 4, maxLineGap=10)
    if lines is None:
        return img, 0.0
    angles = []
    for x1, y1, x2, y2 in np.asarray(lines).reshape(-1, 4):
        a = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(a) < 20:
            angles.append(a)
        elif abs(abs(a) - 90) < 20:
            angles.append(a - 90 if a > 0 else a + 90)
    if not angles:
        return img, 0.0
    angle = float(np.median(angles))
    if abs(angle) < 0.4:
        return img, 0.0
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    out = cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    return out, round(angle, 1)


_TO_LETTER = {"0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "6": "G"}
_TO_DIGIT = {"O": "0", "I": "1", "L": "1", "S": "5", "B": "8", "Z": "2", "G": "6", "D": "0", "Q": "0"}


def fix_gstin(raw: str) -> str:
    """Undo classic OCR confusions using the GSTIN's fixed structure (digits vs letters by position)."""
    g = re.sub(r"[^A-Z0-9]", "", (raw or "").upper())
    if len(g) != 15:
        return g
    out = []
    for i, ch in enumerate(g):
        if i in (0, 1, 7, 8, 9, 10):
            out.append(_TO_DIGIT.get(ch, ch))
        elif i in (2, 3, 4, 5, 6, 11):
            out.append(_TO_LETTER.get(ch, ch))
        elif i == 13:
            out.append("Z" if ch in "Z2" else ch)
        else:
            out.append(ch)
    return "".join(out)


def clean(img: np.ndarray) -> np.ndarray:
    """Remove the light-red watermark: keep dark ink, whiten everything else."""
    b, g, r = cv2.split(img.astype(np.int16))
    reddish = (r - np.minimum(g, b)) > 35
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    out = gray.copy()
    out[reddish & (gray > 90)] = 255
    out[out > 200] = 255
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def _norm(label: str) -> str:
    return re.sub(r"[^a-z]", "", label.lower())


def _canonical(label: str) -> str | None:
    n = _norm(label)
    for key, pat in LABELS.items():
        if re.search(pat, n):
            return key
    return None


def run_ocr(img: np.ndarray) -> list[tuple[list, str, float]]:
    result, _ = _engine()(img)
    return result or []


def _items(boxes: list[tuple[list, str, float]], keep_noise: bool = False) -> list[dict]:
    items = []
    for box, text, conf in boxes:
        text = text.strip()
        if not text or (not keep_noise and NOISE.search(text)):
            continue
        xs, ys = [p[0] for p in box], [p[1] for p in box]
        if max(ys) - min(ys) > 90:  # diagonal watermark fragments
            continue
        items.append({"x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys), "yc": (min(ys) + max(ys)) / 2, "text": text, "conf": float(conf)})
    items.sort(key=lambda i: (i["yc"], i["x0"]))
    return items


def extract_stacked(boxes: list[tuple[list, str, float]]) -> tuple[dict, dict, list[str]]:
    """ID-card layout: small label, value directly underneath."""
    items = _items(boxes)
    fields: dict[str, str] = {}
    conf: dict[str, float] = {}
    for i, it in enumerate(items):
        key = _canonical(it["text"])
        if key is None or key in fields:
            continue
        below = [v for v in items[i + 1:] if -10 <= v["y0"] - it["y1"] < 45 and v["yc"] > it["yc"] + 8 and abs(v["x0"] - it["x0"]) < 40 and not _canonical(v["text"])]
        if below:
            fields[key] = below[0]["text"]
            conf[key] = below[0]["conf"]
    return fields, conf, [i["text"] for i in items]


def extract_fields(boxes: list[tuple[list, str, float]], width: int) -> tuple[dict, dict, list[str]]:
    items = []
    for box, text, conf in boxes:
        text = text.strip()
        if not text or NOISE.search(text):
            continue
        xs, ys = [p[0] for p in box], [p[1] for p in box]
        items.append({"x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys), "yc": (min(ys) + max(ys)) / 2, "text": text, "conf": float(conf)})
    items.sort(key=lambda i: (i["yc"], i["x0"]))
    lines = [i["text"] for i in items]
    split = width * 0.38
    labels = [i for i in items if i["x1"] < split + width * 0.05 and (_canonical(i["text"]) or re.search(CONTINUATION, _norm(i["text"])))]
    values = [i for i in items if i["x0"] >= split * 0.9 and i not in labels]
    fields: dict[str, str] = {}
    conf: dict[str, float] = {}
    last_key = None
    used = set()
    for lab in labels:
        key = _canonical(lab["text"])
        if key is None and re.search(CONTINUATION, _norm(lab["text"])):
            key = last_key
        if key is None:
            continue
        row = [v for v in values if abs(v["yc"] - lab["yc"]) < max(14, (lab["y1"] - lab["y0"]) * 0.9) and id(v) not in used]
        if not row:
            # signatory-ID style: label above, value below
            below = [v for v in items if v["y0"] > lab["y1"] - 2 and v["y0"] - lab["y1"] < 40 and abs(v["x0"] - lab["x0"]) < 30 and id(v) not in used and not _canonical(v["text"])]
            row = below[:1]
        if not row:
            last_key = key
            continue
        row.sort(key=lambda v: v["x0"])
        text = " ".join(v["text"] for v in row)
        for v in row:
            used.add(id(v))
        if key in fields and key == last_key:
            fields[key] = (fields[key] + " " + text).strip()
        else:
            fields[key] = text
        conf[key] = min(v["conf"] for v in row)
        last_key = key
    # A value-column line with no label right under the address is its wrapped second line.
    if "address" in fields:
        addr_rows = [v for v in values if id(v) not in used and v["text"] and not re.match(r"^\d{4}-\d{2}-\d{2}$", v["text"])]
        tail = fields["address"]
        for v in addr_rows:
            if re.match(r"^[a-z]{1,12}[ ,a-z]*-?\s*\d{6}$|^[a-z]{2,12}$|^-\s*\d{6}$", v["text"].strip().lower()) and not tail.rstrip().endswith(v["text"]):
                fields["address"] = (tail + v["text"]).strip() if re.search(r"[A-Za-z]$", tail) and re.match(r"^[a-z]", v["text"]) else (tail + " " + v["text"]).strip()
                used.add(id(v))
                break
    return fields, conf, lines


def classify(lines: list[str]) -> str | None:
    head = " ".join(lines[:3]).lower()
    for t, pat in DOC_TYPES.items():
        if re.search(pat, head):
            return t
    full = " ".join(lines).lower()
    for t, pat in DOC_TYPES.items():
        if re.search(pat, full):
            return t
    return None


def locate(boxes: list[tuple[list, str, float]], fields: dict[str, str], w: int, h: int) -> dict[str, list[float]]:
    """Where each extracted field (and each field's printed label) sits on the page: the evidence
    the inspector draws over the document."""
    items = _items(boxes)
    out: dict[str, list[float]] = {}

    def norm(group: list[dict]) -> list[float]:
        return [round(min(i["x0"] for i in group) / w, 4), round(min(i["y0"] for i in group) / h, 4),
                round(max(i["x1"] for i in group) / w, 4), round(max(i["y1"] for i in group) / h, 4)]

    for it in items:
        key = _canonical(it["text"])
        if key and f"{key}__label" not in out:
            out[f"{key}__label"] = norm([it])
    an = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())  # noqa: E731 — keep digits for dates and IDs
    for key, value in fields.items():
        if key.endswith("_raw"):
            continue
        v = an(fields.get(f"{key}_raw", value))
        group = [it for it in items if len(an(it["text"])) >= 3 and an(it["text"]) in v and not _canonical(it["text"])]
        if group:
            out[key] = norm(group)
    return out


def processed_png(data: bytes) -> bytes:
    """The page as the engine reads it (straightened), so drawn boxes line up."""
    img, _ = deskew(load_image(data))
    ok, buf = cv2.imencode(".png", img)
    return buf.tobytes() if ok else data


def analyse(data: bytes) -> OcrResult:
    img = load_image(data)
    q = quality(img)
    img, skew = deskew(img)
    q["skew_deg"] = skew
    boxes = run_ocr(clean(img))
    if len(boxes) < 4:  # cleaning can hurt very faint scans; fall back to the original
        boxes = run_ocr(img)
    doc_type = classify([i["text"] for i in _items(boxes, keep_noise=True)])
    if doc_type == "signatory_id":
        fields, conf, lines = extract_stacked(boxes)
    else:
        fields, conf, lines = extract_fields(boxes, img.shape[1])
    if doc_type == "gst_certificate" and len([k for k in fields if k in ("gstin", "legal_name", "trade_name")]) < 2 and boxes:
        # second opinion on the uncleaned image (watermark removal can eat thin glyphs)
        f2, c2, _ = extract_fields(run_ocr(img), img.shape[1])
        for k, v in f2.items():
            fields.setdefault(k, v)
            conf.setdefault(k, c2.get(k, 0.0))
    if "gstin" in fields:
        fields["gstin_raw"] = fields["gstin"]
        fields["gstin"] = fix_gstin(fields["gstin"])
    mean_conf = float(np.mean([b[2] for b in boxes])) if boxes else 0.0
    if mean_conf and mean_conf < 0.8 and "blurry" not in q["issues"]:
        q["issues"].append("low_ocr_confidence")
        q["ok"] = False
    return OcrResult(doc_type, fields, conf, q, lines, round(mean_conf, 3), locate(boxes, fields, img.shape[1], img.shape[0]))

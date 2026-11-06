"""The advisor conversation: 3-turn discovery -> explainable recommendation -> objections/handoff.

State lives in the `sessions` table so a dropped connection resumes exactly where it was.
Messages are stored redacted (identifiers masked) — the raw GSTIN is never persisted here.
"""
from __future__ import annotations

import re
from datetime import timedelta

from .. import store
from ..config import get_settings
from ..data import SEGMENT_NAMES, get_dataset
from ..privacy import mask_gstin, mask_udyam, redact_text
from ..vault import seal
from ..registry import find_udyam_by_name, lookup_gstin, lookup_udyam, validate_gstin_format
from . import llm
from .i18n import BUILTIN, LANGUAGES, benefit, btype_label, need_label, reason_text, t
from .profile import NEEDS, Profile, extract, is_question, merge, normalise_segment
from .recommender import recommend

DEFAULT_SCALE = {"micro": (3, 1), "prof": (6, 1), "multi": (20, 3), "mfg": (25, 1)}
INTENTS = {
    "human": r"call me|talk to (a |some)?(person|human|agent|someone)|baat kar|बात कर|कॉल कर|फोन कर|agent|executive|salesman",
    "later": r"\blater\b|baad me|बाद में|sochk|सोच|think about|not now|abhi nahi|अभी नहीं|नंतर",
    "price_objection": r"expensive|costly|too much|mehenga|mehnga|महंगा|महँगा|cheaper|sasta|सस्ता|kam karo|discount|budget|महाग",
    "locked_in": r"contract|locked|lock-in|already (have|using)|pehle se|पहले से|agreement",
    "mobile_only": r"only (want |need )?(a )?(sim|mobile)|sirf (sim|mobile)|सिर्फ़? (सिम|मोबाइल)|just (a )?(sim|mobile)",
    "accept": r"^(ok|okay|yes|haan|ha|हाँ|हां|ठीक|theek|done|proceed|continue|aage|आगे|chalo|let'?s go|book)\b",
}
FIBRE_GAP_SUFFIX = 8  # mock feasibility: pincodes ending 00-07 have no fibre (~8%, matches the data's drop rate)


def fibre_feasible(pincode: str | None) -> bool:
    return not (pincode and pincode.isdigit() and int(pincode[-2:]) < FIBRE_GAP_SUFFIX)


def _lang(session: dict) -> str:
    return session.get("lang", "en")


def _tlang(session: dict) -> str:
    """Template language: built-ins directly, others via English template + LLM translation."""
    lang = _lang(session)
    return lang if lang in BUILTIN else "en"


def _say(session: dict, key: str, allowed: set[int] | None = None, **kw) -> str:
    text = t(key, _tlang(session), **kw)
    if _lang(session) not in BUILTIN:
        text = llm.phrase(text, _lang(session), allowed or set(), text)
    return text


def _chips(session: dict, kind: str) -> list[dict]:
    lang = _tlang(session)
    if kind == "identity":
        ex = {
            "en": ["Kirana store in Lucknow", "Dental clinic in Pune, 8 staff", "3-outlet restaurant in Bengaluru", "Textile unit in Surat, 40 workers"],
            "hi": ["लखनऊ में किराना स्टोर", "पुणे में डेंटल क्लिनिक, 8 लोग", "बेंगलुरु में 3 आउटलेट वाला रेस्टोरेंट", "सूरत में टेक्सटाइल यूनिट, 40 कर्मचारी"],
            "mr": ["लखनऊ मध्ये किराणा दुकान", "पुण्यात डेंटल क्लिनिक, 8 लोक", "बेंगळूरुमध्ये 3 आउटलेट रेस्टॉरंट", "सूरतमध्ये टेक्सटाइल युनिट, 40 कामगार"],
        }[lang]
        return [{"label": e, "value": e} for e in ex]
    if kind == "scale":
        return [
            {"label": {"en": "Just me", "hi": "सिर्फ़ मैं", "mr": "फक्त मी"}[lang], "value": "just me, 1 shop"},
            {"label": {"en": "2–5 people", "hi": "2–5 लोग", "mr": "2–5 लोक"}[lang], "value": "4 people, 1 shop"},
            {"label": {"en": "6–20 people", "hi": "6–20 लोग", "mr": "6–20 लोक"}[lang], "value": "10 people, 1 location"},
            {"label": {"en": "20+ people", "hi": "20+ लोग", "mr": "20+ लोक"}[lang], "value": "30 people, 1 location"},
            {"label": {"en": "2–4 branches", "hi": "2–4 ब्रांच", "mr": "2–4 शाखा"}[lang], "value": "3 branches"},
            {"label": {"en": "5+ branches", "hi": "5+ ब्रांच", "mr": "5+ शाखा"}[lang], "value": "6 branches"},
        ]
    if kind == "needs":
        seg = session["profile"].get("segment") or "micro"
        order = {
            "micro": ["payments", "whatsapp", "cctv", "failover", "guest_wifi", "website"],
            "prof": ["cloud_email", "backup", "security", "failover", "telephony", "sms"],
            "multi": ["payments", "central_mgmt", "cctv", "failover", "whatsapp", "guest_wifi"],
            "mfg": ["machines", "security", "cctv", "failover", "cloud_email", "fleet"],
        }[seg]
        picked = set(session["profile"].get("needs") or [])
        chips = [{"label": need_label(n, lang), "value": f"need:{n}", "selected": n in picked} for n in order]
        chips.append({"label": {"en": "Show my bundle →", "hi": "मेरा बंडल दिखाइए →", "mr": "माझं बंडल दाखवा →"}[lang], "value": "need:none", "primary": True})
        return chips
    if kind == "after_rec":
        return [
            {"label": {"en": "Continue ✓", "hi": "आगे बढ़ें ✓", "mr": "पुढे जा ✓"}[lang], "value": "action:checkout"},
            {"label": {"en": "Too expensive", "hi": "महंगा है", "mr": "महाग आहे"}[lang], "value": "it is too expensive"},
            {"label": {"en": "Talk to a person", "hi": "किसी से बात करनी है", "mr": "व्यक्तीशी बोलायचं आहे"}[lang], "value": "please call me"},
            {"label": {"en": "Decide later", "hi": "बाद में", "mr": "नंतर"}[lang], "value": "later"},
        ]
    return []


# ----------------------------------------------------------------------------- sessions
def start(lang: str = "en", channel: str = "web", partner_id: str | None = None, source: str | None = None) -> dict:
    lang = lang if lang in LANGUAGES else "en"
    session = {
        "id": store.new_id("ses"),
        "lang": lang,
        "channel": channel,
        "partner_id": partner_id,
        "profile": Profile(source=source or ("Channel partner" if partner_id else "WhatsApp campaign" if channel == "whatsapp" else "Website form")).to_dict(),
        "asked": [],
        "messages": [],
        "fallbacks": 0,
        "stage": "discover",
        "recommendation": None,
        "selected_tier": None,
        "term_months": None,
        "lead_id": None,
        "intents": [],
    }
    reply = _say(session, "greet")
    session["messages"].append({"role": "assistant", "text": reply})
    session["asked"].append("identity")
    store.put("sessions", session, ref=partner_id)
    store.audit("customer" if not partner_id else f"partner:{partner_id}", "session.start", session["id"], {"lang": lang, "channel": channel})
    return _response(session, [reply], _chips(session, "identity"))


def get_session(session_id: str) -> dict | None:
    return store.get("sessions", session_id)


def _response(session: dict, replies: list[str], chips: list[dict], extra: dict | None = None) -> dict:
    return {
        "session_id": session["id"],
        "lang": session["lang"],
        "stage": session["stage"],
        "replies": replies,
        "chips": chips,
        "profile": session["profile"],
        "recommendation": session.get("recommendation"),
        "selected_tier": session.get("selected_tier"),
        "lead_id": session.get("lead_id"),
        "llm": llm.enabled(),
        **(extra or {}),
    }


def _apply_gstin(session: dict, gstin: str, replies: list[str]) -> None:
    p = Profile.from_dict(session["profile"])
    fmt = validate_gstin_format(gstin)
    if not fmt.valid:
        replies.append(_say(session, "gst_invalid", reason=fmt.reason))
        return
    r = lookup_gstin(gstin, reveal=True)
    if not r.get("found"):
        p.gstin_status = "unverified"
        p.gstin_masked = mask_gstin(gstin)
        session["profile"] = p.to_dict()
        replies.append(_say(session, "gst_invalid", reason=r.get("reason", "not found")))
        return
    p.gstin_masked = mask_gstin(gstin)
    p.gstin_status = r["status"].lower()
    p.business_name = r["trade_name"]
    p.gstin_constitution = r["constitution"]
    addr = r["address"]
    city = next((c for c in get_dataset().city_tier if f", {c}," in addr), None)
    pin = re.search(r"(\d{6})\s*$", addr)
    found = extract(f"{r['legal_name']} {r['trade_name']}")
    found.pop("city", None)
    if city:
        found["city"] = city
    if pin:
        found["pincode"] = pin.group(1)
    merge(p, found)
    p.prefilled_from = list(dict.fromkeys(p.prefilled_from + ["GST registry"]))
    udyam = find_udyam_by_name(r["legal_name"]) or find_udyam_by_name(r["trade_name"])
    if udyam:
        u = lookup_udyam(udyam)
        p.udyam_masked = mask_udyam(udyam)
        p.udyam_type = u.get("enterprise_type")
        p.prefilled_from.append("Udyam registry")
    session["profile"] = p.to_dict()
    session.setdefault("vault", {})["gstin"] = seal(gstin)  # raw GSTIN only ever stored encrypted
    replies.append(_say(session, "gst_found", name=r["trade_name"], constitution=r["constitution"], city=city or r["state"], status=r["status"]))
    if r["status"] != "Active":
        replies.append(_say(session, "gst_inactive", status=r["status"]))


def _detect_intent(text: str) -> str | None:
    low = text.lower().strip()
    for name, pat in INTENTS.items():
        if re.search(pat, low):
            return name
    return None


def _ensure_lead(session: dict, reason: str, status: str = "open") -> dict:
    """Create/update the CRM lead the Partner Co-Pilot works from."""
    p = Profile.from_dict(session["profile"])
    rec = session.get("recommendation") or {}
    tier = session.get("selected_tier") or rec.get("default_tier")
    quote = (rec.get("tiers") or {}).get(tier) if tier else None
    lead = store.get("leads", session["lead_id"]) if session.get("lead_id") else None
    lead = lead or {"id": store.new_id("lead"), "session_id": session["id"], "events": []}
    needs = ", ".join(need_label(n, "en") for n in p.needs) or "not stated"
    summary = (
        f"{p.business_type or 'Business'}{' (' + p.business_name + ')' if p.business_name else ''} in {p.city or 'unknown city'}; "
        f"{p.employees or '?'} people, {p.sites or '?'} site(s); GSTIN {p.gstin_status}; "
        f"current: {p.current_internet or 'unknown'}{f' ₹{p.current_spend}/mo' if p.current_spend else ''}; wants: {needs}. "
        + (f"Viewed {tier} bundle at ₹{quote['monthly_total']}/mo. " if quote else "")
        + f"Stalled because: {reason}."
    )
    lead.update({
        "test": session.get("channel") == "eval",
        "source": p.source,
        "partner_id": session.get("partner_id"),
        "lang": session["lang"],
        "profile": p.to_dict(),
        "stage_reached": "Quote viewed" if quote else "Needs assessed" if p.segment else "Contacted",
        "reason": reason,
        "status": status,
        "summary": summary,
        "quote_monthly": quote["monthly_total"] if quote else None,
        "tier": tier,
    })
    lead["events"].append({"at": store.now_iso(), "event": reason})
    from ..partner import score_live_lead  # local import to avoid a cycle

    lead["score"], lead["score_factors"] = score_live_lead(lead)
    store.put("leads", lead, ref=session.get("partner_id"))
    session["lead_id"] = lead["id"]
    store.audit("advisor", "lead.upsert", lead["id"], {"reason": reason})
    return lead


def _recommend(session: dict, replies: list[str]) -> list[dict]:
    p = Profile.from_dict(session["profile"])
    lang = _tlang(session)
    if p.pincode:
        p.fibre_feasible = fibre_feasible(p.pincode)
        session["profile"] = p.to_dict()
    rec = recommend(p, session.get("term_months"))
    lang_full = _lang(session)
    for q in rec["tiers"].values():
        for line in q["lines"]:
            line["why"] = benefit(line["product_id"], lang)
            line["reason_texts"] = [reason_text(r, lang) for r in line.get("reasons", [])]
    session["recommendation"] = rec
    session["selected_tier"] = rec["default_tier"]
    session["stage"] = "recommended"
    q = rec["tiers"][rec["default_tier"]]
    allowed = {q["monthly_total"], q["connectivity_monthly"], p.current_spend or 0}
    if not p.fibre_feasible:
        replies.append(_say(session, "no_fibre", pincode=p.pincode))
    replies.append(_say(session, "recommend_intro", allowed, btype=btype_label(p.business_type, lang), bundle=rec["default_tier"].title(), monthly=f"{q['monthly_total']:,}", days=q["full_activation_days"]))
    if p.current_spend and q["connectivity_monthly"] <= p.current_spend:
        replies.append(_say(session, "savings", allowed, current=f"{p.current_spend:,}", connectivity=f"{q['connectivity_monthly']:,}"))
    if q["blocked"]:
        items = ", ".join(b["name"] for b in q["blocked"])
        why = q["blocked"][0]["reasons"][0]["message"]
        replies.append(_say(session, "blocked_note", items=items, why=why))
    if (p.employees or 0) >= 50 or (p.sites or 0) > 5:
        replies.append(_say(session, "handoff_big", employees=p.employees, sites=p.sites))
        _ensure_lead(session, "Large account — needs solutions expert", status="open")
    replies.append(_say(session, "next_steps"))
    if lang_full != lang and llm.enabled():
        pass  # already translated by _say
    return _chips(session, "after_rec")


def handle(session_id: str, text: str) -> dict:
    session = get_session(session_id)
    if session is None:
        raise KeyError(session_id)
    text = (text or "").strip()[:1000]
    replies: list[str] = []
    session["messages"].append({"role": "user", "text": redact_text(text)})
    p = Profile.from_dict(session["profile"])

    # 1. Quick-reply tokens
    if text.startswith("need:"):
        need = text.split(":", 1)[1]
        if need in NEEDS and need not in p.needs:
            p.needs.append(need)
        session["profile"] = p.to_dict()
        if "needs" not in session["asked"]:
            session["asked"].append("needs")
        if need == "none" or session["stage"] == "recommended":
            return _finish(session, replies, _recommend(session, replies))
        replies.append(_say(session, "need_added", label=need_label(need, _tlang(session))))
        return _finish(session, replies, _chips(session, "needs"))
    if text == "action:checkout":
        session["stage"] = "checkout"
        return _finish(session, replies, [], {"go": "checkout"})

    # 2. GSTIN / Udyam in the message
    found = extract(text)
    if "gstin" in found:
        _apply_gstin(session, found.pop("gstin"), replies)
        p = Profile.from_dict(session["profile"])
    if "udyam" in found:
        u = lookup_udyam(found.pop("udyam"))
        if u.get("found"):
            p.udyam_masked, p.udyam_type = u["udyam_number"], u["enterprise_type"]
            merge(p, {k: v for k, v in extract(u["enterprise_name"] + " " + u["nic_description"]).items() if k in ("business_type", "segment")} | ({"city": u["city"]} if u["city"] in get_dataset().city_tier else {}))
            p.prefilled_from = list(dict.fromkeys(p.prefilled_from + ["Udyam registry"]))

    # 3. Understand the message (rules first, LLM fills gaps)
    if llm.enabled() and (session["lang"] not in ("en",) or len(found) <= 1):
        extra = llm.extract(text, {k: v for k, v in p.to_dict().items() if v not in (None, [], "")}) or {}
        intent = extra.pop("intent", None)
        for k, v in extra.items():
            if k == "needs":
                found["needs"] = list(dict.fromkeys(found.get("needs", []) + [n for n in v if n in NEEDS]))
            elif k not in found:
                found[k] = v
        if intent in ("price_objection", "locked_in", "mobile_only", "later", "human"):
            found["_intent"] = intent
    changed = merge(p, found)
    session["profile"] = p.to_dict()
    intent = found.get("_intent") or _detect_intent(text)

    # 4. Intents that work at any stage
    if intent == "human":
        lead = _ensure_lead(session, "Customer asked to talk to a person")
        who = "your Accel partner" if session.get("partner_id") else "an Accel Business advisor"
        replies.append(_say(session, "handoff", who=who, sla="30 minutes" if session["lang"] == "en" else "30 मिनट"))
        return _finish(session, replies, _chips(session, "after_rec") if session.get("recommendation") else [], {"handoff": lead["id"]})
    if intent == "later" and session.get("recommendation"):
        valid = (get_settings().reference_date + timedelta(days=7)).isoformat()
        _ensure_lead(session, "Decided to wait", status="nurture")
        replies.append(_say(session, "later", valid=valid))
        return _finish(session, replies, [], {"resume_link": f"/resume/{session['id']}"})

    # 5. After a recommendation: objections, edits, questions
    if session.get("recommendation"):
        rec = session["recommendation"]
        if intent == "price_objection":
            ess = rec["tiers"].get("essential") or rec["tiers"][rec["default_tier"]]
            from ..quote import QuoteRequest, build_quote
            from ..rules import ResolvedLine
            from .recommender import context_for

            q24 = build_quote(QuoteRequest([ResolvedLine(l["product_id"], l["quantity"]) for l in ess["lines"]], context_for(p), 24))
            session["selected_tier"] = "essential" if "essential" in rec["tiers"] else rec["default_tier"]
            _ensure_lead(session, "Price too high", status="open")
            replies.append(_say(session, "objection_price", {ess["monthly_total"], q24["monthly_total"]}, essential=f"{ess['monthly_total']:,}", essential24=f"{q24['monthly_total']:,}"))
            return _finish(session, replies, _chips(session, "after_rec"), {"select_tier": session["selected_tier"]})
        if intent == "locked_in":
            _ensure_lead(session, "Locked in with current provider", status="nurture")
            replies.append(_say(session, "objection_locked"))
            return _finish(session, replies, _chips(session, "after_rec"))
        if intent == "mobile_only":
            replies.append(_say(session, "objection_mobile"))
            return _finish(session, replies, _chips(session, "after_rec"), {"mobile_only": True})
        if intent == "accept":
            session["stage"] = "checkout"
            return _finish(session, replies, [], {"go": "checkout"})
        if changed and not is_question(text):
            return _finish(session, replies, _recommend(session, replies))
        ans = _faq(session, text)
        replies.append(ans)
        return _finish(session, replies, _chips(session, "after_rec"))

    # 6. Discovery
    if not changed and not replies:
        session["fallbacks"] += 1
        if session["fallbacks"] >= 2:
            lead = _ensure_lead(session, "Advisor could not understand the customer")
            replies.append(_say(session, "handoff", who="an Accel Business advisor", sla="30 minutes"))
            return _finish(session, replies, _chips(session, "identity"), {"handoff": lead["id"]})
        replies.append(_say(session, "not_understood"))
        return _finish(session, replies, _chips(session, "identity"))
    session["fallbacks"] = 0
    return _finish(session, replies, _next_question(session, replies))


def _next_question(session: dict, replies: list[str]) -> list[dict]:
    p = Profile.from_dict(session["profile"])
    lang = _tlang(session)
    if not p.segment:
        replies.append(_say(session, "ask_identity"))
        return _chips(session, "identity")
    if not p.city:
        replies.append(_say(session, "ask_city"))
        return []
    if (p.employees is None or p.sites is None) and "scale" not in session["asked"]:
        session["asked"].append("scale")
        replies.append(_say(session, "ask_scale", btype=btype_label(p.business_type, lang), city=p.city))
        return _chips(session, "scale")
    if p.employees is None or p.sites is None:
        emp, sites = DEFAULT_SCALE[p.segment]
        p.employees = p.employees or emp
        p.sites = p.sites or sites
        normalise_segment(p)
        session["profile"] = p.to_dict()
        replies.append(_say(session, "assume_scale", employees=p.employees, sites=p.sites))
    if not p.needs and "needs" not in session["asked"]:
        session["asked"].append("needs")
        replies.append(_say(session, "ask_needs"))
        return _chips(session, "needs")
    return _recommend(session, replies)


def _faq(session: dict, text: str) -> str:
    lang = _tlang(session)
    ds = get_dataset()
    low = text.lower()
    hits = [p for p in ds.products.values() if any(w in low for w in re.findall(r"[a-z0-9]{3,}", p.name.lower()) if w not in ("biz", "business", "cloud", "line"))]
    facts = "\n".join(f"- {p.name}: {p.description}. ₹{p.price_min}-{p.price_max}/{p.unit.replace('per ', '')}/month, setup ₹{p.setup_fee}, install ~{p.install_days} days, {'needs GSTIN' if p.requires_gstin else 'no GSTIN needed'}." for p in (hits or ds.products.values()))
    allowed = {a for p in ds.products.values() for a in (p.price_min, p.price_max, p.setup_fee)}
    if llm.enabled():
        ans = llm.answer(text, facts, session["lang"], allowed)
        if ans:
            return ans
    if hits:
        p = hits[0]
        return f"**{p.name}** — {benefit(p.id, lang)} ₹{p.price_min:,}–{p.price_max:,} {p.unit}/month; setup ₹{p.setup_fee:,}; installed in ~{p.install_days} days."
    return t("faq_none", lang)


def _finish(session: dict, replies: list[str], chips: list[dict], extra: dict | None = None) -> dict:
    for r in replies:
        session["messages"].append({"role": "assistant", "text": r})
    store.put("sessions", session, ref=session.get("partner_id"))
    return _response(session, replies, chips, extra)


def select(session_id: str, tier: str | None = None, term_months: int | None = None) -> dict:
    session = get_session(session_id)
    if session is None:
        raise KeyError(session_id)
    if term_months:
        session["term_months"] = term_months
        _recommend(session, [])
    if tier and tier in (session.get("recommendation") or {}).get("tiers", {}):
        session["selected_tier"] = tier
    store.put("sessions", session, ref=session.get("partner_id"))
    return _response(session, [], [])


def update_profile(session_id: str, updates: dict) -> dict:
    """Owner edits a fact on the profile card (e.g. employees) -> recommendation recomputes."""
    session = get_session(session_id)
    if session is None:
        raise KeyError(session_id)
    p = Profile.from_dict(session["profile"])
    allowed = {"employees", "sites", "city", "business_type", "pincode", "current_spend", "needs"}
    found = {k: v for k, v in updates.items() if k in allowed}
    if "business_type" in found:
        seg = get_dataset().business_segment.get(found["business_type"])
        if seg:
            found["segment"] = seg
    if "needs" in found:
        p.needs = [n for n in found.pop("needs") if n in NEEDS]
    merge(p, found)
    session["profile"] = p.to_dict()
    replies: list[str] = []
    chips = _recommend(session, replies) if session.get("recommendation") else _next_question(session, replies)
    return _finish(session, replies, chips)


def segment_name(code: str | None) -> str | None:
    return SEGMENT_NAMES.get(code or "")

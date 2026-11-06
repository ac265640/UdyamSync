"""Business profile + rule-based understanding of free text (English, Hindi, Hinglish, Marathi).

This runs with no AI at all. When an LLM is configured, its extraction is merged on top, but
this layer always runs first so the advisor works offline and deterministically.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

from ..data import SEGMENT_NAMES, get_dataset

NEEDS = {
    "payments": "UPI / card payments and billing that never stop",
    "whatsapp": "Reach customers on WhatsApp (catalogue, offers, updates)",
    "cctv": "CCTV you can watch on your phone",
    "cloud_email": "Professional email and shared documents",
    "backup": "Automatic backup of important data",
    "security": "Protection from viruses, ransomware and hacking",
    "website": "A website and your own domain",
    "telephony": "Business phone lines with IVR and call recording",
    "tollfree": "A toll-free 1800 number",
    "failover": "Internet that keeps working when the main line goes down",
    "central_mgmt": "Manage all branches' internet centrally",
    "machines": "Monitor machines and energy use",
    "fleet": "Track delivery vehicles",
    "guest_wifi": "Separate Wi-Fi for customers",
    "sms": "SMS alerts and reminders to customers",
    "remote_access": "Remote access / static IP for cameras or servers",
    "fast_internet": "Fast, reliable office internet",
    "mobile": "Mobile lines for staff",
}


@dataclass
class Profile:
    business_name: str | None = None
    business_type: str | None = None
    segment: str | None = None  # micro | prof | multi | mfg
    city: str | None = None
    city_tier: int | None = None
    state: str | None = None
    pincode: str | None = None
    employees: int | None = None
    sites: int | None = None
    gstin_masked: str | None = None
    gstin_status: str = "none"  # active | cancelled | suspended | none | unverified
    gstin_constitution: str | None = None
    udyam_masked: str | None = None
    udyam_type: str | None = None
    current_internet: str | None = None
    current_provider: str | None = None
    current_spend: int | None = None
    current_vendor_count: int | None = None
    needs: list[str] = field(default_factory=list)
    fibre_feasible: bool = True
    source: str = "Website form"
    prefilled_from: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["segment_name"] = SEGMENT_NAMES.get(self.segment or "", None)
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Profile":
        keys = cls.__dataclass_fields__.keys()
        return cls(**{k: v for k, v in d.items() if k in keys})

    def missing(self) -> list[str]:
        out = []
        if not self.segment:
            out.append("business_type")
        if not self.city:
            out.append("city")
        if self.employees is None:
            out.append("employees")
        if self.sites is None:
            out.append("sites")
        return out


# --------------------------------------------------------------------------- vocabularies
# (pattern, business_type, segment). Order matters: specific before generic.
BUSINESS_PATTERNS: list[tuple[str, str, str]] = [
    (r"dental|dentist|दांत|डेंटल|दंत", "Dental clinic", "prof"),
    (r"diagnostic|patholog|\blab\b|लैब|जांच", "Diagnostic lab", "prof"),
    (r"physio|फिजियो", "Physiotherapy clinic", "prof"),
    (r"\bca\b|chartered account|accountant|tax consult|सीए|अकाउंटेंट", "CA firm", "prof"),
    (r"coaching|tuition|classes|institute|academy|कोचिंग|ट्यूशन|क्लासेस", "Coaching centre", "prof"),
    (r"\blaw\b|lawyer|advocate|legal|वकील|लॉ", "Law office", "prof"),
    (r"architect|interior design|आर्किटेक्ट", "Architecture studio", "prof"),
    (r"insurance|बीमा|इंश्योरेंस", "Insurance agency", "prof"),
    (r"real estate|property|broker|प्रॉपर्टी|प्रोपर्टी", "Real estate agency", "prof"),
    (r"travel|tours|ट्रैवल", "Travel agency", "prof"),
    (r"clinic|doctor|hospital|nursing|क्लिनिक|डॉक्टर|दवाखाना|दवाख़ाना|रुग्णालय|दवाखान", "Clinic", "prof"),
    (r"pharmacy chain|chemist chain", "Pharmacy chain", "multi"),
    (r"pharmacy|chemist|medical store|medical shop|dawai|दवा|मेडिकल|फार्मेसी|औषध", "Pharmacy", "micro"),
    (r"kirana|grocery|general store|provision|supermarket|किराना|किराणा|राशन|जनरल स्टोर", "Kirana store", "micro"),
    (r"salon|parlou?r|beauty|\bspa\b|सैलून|पार्लर|ब्यूटी", "Salon", "micro"),
    (r"bakery chain", "Bakery chain", "multi"),
    (r"bakery|bakers|बेकरी", "Bakery", "micro"),
    (r"sweet|mithai|halwai|मिठाई|मिठाइ|हलवाई|मिठाईवाला", "Sweet shop", "micro"),
    (r"boutique|tailor|बुटीक|दर्जी|टेलर", "Boutique", "micro"),
    (r"hardware|हार्डवेयर", "Hardware store", "micro"),
    (r"mobile repair|phone repair|mobile shop|मोबाइल रिपेयर|मोबाइल शॉप|मोबाइल की दुकान", "Mobile repair shop", "micro"),
    (r"optic|spectacle|chashm|चश्म|ऑप्टिकल", "Optician", "micro"),
    (r"stationery|book ?shop|स्टेशनरी", "Stationery shop", "micro"),
    (r"restaurant|cafe|café|dhaba|eatery|food outlet|रेस्टोरेंट|रेस्तरां|ढाबा|कैफे|हॉटेल", "Restaurant", "micro"),
    (r"hotel|guest ?house|lodge|होटल", "Budget hotel group", "multi"),
    (r"gym|fitness|जिम", "Gym chain", "multi"),
    (r"pre-?school|play ?school|kindergarten|प्ले स्कूल", "Pre-school chain", "multi"),
    (r"electronics|इलेक्ट्रॉनिक", "Electronics retail chain", "multi"),
    (r"apparel|garment|clothing|clothes|fashion|कपड़े|कपडे|गारमेंट", "Apparel retail chain", "multi"),
    (r"auto.?parts|automobile parts|ऑटो पार्ट", "Auto-parts unit", "mfg"),
    (r"textile|weaving|loom|spinning|टेक्सटाइल|कपड़ा मिल|पावरलूम", "Textile unit", "mfg"),
    (r"food processing|masala|spices|pickle|namkeen|फूड प्रोसेसिंग|मसाला", "Food processing unit", "mfg"),
    (r"furniture|carpent|फर्नीचर", "Furniture workshop", "mfg"),
    (r"packaging|carton|corrugat|पैकेजिंग", "Packaging unit", "mfg"),
    (r"plastic|moulding|molding|प्लास्टिक", "Plastic moulding unit", "mfg"),
    (r"printing|\bpress\b|छपाई|प्रिंटिंग", "Printing press", "mfg"),
    (r"factory|manufactur|workshop|fabricat|फैक्ट्री|कारखाना|उत्पादन|कारखान", "Manufacturing unit", "mfg"),
    (r"shop|store|dukaan|dukan|दुकान|दुकाऩ", "Retail shop", "micro"),
    (r"office|ऑफिस|दफ्तर|कार्यालय", "Office", "prof"),
]

# Single-site types that become chains when there are several sites.
CHAIN_OF = {
    "Pharmacy": "Pharmacy chain", "Bakery": "Bakery chain", "Restaurant": "Restaurant chain",
    "Boutique": "Apparel retail chain", "Kirana store": "Retail chain", "Retail shop": "Retail chain",
    "Sweet shop": "Retail chain", "Salon": "Salon chain", "Optician": "Retail chain",
    "Mobile repair shop": "Retail chain", "Hardware store": "Retail chain", "Stationery shop": "Retail chain",
}

CITY_ALIASES = {
    "Mumbai": r"mumbai|bombay|मुंबई|मुम्बई", "Delhi": r"delhi|new delhi|दिल्ली", "Pune": r"pune|पुणे",
    "Bengaluru": r"bengaluru|bangalore|बेंगलुरु|बैंगलोर|बंगलौर|बेंगळूरु", "Chennai": r"chennai|madras|चेन्नई",
    "Kolkata": r"kolkata|calcutta|कोलकाता", "Hyderabad": r"hyderabad|हैदराबाद", "Ahmedabad": r"ahmedabad|अहमदाबाद",
    "Jaipur": r"jaipur|जयपुर", "Lucknow": r"lucknow|लखनऊ", "Bhopal": r"bhopal|भोपाल", "Indore": r"indore|इंदौर",
    "Patna": r"patna|पटना", "Nagpur": r"nagpur|नागपुर", "Nashik": r"nashik|nasik|नासिक|नाशिक", "Surat": r"surat|सूरत",
    "Vadodara": r"vadodara|baroda|वडोदरा", "Kochi": r"kochi|cochin|कोच्चि", "Mysuru": r"mysuru|mysore|मैसूर|म्हैसूर",
    "Coimbatore": r"coimbatore|कोयंबटूर", "Visakhapatnam": r"visakhapatnam|vizag|विशाखापत्तनम|विशाखापट्टणम",
    "Ludhiana": r"ludhiana|लुधियाना",
}

NEED_PATTERNS = {
    "payments": r"upi|\bpos\b|billing|payment|card machine|swipe|invoice|paytm|phonepe|qr|भुगतान|पेमेंट|बिलिंग|बिल",
    "whatsapp": r"whats ?app|व्हाट्सएप|व्हॉट्सऍप|catalog",
    "cctv": r"cctv|camera|कैमरा|कॅमेरा|chori|theft|चोरी|surveillance",
    "cloud_email": r"e-?mail|gmail|domain mail|ईमेल|मेल",
    "backup": r"backup|back up|data loss|records|files|बैकअप|रिकॉर्ड",
    "security": r"virus|ransom|hack|antivirus|cyber|malware|वायरस|हैक",
    "website": r"website|web ?site|online presence|google par|वेबसाइट",
    "telephony": r"ivr|call record|phone lines?|landline|reception|calls? aat|कॉल रिकॉर्ड",
    "tollfree": r"toll.?free|1800",
    "failover": r"(internet|net|wifi|line).{0,20}(cut|down|goes|jata|chala|band|slow|drop|गायब|कट|बंद|चला)|backup internet|uptime|failover|नेट चला|नेट कट",
    "central_mgmt": r"central(ly)? manage|all (branches|stores|outlets)|sab branch|सभी ब्रांच|एक जगह से",
    "machines": r"machine|sensor|energy|downtime|मशीन",
    "fleet": r"vehicle|truck|delivery bike|fleet|gps|गाड़ी|गाडी|वाहन",
    "guest_wifi": r"guest|customer wi-?fi|wifi for customers|ग्राहक.{0,10}wi-?fi",
    "sms": r"\bsms\b|reminder|alerts?|एसएमएस",
    "remote_access": r"static ip|remote access|server|स्टैटिक",
    "fast_internet": r"fast internet|speed|video call|zoom|large files|तेज़ इंटरनेट|तेज इंटरनेट",
    "mobile": r"\bsim\b|mobile (plan|line|connection)|postpaid|सिम",
}

INTERNET_PATTERNS = [
    (r"leased line|ill\b|dedicated line", "Leased line"),
    (r"hotspot|mobile data|phone (ka|se) (net|internet)|फोन से|हॉटस्पॉट", "Mobile hotspot"),
    (r"home (broadband|wifi)|ghar ka|घर का", "Home broadband"),
    (r"different (isp|provider)s?|alag alag|mixed", "Mixed per site"),
    (r"broadband|fibre|fiber|wifi|wi-fi|ब्रॉडबैंड|वाईफाई", "Business broadband"),
    (r"no internet|internet nahi|इंटरनेट नहीं", "None"),
]
PROVIDER_PATTERNS = [(r"\bjio\b|जियो", "Competitor A"), (r"\bairtel\b|accel|एयरटेल", "Accel"), (r"bsnl|act fibernet|hathway|local isp|local cable", "Local ISP")]

HINDI_NUMBERS = {
    "ek": 1, "एक": 1, "do": 2, "दो": 2, "teen": 3, "तीन": 3, "char": 4, "chaar": 4, "चार": 4, "paanch": 5, "panch": 5, "पांच": 5, "पाँच": 5,
    "chhe": 6, "che": 6, "छह": 6, "छः": 6, "saat": 7, "सात": 7, "aath": 8, "आठ": 8, "nau": 9, "नौ": 9, "das": 10, "दस": 10,
    "बारह": 12, "pandrah": 15, "पंद्रह": 15, "bees": 20, "बीस": 20, "pachees": 25, "पच्चीस": 25, "tees": 30, "तीस": 30, "pachas": 50, "पचास": 50,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12, "fifteen": 15, "twenty": 20,
}
_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_NUM = r"(\d{1,3})"
EMP_WORDS = r"(?:log|logon|logo|staff|employees?|people|workers?|members?|karmachari|aadmi|team|लोग|कर्मचारी|स्टाफ|आदमी|जण|कामगार)"
SITE_WORDS = r"(?:branch(?:es)?|outlets?|stores?|shops?|sites?|locations?|dukaan|dukan|clinics?|centres?|centers?|offices?|units?|restaurants?|cafes?|pharmacies|salons?|gyms?|hotels?|schools?|pre-?schools?|factories|plants?|showrooms?|godowns?|warehouses?|क्लिनिक|ऑफिस|स्टोर|रेस्टोरेंट|फैक्ट्री|जिम|होटल|स्कूल|शाखा|शाखाएं|ब्रांच|दुकानें|दुकान|आउटलेट|जगह|ठिकाने)"
GSTIN_IN_TEXT = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b", re.I)
UDYAM_IN_TEXT = re.compile(r"\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b", re.I)
PIN_IN_TEXT = re.compile(r"(?<!\d)([1-9]\d{5})(?!\d)")


def normalise(text: str) -> str:
    t = text.translate(_DEVANAGARI_DIGITS).lower()
    for word, n in sorted(HINDI_NUMBERS.items(), key=lambda kv: -len(kv[0])):
        t = re.sub(rf"(?<![\wऀ-ॿ]){re.escape(word)}(?![\wऀ-ॿ])", str(n), t)
    return t


QUESTION = re.compile(r"\?|^(what|how|why|which|can|does|is|do you|kya|kaise|kaun|kitna|क्या|कैसे|कौन|कितना|काय|कसे)\b", re.I)


def is_question(text: str) -> bool:
    return bool(QUESTION.search(text.strip()))


def extract(text: str) -> dict:
    """Pull whatever facts we can from one message. Returns only the fields found."""
    t = normalise(text)
    found: dict = {}
    for pat, btype, seg in BUSINESS_PATTERNS:
        if re.search(pat, t):
            found["business_type"], found["segment"] = btype, seg
            break
    for city, pat in CITY_ALIASES.items():
        if re.search(pat, t):
            found["city"] = city
            break
    m = re.search(rf"{_NUM}\s*(?:\+\s*)?{EMP_WORDS}", t) or re.search(rf"{EMP_WORDS}\s*(?:hai|hain|है|हैं|:)?\s*{_NUM}", t)
    if m:
        found["employees"] = int(next(g for g in m.groups() if g))
    elif re.search(r"just me|only me|akela|akele|अकेला|अकेले|myself only|sirf main|सिर्फ़? मैं|फक्त मी|मी एकटा|मी एकटी", t):
        found["employees"] = 1
    m = re.search(rf"{_NUM}\s*{SITE_WORDS}", t)
    if m:
        found["sites"] = int(m.group(1))
    elif re.search(r"single (shop|location|branch|site)|\b1 hi\b|1 ही", t):
        found["sites"] = 1
    for pat, label in INTERNET_PATTERNS:
        if re.search(pat, t):
            found["current_internet"] = label
            break
    for pat, label in PROVIDER_PATTERNS:
        if re.search(pat, t):
            found["current_provider"] = label
            break
    m = re.search(r"(?:₹|rs\.?|inr|rupees?)\s?(\d[\d,]{2,6})|(\d[\d,]{2,6})\s?(?:₹|rs\.?|rupees?|रुपये|रुपए|/-|per month|a month|mahina|महीना|महिना)", t)
    if m:
        found["current_spend"] = int((m.group(1) or m.group(2)).replace(",", ""))
    needs = [] if is_question(text) else [k for k, pat in NEED_PATTERNS.items() if re.search(pat, t)]
    if needs:
        found["needs"] = needs
    if g := GSTIN_IN_TEXT.search(text):
        found["gstin"] = g.group(0).upper()
    if u := UDYAM_IN_TEXT.search(text):
        found["udyam"] = u.group(0).upper()
    if p := PIN_IN_TEXT.search(t):
        if "gstin" not in found or p.group(1) not in found.get("gstin", ""):
            found["pincode"] = p.group(1)
    return found


def merge(profile: Profile, found: dict) -> list[str]:
    """Apply extracted facts to the profile. Returns the list of fields that changed."""
    ds = get_dataset()
    changed = []
    for key in ("business_type", "segment", "city", "employees", "sites", "current_internet", "current_provider", "current_spend", "pincode"):
        if key in found and found[key] not in (None, "") and getattr(profile, key) != found[key]:
            setattr(profile, key, found[key])
            changed.append(key)
    if found.get("needs"):
        before = set(profile.needs)
        profile.needs = list(dict.fromkeys(profile.needs + list(found["needs"])))
        if set(profile.needs) != before:
            changed.append("needs")
    if profile.city:
        profile.city_tier = ds.city_tier.get(profile.city, profile.city_tier or 2)
        profile.state = ds.city_state.get(profile.city, profile.state)
    normalise_segment(profile)
    return changed


def normalise_segment(profile: Profile) -> None:
    """Multi-site retail/services become 'multi'; known types take their dataset segment."""
    ds = get_dataset()
    if profile.segment == "micro" and profile.employees is not None and profile.sites is None and (profile.employees or 0) <= 5:
        profile.sites = 1  # a micro business with a handful of people is almost always one shop
    if profile.business_type in ds.business_segment:
        profile.segment = ds.business_segment[profile.business_type]
    if profile.sites and profile.sites >= 2 and profile.segment == "micro":
        profile.business_type = CHAIN_OF.get(profile.business_type or "", profile.business_type)
        profile.segment = "multi"
    if profile.current_internet in ("Mixed per site",) and profile.segment == "micro":
        profile.segment = "multi"

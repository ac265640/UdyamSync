# Accel UdyamSync — "Ek Baar Mein Vyapar Digital"

**Master blueprint · scope draft · 6 Nov 2026**
Built for Airtel SYNC 2026 · YTL Hackathon · Enterprise Track A (Project Udyam Digital)

> Status: brainstorm finished, nothing built yet. Coding starts only when the team says go.

---

## 1. The idea in one line

A small business owner goes from "what do I need?" to "my order is placed and verified" in **one ~10-minute sitting on a phone, in their own language**. Local partners and field sales stay in the loop and keep their commission.

**Pitch:** *From 17.6 days and 3 chase calls to a same-day order, with the partner still earning.*

**Design rule:** *the AI talks, the rules engine decides.* The language model handles conversation and explanations. Prices, eligibility and product dependencies always come from deterministic code reading `product_catalogue.csv`. The bot can never invent a price or sell an ineligible product.

**Branding:** the product uses the case's fictional operator, **Accel Business** (Accel UdyamSync, Accel OneBill, Accel Vyapar AI). A subtitle reads "Built for Airtel SYNC 2026 · Enterprise Track A". An optional theme toggle switches to Airtel styling (item 73).

---

## 2. What we must submit (case PDF, page 3)

| # | Deliverable | Limit |
|---|---|---|
| 1 | Working prototype: demo video + code repository | Video ≤ 3 min |
| 2 | Solution architecture diagram | Main components + data flows |
| 3 | Business case, using `Submission Template_Sync.pptx` | ≤ 10 slides: target customer, value, pricing/savings, rollout, risks |
| 4 | Data privacy and security note | 1 page |

Judges also run **15 advisor scenarios live** and check KYC results against a hidden answer key, so the prototype has to work for real.
Still unknown: deadline, submission method, judging weights (check the Unstop page).

---

## 3. Facts from the data we will use (all verified on the provided CSVs)

| Fact | Value | Used for |
|---|---|---|
| Lead → activation | 5,000 → 368 (7.4%) | Baseline |
| Steepest drop | Needs assessed → quote accepted (44%) | Advisor + OneBill |
| Average lead → activation | 17.6 days, ~3 chase calls | Tracker |
| Blended acquisition cost | ~₹15,000 per activated customer | Business case |
| Activation with vs without GSTIN | 9.6% vs 2.0% | GSTIN-first entry |
| Activations violating GSTIN rules (product needs GSTIN; GSTIN blank, cancelled or suspended) | **21** | S2 compliance guard |
| 6-month churn among activated | 56 of 368 = **15.2%**, average NPS 6.86 | Retention story |
| Churn by number of chase calls | 1 call: 5.9% (NPS 7.5) → 5 calls: 27.9% (NPS 6.0) | Tracker → churn link |
| Channel-partner leads | 1,010 (20.2%) | Partner Co-Pilot |
| Applicant K05 | Missing its Udyam certificate (47 of 48 expected images) | KYC completeness check |
| Applicant K04 | GST certificate is a blurry scan | Image quality check |
| Applicant K01 | "Signatory" is an Office admin | Signatory authority check |

**Top drop reasons by stage**

- **Lead:** unreachable 805, not interested 470, wrong number 319
- **Contacted:** no time for a visit 531, locked in with current provider 325, visit not scheduled 296, only wanted a mobile plan 280
- **Needs assessed:** price too high 414, cheaper competitor 207, quote too complex 206, quote too slow 179, decided to wait 107
- **Quote accepted:** missing GST/Udyam 94, paperwork too long 79, signatory unavailable 53, details didn't match 47
- **KYC complete:** install > 21 days 98, cancelled before install 53, fibre not feasible 41, first payment failed 28

**Claims we checked and corrected (do not use)**

- "75% of churners (42) had >14-day installs and 3+ calls." Actual: 32 of 56 (57%).
- "Customers activated in ≤7 days churn <4% with NPS 8.9." Actual: only 1 customer was activated in ≤7 days, and they churned.
- "0 chase calls." Every activated customer made at least 1.
- Projected churn of 3.8% and NPS of 8.8 have no support in the data. The defensible target is the **1-call cohort: about 6% churn, NPS about 7.5**.
- Commission figures such as "₹54,000" or "triples income" are not in the data. Show them only as clearly labelled illustrative examples.

---

## 4. Three headline features

- **S1 — "Replay the Quarter" simulator.** Runs all 5,000 real leads through the new journey. Each feature removes specific drop reasons, and each recovery rate is a slider with its assumption stated openly. The output is a calculated new funnel, acquisition cost and time to activate. It also projects churn and NPS by moving customers toward the 1-call cohort: churn 15.2% → ~6%, NPS 6.9 → ~7.5.
- **S2 — Compliance guard.** The 21 historical activations that broke GSTIN rules are re-run through the rules engine, and it blocks all 21. One slide: *21 violations before → 0 after*.
- **S3 — "My Data" page.** The owner sees what we hold, why, and until when. They can download the data, withdraw consent or erase it. These are DPDP rights shown in the product. The consent-manager rule takes effect on 13 Nov 2026.

---

## 5. Full inventory — 75 items

Priority: **P0** = must have · **P1** = differentiator · **P2** = stretch

### 5.1 Entry and identity (7)
| # | Item | Pri |
|---|---|---|
| 1 | Mobile-first web app (PWA) that works on low-end Android over 3G | P0 |
| 2 | Mobile OTP login (mocked) | P0 |
| 3 | Language switch anytime: AI handles all 10 data languages; quality hand-checked for Hindi, English, Marathi | P0 |
| 4 | Start with GSTIN, Udyam number, or "I don't have one" | P0 |
| 5 | Lead-source tracking from WhatsApp-campaign links and partner QR codes | P1 |
| 6 | "Continue later" magic link sent on WhatsApp (simulated) | P1 |
| 74 | Auto-save every step on the device (IndexedDB), so a dropped connection or reload resumes at the same step | P1 |

### 5.2 AI advisor — Accel Vyapar AI (12)
| # | Item | Pri |
|---|---|---|
| 7 | Discovery in 3 conversational turns: identity → scale → pain points | P0 |
| 8 | Profile pre-filled from GSTIN/Udyam lookup, so fewer questions | P0 |
| 9 | Identifies segment and business type | P0 |
| 10 | Rules engine: city tier, minimum employees/sites, GSTIN requirement, `requires_one_of` dependencies | P0 |
| 11 | Plain-language "why this" for every product, in Hinglish or the regional language | P0 |
| 12 | Good / Better / Best bundle choices | P1 |
| 13 | Voice input and output (browser speech) | P1 |
| 14 | Objection handling mapped to real drop reasons | P1 |
| 15 | Handoff to a human with the full conversation summary | P0 |
| 16 | Guardrails: catalogue-only facts, prompt-injection protection | P0 |
| 17 | Multi-site builder: add sites one by one, feasibility per site, one bill | P1 |
| 18 | Our own ~30-scenario test suite with a visible pass-rate badge (not the judges' private scenarios) | P0 |

### 5.3 Quote and checkout — Accel OneBill (10)
| # | Item | Pri |
|---|---|---|
| 19 | One monthly price; setup fees itemised separately | P0 |
| 20 | Toggle add-ons with live price updates | P0 |
| 21 | Required products added automatically; blocked items explained | P0 |
| 22 | Savings against current spend (`monthly_telecom_spend_inr`): "₹X to 3 vendors → ₹Y, one bill" | P0 |
| 23 | Contract length 6 / 12 / 24 months with discount logic | P1 |
| 24 | Share the quote on WhatsApp or as a 1-page PDF without product codes | P1 |
| 25 | Feasibility check by pincode; fall back to 5G AirFiber (2-day install) where fibre isn't available | P1 |
| 26 | UPI AutoPay mandate (mocked) with retry on failure | P1 |
| 27 | E-sign of the order (mocked) | P1 |
| 28 | 7-day price lock, no surprises on the first bill | P2 |

### 5.4 Smart KYC and anomaly checks (14)
| # | Item | Pri |
|---|---|---|
| 29 | DPDP consent screen: purpose, data collected, retention, how to withdraw | P0 |
| 30 | GSTIN lookup: checksum (accept `X` as the 4th PAN character), status, auto-fill | P0 |
| 31 | Udyam lookup: format, category, business-activity cross-check | P0 |
| 32 | OCR on GST certificate, Udyam certificate, signatory ID, address proof | P0 |
| 33 | Image quality check (blur, glare) with retake prompt — K04 | P0 |
| 34 | Address proof ≤ 90 days old (reference date 2026-07-15) | P0 |
| 35 | Fuzzy name/address matching across documents and registries | P0 |
| 36 | Signatory authority check by role — K01 | P0 |
| 37 | GST status: block cancelled or suspended registrations | P0 |
| 38 | Missing-document check — K05 | P0 |
| 39 | Signatory ID expiry check | P0 |
| 40 | Applicant inspector: pick K01–K12 and watch every check run live | P0 |
| 41 | DigiLocker fetch (mocked); the Aadhaar number is never stored, only a verified yes/no | P1 |
| 42 | Remote e-sign link when the signatory isn't present (53 drops) | P1 |

### 5.5 Privacy and security (7)
| # | Item | Pri |
|---|---|---|
| 43 | Masked identifiers in the app and logs | P0 |
| 44 | Tamper-evident consent ledger and audit trail | P0 |
| 45 | "My Data" page (S3) | P1 |
| 46 | Automatic document purge X days after verification | P1 |
| 47 | Role-based access: partners see only their own leads, with documents masked | P1 |
| 48 | Documents encrypted at rest | P1 |
| 75 | In-app "Privacy & Security" panel showing the 1-page note (same text as deliverable #4) | P1 |

### 5.6 Order tracker — Accel Track (6)
| # | Item | Pri |
|---|---|---|
| 49 | 5-stage progress view: Order confirmed → KYC verified → Feasibility & port reserved → Technician scheduled → Live | P0 |
| 50 | Expected date per product from `typical_install_days` | P0 |
| 51 | Technician card with photo, time slot and phone (mocked) | P1 |
| 52 | Customer can reschedule the installation | P1 |
| 53 | WhatsApp/SMS update at every stage (simulated) | P1 |
| 54 | Early warning to operations before an install passes 21 days | P1 |

### 5.7 WhatsApp mode (2)
| # | Item | Pri |
|---|---|---|
| 55 | WhatsApp-style chat view of the same advisor: quick replies, voice notes | P1 |
| 56 | Phone-call (IVR) style voice flow | P2 |

### 5.8 Partner Co-Pilot (8)
| # | Item | Pri |
|---|---|---|
| 57 | Inbox of leads the advisor couldn't close, each with a summary and stall reason | P0 |
| 58 | Win-back score 0–100 trained on the 5,000 leads, with top factors shown | P1 |
| 59 | One-click next best action ("Send quote with setup fee waived") | P1 |
| 60 | Assisted mode: partner logs in with Partner ID and runs the journey on a tablet | P1 |
| 61 | Commission credit even when the partner's lead completes online | P1 |
| 62 | Lead routing by pincode and segment | P1 |
| 63 | Queue for KYC documents flagged amber or red | P1 |
| 64 | Earnings dashboard and commission calculator (illustrative figures, clearly labelled) | P1 |

### 5.9 Executive dashboard (5)
| # | Item | Pri |
|---|---|---|
| 65 | Live funnel: baseline vs projected | P0 |
| 66 | 5 headline metrics with targets: lead→activation %, days to activate, acquisition cost, 6-month churn, chase calls per customer | P0 |
| 67 | "Replay the Quarter" simulator (S1), including churn and NPS projection | P1 |
| 68 | Compliance report: 21 → 0 (S2) | P1 |
| 69 | Segment opportunity matrix: value × conversion × churn | P1 |

### 5.10 Engineering quality (4)
| # | Item | Pri |
|---|---|---|
| 70 | Plain-form fallback if the AI is down | P1 |
| 71 | One-command Docker run, CI, logs without personal data, rate limiting | P1 |
| 72 | Cost-per-conversation meter (AI ₹ per lead vs ₹15,000 acquisition cost) | P2 |
| 73 | Theme toggle: Accel (case) ↔ Airtel styling | P2 |

**Totals: 75 items · P0 37 · P1 34 · P2 4**

---

## 6. Three-minute demo script

| Time | Scene |
|---|---|
| 0:00–0:30 | The problem in numbers: 7% conversion, 17.6 days, ₹15k per customer |
| 0:30–1:15 | A dentist speaks in Hindi → GSTIN auto-fills the profile → bundle with "why" and savings |
| 1:15–1:45 | OneBill toggles; adding CCTV pulls in broadband automatically; an ineligible product is blocked |
| 1:45–2:15 | KYC: stale bill and unauthorised signer flagged → fixed → verified |
| 2:15–2:35 | Tracker with ETA, then the same journey in WhatsApp view |
| 2:35–3:00 | Partner cockpit → Replay the Quarter (funnel, acquisition cost, churn) → compliance 21 → 0 |

---

## 7. Privacy note — points to cover (deliverable #4)

- **Lawful basis:** consent under the DPDP Act, 2023. Purpose: verifying the business to activate telecom service, as DoT licensing rules require. (Check exact clauses before citing them.)
- **Data minimisation:** collect only what each step needs; Aadhaar numbers are never collected or stored; DigiLocker returns a verified yes/no.
- **Purpose limitation:** KYC data is not reused for marketing without separate consent.
- **Storage limitation:** documents purged a fixed number of days after verification; audit logs kept only for the period regulation requires.
- **Security:** masking in the UI and logs, encryption at rest, role-based access, audit trail.
- **Rights:** "My Data" page for access, correction, withdrawal and erasure, plus a grievance contact.
- **Context:** DPDP Rules notified 13 Nov 2025; consent-manager rule in force 13 Nov 2026; full rollout by about May 2027.
- **Free AI tier:** prompts may be used by the provider, which is acceptable only because all data is synthetic. Production would use a paid, no-training tier.

---

## 8. Cost plan (₹0)

Mock APIs from the CSVs, Tesseract OCR, browser speech, SQLite, GitHub, and free hosting. The AI comes from the Gemini (Google AI Studio) or Groq free tier, swappable with one setting. **No credit card on any service.** API keys go in `.env`, which is never committed.

---

## 9. Open decisions before coding

1. Segment bundles and prices for the 4 segments (lead with Professional offices; Micro retail via WhatsApp).
2. Tech stack.
3. Recovery-rate assumptions for each drop reason in S1.
4. Deadline and submission format (Unstop page).

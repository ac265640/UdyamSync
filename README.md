# Accel UdyamSync — *Ek Baar Mein Vyapar Digital*

> Built for **Airtel SYNC 2026 · YTL Hackathon · Enterprise Track A (Project Udyam Digital)**.
> The case uses a fictional operator, Accel Telecom, and its B2B arm Accel Business. All data is synthetic.

A small business owner goes from *"what do I need?"* to *"my order is verified and scheduled"* in **one ~10-minute sitting on a phone, in their own language**. Local channel partners stay in the loop and keep their commission.

| | Today (case data, Apr–Jun 2026) | Replayed through UdyamSync* |
|---|---|---|
| Lead → activation | 7.36% | 17.78% |
| Days to go live | 17.6 | 8.6 |
| Cost per activation | ₹15,053 | ₹3,964 |
| 6-month churn | 15.2% | 5.9% |
| Activations that broke catalogue rules | 56 of 368 | 0 (blocked by the rules engine) |

\*The same 5,000 leads re-run with conservative, adjustable recovery assumptions. Move the sliders in **Insights**.

## What's in the prototype
- **Vyapar Saathi advisor**
  - 3-turn discovery by text or voice.
  - Hindi, Marathi and English built in and hand-checked; 7 more languages through an optional LLM.
  - A GSTIN or Udyam number pre-fills the profile from the registry.
  - Explainable Essential / Recommended / Pro bundles.
  - Handles objections (price, lock-in, "only a SIM", "later") and hands off to a human with the conversation's context.
- **OneBill:**
  - One monthly price on a ledger-style bill.
  - Add-on toggles, 6/12/24-month terms, dependencies added automatically, blocked items explained.
  - Savings against current spend; share on WhatsApp or as a printable page.
- **Smart KYC:**
  - Consent first.
  - OCR on our own server, with watermark removal, auto-deskew and GSTIN O/0 correction.
  - 20+ checks against the GST and Udyam registries, each failure with a fix.
  - DigiLocker mock with no Aadhaar number stored; documents encrypted and auto-purged.
  - The **KYC Inspector** runs all 12 specimen applicants and catches every planted problem: cancelled GSTIN, blank Udyam number, blur, missing document, GSTIN typo, an edited business name, a stale bill, and a 7° tilt it straightens.
- **Sign & pay:** Aadhaar e-sign mock and a UPI AutoPay mandate (slide to order), with retry if the first payment fails.
- **Tracker:** 5 stages with per-product ETAs, the technician and a reschedule option, WhatsApp updates, and an SLA early warning.
- **WhatsApp view:** the same advisor session inside a WhatsApp-style chat.
- **Partner Co-Pilot:**
  - A win-back inbox: a propensity model (AUC 0.73) times how recoverable the drop reason is.
  - Next best action for each lead.
  - Assisted onboarding mode with illustrative commission.
  - An earnings view and a KYC exception queue.
- **Insights:**
  - Replay the Quarter.
  - A compliance report (56 → 0).
  - A segment matrix: professional offices first, micro-retail at scale.
  - Churn against chase calls.
  - The 30-scenario advisor eval and live telemetry.
- **Privacy:** a hash-chained consent ledger, masking everywhere, and a **My Data** page to view, export, withdraw and erase.

## Run it (₹0, no API keys needed)
```bash
# API (Python 3.11)
cd backend && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000

# Web (Node 22)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
Or with Docker: `docker compose up --build`, then open http://localhost:8080.

Optional AI: copy `.env.example` to `.env`, then set `LLM_PROVIDER=gemini` and a free Google AI Studio key (no card needed). Without a key, the advisor runs fully offline on rules and templates.

Tests: `cd backend && .venv/bin/python -m pytest -q`. There are 63 tests: the 30 advisor scenarios, all 12 KYC specimens, end-to-end order flow, consent tamper detection, encryption and erasure.

## Repository
| Path | What |
|---|---|
| `backend/app/advisor` | NLU, recommender, multilingual templates, LLM guardrails, conversation, eval scenarios |
| `backend/app/rules.py`, `quote.py` | Catalogue rules engine and OneBill pricing |
| `backend/app/kyc` | OCR pipeline, validation checks, consent ledger, KYC service |
| `backend/app/orders.py`, `partner.py`, `analytics.py` | Tracker, propensity model and win-back, Replay and compliance |
| `frontend/src` | React + Vite app; `landing/` (GSAP + Lenis story), `journey/` (owner app), `pages/` |
| `docs/` | [Architecture](docs/ARCHITECTURE.md) · [Privacy note](docs/PRIVACY_NOTE.md) · [Design brief](docs/DESIGN.md) · [Blueprint](docs/BLUEPRINT.md) |
| `data/` | The case's synthetic dataset |

## Credits
- Text and micro-interaction components (ScrollReveal, SplitFlapText, SlideCommit) adapted from [React Bits](https://reactbits.dev) under its MIT + Commons Clause licence.
- Motion: [GSAP](https://gsap.com) and [Lenis](https://lenis.darkroom.engineering).
- Type: Fraunces, Onest, Tiro Devanagari Hindi, Mukta (SIL OFL).
- Design principles from taste-skill and impeccable.

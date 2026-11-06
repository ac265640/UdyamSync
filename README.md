# Accel UdyamSync — *Ek Baar Mein Vyapar Digital*

> Built for **Airtel SYNC 2026 · YTL Hackathon · Enterprise Track A (Project Udyam Digital)**.
> The case uses a fictional operator, Accel Telecom, and its B2B arm Accel Business. All data is synthetic.

A small business owner goes from *"what do I need?"* to *"my order is verified and scheduled"* in **one ~10-minute sitting on a phone, in their own language** — while local channel partners and field sales stay in the loop and keep their commission.

**From 17.6 days and 3 chase calls → a same-day order.**

🚧 Work in progress — built step by step. See [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) for the full plan.

## Repository layout

| Path | What |
|---|---|
| `backend/` | FastAPI service: rules engine, mock registries, advisor, quote, KYC, tracker, partner and analytics APIs |
| `frontend/` | React + Vite mobile-first web app (owner, WhatsApp view, partner cockpit, executive dashboard) |
| `data/` | Synthetic case dataset (catalogue, 5,000 leads, mock GSTIN/Udyam registries, KYC specimens) |
| `docs/` | Blueprint, architecture, privacy note |

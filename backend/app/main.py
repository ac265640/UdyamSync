"""Accel UdyamSync API."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .data import get_dataset
from .privacy import install_log_redaction
from .routers import advisor, catalogue, quote, registry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
install_log_redaction()

settings = get_settings()
app = FastAPI(title="Accel UdyamSync API", version="1.0.0", description="Digital-first MSME onboarding: advisor, OneBill quote, Smart KYC, tracker, partner co-pilot.")
app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_methods=["*"], allow_headers=["*"])

for r in (catalogue.router, registry.router, advisor.router, quote.router):
    app.include_router(r)


@app.on_event("startup")
def _warm() -> None:
    get_dataset()


@app.get("/api/health")
def health() -> dict:
    ds = get_dataset()
    return {
        "status": "ok",
        "products": len(ds.products),
        "leads": len(ds.leads),
        "llm_provider": settings.llm_provider if settings.llm_enabled else "none (offline rules + templates)",
        "reference_date": settings.reference_date.isoformat(),
    }

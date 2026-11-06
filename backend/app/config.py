"""Runtime settings, read once from environment variables (and an optional .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"


def _load_dotenv() -> None:
    """Minimal .env loader so we don't need python-dotenv. Existing env vars win."""
    for candidate in (ROOT / ".env", BACKEND_DIR / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    var_dir: Path
    llm_provider: str
    gemini_api_key: str
    gemini_model: str
    groq_api_key: str
    groq_model: str
    app_secret: str
    doc_retention_days: int
    reference_date: date
    cors_origins: tuple[str, ...]

    @property
    def llm_enabled(self) -> bool:
        if self.llm_provider == "gemini":
            return bool(self.gemini_api_key)
        if self.llm_provider == "groq":
            return bool(self.groq_api_key)
        return False


@lru_cache
def get_settings() -> Settings:
    _load_dotenv()
    var_dir = Path(os.getenv("VAR_DIR", BACKEND_DIR / "var"))
    var_dir.mkdir(parents=True, exist_ok=True)
    return Settings(
        data_dir=Path(os.getenv("DATA_DIR", ROOT / "data")),
        var_dir=var_dir,
        llm_provider=os.getenv("LLM_PROVIDER", "none").lower(),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        app_secret=os.getenv("APP_SECRET", "dev-secret-change-me"),
        doc_retention_days=int(os.getenv("DOC_RETENTION_DAYS", "30")),
        reference_date=date.fromisoformat(os.getenv("REFERENCE_DATE", "2026-07-15")),
        cors_origins=tuple(
            o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()
        ),
    )

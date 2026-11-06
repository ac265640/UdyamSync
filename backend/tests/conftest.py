import os
import tempfile

os.environ.setdefault("VAR_DIR", tempfile.mkdtemp(prefix="udyamsync-test-"))
os.environ.setdefault("LLM_PROVIDER", "none")
os.environ.setdefault("DISABLE_BACKGROUND", "1")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

from app.data import get_dataset
from app.registry import gstin_checksum, lookup_gstin, validate_gstin_format, validate_udyam_format


def test_every_registry_gstin_passes_format_and_checksum():
    ds = get_dataset()
    bad = [g for g in ds.gstin.index if not validate_gstin_format(g).valid]
    assert bad == []


def test_checksum_catches_typo():
    g = get_dataset().gstin.index[0]
    typo = g[:14] + ("A" if g[14] != "A" else "B")
    assert not validate_gstin_format(typo).valid
    assert gstin_checksum(g[:14]) == g[14]


def test_every_registry_udyam_passes_format():
    ds = get_dataset()
    assert [u for u in ds.udyam.index if not validate_udyam_format(u).valid] == []


def test_lookup_masks_and_flags_status(client):
    ds = get_dataset()
    cancelled = ds.gstin[ds.gstin.status == "Cancelled"].index[0]
    r = client.get(f"/api/registry/gstin/{cancelled}").json()
    assert r["found"] and r["status"] == "Cancelled" and not r["is_active"]
    assert "•" in r["gstin"]  # never returned raw


def test_lookup_bad_format(client):
    r = client.get("/api/registry/gstin/12345").json()
    assert r["format_valid"] is False and not r["found"]

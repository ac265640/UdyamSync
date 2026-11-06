import pytest

from app.advisor.scenarios import S, run_one


@pytest.mark.parametrize("sid,lang,msgs,exp", S, ids=[s[0] for s in S])
def test_scenario(sid, lang, msgs, exp):
    r = run_one(sid, lang, msgs, exp)
    assert r["passed"], r["failures"]


def test_raw_gstin_never_stored_in_clear(client):
    from app import store
    g = "32TTNXB7384T1ZW"
    s = client.post("/api/advisor/sessions", json={"lang": "en"}).json()
    client.post(f"/api/advisor/sessions/{s['session_id']}/messages", json={"text": g})
    raw = store.conn().execute("SELECT body FROM sessions WHERE id=?", (s["session_id"],)).fetchone()[0]
    assert g not in raw


def test_quote_toggle_reprices(client):
    s = client.post("/api/advisor/sessions", json={"lang": "en"}).json()
    client.post(f"/api/advisor/sessions/{s['session_id']}/messages", json={"text": "salon in Pune, 3 people, 1 shop"})
    q1 = client.post("/api/quote", json={"session_id": s["session_id"], "lines": [{"product_id": "P01"}], "term_months": 12}).json()
    q2 = client.post("/api/quote", json={"session_id": s["session_id"], "lines": [{"product_id": "P01"}, {"product_id": "P23", "quantity": 2}], "term_months": 12}).json()
    assert q2["monthly_total"] > q1["monthly_total"]
    q24 = client.post("/api/quote", json={"session_id": s["session_id"], "lines": [{"product_id": "P01"}], "term_months": 24}).json()
    assert q24["monthly_total"] <= q1["monthly_total"]

"""End-to-end: advisor -> quote -> consent -> KYC -> order -> tracker, plus partner + analytics."""


def _journey(client, applicant="K03", partner_id=None, pay_fail=False):
    s = client.post("/api/advisor/sessions", json={"lang": "en", "channel": "partner" if partner_id else "web", "partner_id": partner_id}).json()["session_id"]
    client.post(f"/api/advisor/sessions/{s}/messages", json={"text": "27XUIXG0767D1ZP"})
    client.post(f"/api/advisor/sessions/{s}/messages", json={"text": "12 workers, 1 workshop"})
    r = client.post(f"/api/advisor/sessions/{s}/messages", json={"text": "need:none"}).json()
    assert r["recommendation"]
    client.post(f"/api/kyc/{s}/consent", json={"purposes": {"kyc_verification": True, "service_updates": True}})
    case = client.post(f"/api/kyc/{s}/use-sample/{applicant}").json()
    return s, case, client.post("/api/orders", json={"session_id": s, "simulate_payment_failure": pay_fail})


def test_full_journey_to_live(client):
    s, case, r = _journey(client)
    assert case["result"]["verdict"] == "verified"
    o = r.json()
    assert r.status_code == 200 and o["status"] == "confirmed" and o["notifications"][0]["channel"] == "whatsapp"
    for _ in range(4):
        o = client.post(f"/api/orders/{o['id']}/advance").json()
    assert o["status"] == "live" and o["progress"] == 1.0


def test_order_blocked_when_kyc_fails(client):
    s, case, r = _journey(client, applicant="K11")
    assert case["result"]["verdict"] == "action_needed"
    assert r.status_code == 400


def test_payment_retry(client):
    s, case, r = _journey(client, pay_fail=True)
    o = r.json()
    assert o["payment"]["status"] == "failed"
    o = client.post(f"/api/orders/{o['id']}/retry-payment").json()
    assert o["payment"]["status"] == "mandate_active" and o["status"] == "confirmed"


def test_partner_assisted_commission(client):
    s, case, r = _journey(client, partner_id="P-PUN-007")
    assert r.json()["commission_illustrative"] > 0
    e = client.get("/api/partner/P-PUN-007/earnings").json()
    assert e["assisted_checkouts"] >= 1 and e["commission_total_illustrative"] > 0


def test_partner_inbox_scores(client):
    r = client.get("/api/partner/inbox?limit=10").json()
    assert r["model"]["auc"] > 0.65
    scores = [x["score"] for x in r["historical"]]
    assert scores == sorted(scores, reverse=True) and all(0 <= x <= 100 for x in scores)
    assert r["historical"][0]["factors"]


def test_analytics(client):
    b = client.get("/api/analytics/baseline").json()
    assert b["leads"] == 5000 and b["activations"] == 368 and b["cac_per_activation"] == 15053
    c = client.get("/api/analytics/compliance").json()
    assert c["by_rule"]["GSTIN_REQUIRED"] == 21 and c["after"] == 0
    r = client.post("/api/analytics/replay", json={}).json()
    assert r["after"]["activations"] > r["before"]["activations"]
    zero = client.post("/api/analytics/replay", json={"recovery": {k: 0 for k in [d["reason"] for d in b["drops"]]}}).json()
    assert zero["after"]["activations"] == 368  # no recovery -> exactly the baseline

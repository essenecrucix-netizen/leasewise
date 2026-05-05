"""
Rater endpoint test (paste mode + structured mode) via TestClient.

In the sandbox (no ANTHROPIC_API_KEY) the extraction service falls back
to its regex parser, so these tests are deterministic. On the dev VM
where the key is set, the real Claude path runs — that's verified
manually by Erik through the SSH tunnel.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


SAMPLE_BMW_X3 = """2026 BMW X3 xDrive30i
MSRP: $62,400
Freight & PDI: $2,480
Selling Price: $58,900
Term: 39 months
Money Factor: 0.00166 (3.99% APR)
Residual: 59% ($36,816)
KM/yr: 16,000
Province: Alberta
Loyalty: $1,500
Monthly Payment (taxed): $698"""


def test_paste_mode_bmw_x3_returns_200() -> None:
    r = client.post("/api/v1/rater/score", json={"worksheet_text": SAMPLE_BMW_X3})
    assert r.status_code == 200


def test_paste_mode_response_shape() -> None:
    r = client.post("/api/v1/rater/score", json={"worksheet_text": SAMPLE_BMW_X3})
    body = r.json()
    assert "extracted" in body
    assert "grade" in body
    assert "percentile" in body
    assert body["percentile"] is None  # Phase 1.3: insufficient_data
    assert body["confidence_band"] == "insufficient_data"
    assert body["sample_size"] == 0
    assert body["markup"] is not None
    assert "captive_apr" in body["markup"]
    assert "quoted_apr" in body["markup"]
    assert "markup_bps" in body["markup"]
    assert isinstance(body["feedback"], list)
    assert len(body["feedback"]) >= 3


def test_extracted_carries_audit_trail() -> None:
    r = client.post("/api/v1/rater/score", json={"worksheet_text": SAMPLE_BMW_X3})
    e = r.json()["extracted"]
    # Both APR and MF surface; rate_quoted_as flags the dealer's convention.
    assert e["rate_quoted_as"] == "money_factor"
    assert e["money_factor"] == "0.00166"
    assert e["apr"] == "3.984"
    assert e["province_code"] == "AB"


def test_structured_mode_returns_200() -> None:
    r = client.post(
        "/api/v1/rater/score",
        json={
            "structured": {
                "vehicle":          "2026 BMW X3 xDrive30i",
                "msrp":             "62400",
                "freight_pdi":      "2480",
                "cap_cost":         "58900",
                "residual_percent": "0.59",
                "rate_quoted_as":   "apr",
                "rate_value":       "3.99",
                "term_months":      39,
                "annual_km":        16000,
                "province_code":    "AB",
            }
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["confidence_band"] == "insufficient_data"
    assert body["markup"] is not None


def test_validation_errors_when_no_input() -> None:
    r = client.post("/api/v1/rater/score", json={})
    # Typed ValidationError from app/core/exceptions.py → 400
    assert r.status_code == 400


def test_validation_errors_when_both_inputs() -> None:
    r = client.post(
        "/api/v1/rater/score",
        json={
            "worksheet_text": "x",
            "structured":     {"msrp": "60000"},
        },
    )
    assert r.status_code == 400

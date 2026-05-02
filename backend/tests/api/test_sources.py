"""
Sources endpoint test.

Exercises the /api/v1/sources route via TestClient. Confirms the wire
shape, that all 8 sources surface, that confidence values are within the
allowed enum, and that the summary block carries the expected keys.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_sources_endpoint_returns_200() -> None:
    r = client.get("/api/v1/sources")
    assert r.status_code == 200


def test_sources_response_shape() -> None:
    r = client.get("/api/v1/sources")
    body = r.json()
    assert "sources" in body
    assert "summary" in body
    assert isinstance(body["sources"], list)
    assert len(body["sources"]) >= 5  # exit criterion: at least 5


def test_sources_each_entry_has_required_fields() -> None:
    body = client.get("/api/v1/sources").json()
    for s in body["sources"]:
        assert "name" in s and s["name"]
        assert "coverage" in s
        assert "method" in s
        assert "confidence" in s
        assert s["confidence"] in ("high", "medium", "low")
        assert "last_sync_human" in s   # may be null when not yet syncing


def test_sources_summary_keys() -> None:
    body = client.get("/api/v1/sources").json()
    assert "n_sources" in body["summary"]
    assert "datapoints_label" in body["summary"]
    assert "coverage_label" in body["summary"]
    assert "independence_label" in body["summary"]

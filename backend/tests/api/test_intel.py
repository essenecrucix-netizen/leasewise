"""
Intel endpoint tests via TestClient.

The conftest's empty-DB session override means these endpoints return
their pending / zero-state shapes — which is exactly what we want to
verify here. Real-data verification happens on the dev VM after the
crawler has populated market_deals + lh_knowledge_chunks.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_recent_deals_returns_200_empty() -> None:
    r = client.get("/api/v1/intel/recent-deals")
    assert r.status_code == 200
    body = r.json()
    assert "deals" in body
    assert "count" in body
    assert body["count"] == 0


def test_recent_deals_respects_limit_param() -> None:
    r = client.get("/api/v1/intel/recent-deals?limit=5")
    assert r.status_code == 200


def test_recent_deals_rejects_invalid_limit() -> None:
    r = client.get("/api/v1/intel/recent-deals?limit=999")
    assert r.status_code == 422


def test_recent_programs_returns_200_empty() -> None:
    r = client.get("/api/v1/intel/recent-programs")
    assert r.status_code == 200
    body = r.json()
    assert "programs" in body
    assert "count" in body
    assert body["count"] == 0


def test_weekly_summary_returns_200_pending() -> None:
    r = client.get("/api/v1/intel/weekly-summary")
    assert r.status_code == 200
    body = r.json()
    assert body["deals_count"] == 0
    assert body["deals_canadian"] == 0
    assert body["knowledge_chunks"] == 0
    assert body["knowledge_synthesized"] == 0
    assert body["status"] == "pending"
    assert body["last_crawl_at"] is None
    assert body["last_synthesis_at"] is None
    assert isinstance(body["pipeline_outcomes"], list)

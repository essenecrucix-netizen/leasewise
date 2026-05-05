"""
Brand-page endpoint tests via TestClient.

The autouse session override in conftest.py supplies an empty DB. Most
of these tests verify the empty-DB shape — 404 when no brand_metadata
row exists. Populated-DB behaviour is verified manually on the dev VM
after `python ../scripts/seed_bmw_programs.py` runs (and via the
helper-function tests below, which exercise the rate-conversion
shoulders without hitting the DB).
"""

from __future__ import annotations

from decimal import Decimal

from fastapi.testclient import TestClient

from app.api.v1.brands import _month_key, _to_apr, _to_residual_pct
from app.main import app


client = TestClient(app)


# ── 404 path: no brand_metadata row → 404 (the gate for the endpoint) ──

def test_brand_page_returns_404_when_metadata_missing() -> None:
    r = client.get("/api/v1/brands/bmw")
    assert r.status_code == 404
    assert "bmw" in r.json()["detail"]


def test_brand_page_lowercases_brand_path_param() -> None:
    """'BMW' and 'bmw' should be the same lookup. Empty DB still 404s,
    but the path-param normalisation should be visible in the message."""
    r = client.get("/api/v1/brands/BMW")
    assert r.status_code == 404
    assert "bmw" in r.json()["detail"]


def test_brand_page_unknown_brand_returns_404() -> None:
    r = client.get("/api/v1/brands/not-a-real-brand")
    assert r.status_code == 404


# ── Helper-function tests (no DB) ──────────────────────────────────────

def test_to_apr_converts_db_decimal_to_human_percent() -> None:
    """0.0149 (DB) → 1.49 (display). 0.0299 → 2.99."""
    assert _to_apr(Decimal("0.0149")) == Decimal("1.49")
    assert _to_apr(Decimal("0.0299")) == Decimal("2.99")
    assert _to_apr(Decimal("0.0050")) == Decimal("0.50")


def test_to_apr_handles_none() -> None:
    assert _to_apr(None) == Decimal("0")


def test_to_residual_pct_converts_db_decimal_to_human_percent() -> None:
    assert _to_residual_pct(Decimal("0.5400")) == Decimal("54.00")
    assert _to_residual_pct(Decimal("0.4800")) == Decimal("48.00")


def test_to_residual_pct_passes_none_through() -> None:
    assert _to_residual_pct(None) is None


def test_month_key_formats_yyyy_mm() -> None:
    from datetime import date

    assert _month_key(date(2026, 5, 1)) == "2026-05"
    assert _month_key(date(2026, 12, 31)) == "2026-12"

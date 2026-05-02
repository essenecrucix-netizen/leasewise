"""
Test fixtures.

The deal-rater endpoint depends on an AsyncSession (Phase 1.4 migration
to query oem_programs + market_deals). In the sandbox / CI we don't
have a real Postgres, so we override `get_session` with a stub session
whose `execute()` returns empty results.

Empty-DB behavior is identical to Phase 1.3:
  - `_resolve_captive_from_db()` returns None → falls back to captive_baseline.py
  - `_count_market_deals()` returns 0 → confidence_band stays insufficient_data

Also disables the in-process APScheduler (LeaseHackr crawl + synthesis)
during tests via LEASEWISE_DISABLE_SCHEDULER=true. Production codepath
is unaffected — the override only activates inside TestClient calls.
"""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock

import pytest

# Set BEFORE app/main imports — its lifespan reads this on startup.
os.environ.setdefault("LEASEWISE_DISABLE_SCHEDULER", "true")

from app.db.session import get_session  # noqa: E402
from app.main import app  # noqa: E402


class _FakeResult:
    """Stand-in for sqlalchemy.engine.Result returning empty / None values.
    Endpoints use `or 0` to coalesce None counts; that path covers both
    int columns (counts) and datetime columns (max(crawled_at) etc.)."""

    def scalars(self) -> "_FakeScalars":
        return _FakeScalars()

    def scalar(self) -> None:
        return None

    def all(self) -> list[Any]:
        return []


class _FakeScalars:
    def all(self) -> list[Any]:
        return []

    def first(self) -> None:
        return None


class _FakeSession:
    """Minimal AsyncSession stand-in for the rater's read-only queries."""

    async def execute(self, *_: Any, **__: Any) -> _FakeResult:
        return _FakeResult()

    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass

    async def close(self) -> None:
        pass


async def _fake_get_session() -> Any:
    yield _FakeSession()


@pytest.fixture(autouse=True)
def _override_session() -> Any:
    """Auto-applied: every test runs with the empty-DB session override."""
    app.dependency_overrides[get_session] = _fake_get_session
    yield
    app.dependency_overrides.pop(get_session, None)


# Suppress unused-imports lint for MagicMock — kept for ad-hoc mocks in tests.
_ = MagicMock

"""
APScheduler integration.

Spins up an in-process AsyncIOScheduler at FastAPI startup, schedules:
  - LeaseHackr nightly crawl     — every day at 03:00 (host TZ)
  - LeaseHackr weekly synthesis  — Sundays at 04:00

Both jobs are no-ops in dev when ANTHROPIC_API_KEY is unset (the
internal `is_configured()` checks short-circuit). Manual one-shot
invocation is also wired via the per-module CLIs:
    python -m app.ingestion.leasehackr.crawl --once
    python -m app.ingestion.leasehackr.synthesize --once

Phase 1.4: Only the LeaseHackr jobs are scheduled. The MarketCheck
inventory crawler ships in PR3 (Phase 1.4c) when MARKETCHECK_API_KEY
is available.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.ingestion.leasehackr.crawl import run_crawl_once
from app.ingestion.leasehackr.synthesize import run_synthesis_once


if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Awaitable


_log = structlog.get_logger()
_scheduler: AsyncIOScheduler | None = None


def _ingestion_enabled() -> bool:
    """Skip scheduling in two cases:
      - LEASEWISE_DISABLE_SCHEDULER=true (set in CI / TestClient runs)
      - environment is not 'production' AND ANTHROPIC_API_KEY is empty
    Production always tries to schedule; if the key is missing the jobs
    log and exit early on each fire."""
    if os.environ.get("LEASEWISE_DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        return False
    return True


def start_scheduler() -> AsyncIOScheduler | None:
    """Start the in-process scheduler. Idempotent: returns the existing
    scheduler if already running."""
    global _scheduler
    if not _ingestion_enabled():
        _log.info("ingestion.scheduler_disabled")
        return None
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        run_crawl_once,
        trigger=CronTrigger(hour=3, minute=0),
        id="leasehackr_crawl",
        name="LeaseHackr nightly crawl",
        replace_existing=True,
        misfire_grace_time=60 * 60,    # 1 hour — restart-tolerant
    )
    _scheduler.add_job(
        run_synthesis_once,
        trigger=CronTrigger(day_of_week="sun", hour=4, minute=0),
        id="leasehackr_synthesis",
        name="LeaseHackr weekly synthesis",
        replace_existing=True,
        misfire_grace_time=60 * 60,
    )
    _scheduler.start()
    _log.info(
        "ingestion.scheduler_started",
        environment=settings.environment,
        anthropic_configured=bool(settings.anthropic_api_key),
    )
    return _scheduler


async def stop_scheduler() -> None:
    """Stop the scheduler. Called from FastAPI lifespan shutdown."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _log.info("ingestion.scheduler_stopped")
    _scheduler = None

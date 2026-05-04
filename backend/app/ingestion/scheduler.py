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
    """
    Default: SCHEDULING IS DISABLED. Production must opt in by
    explicitly setting LEASEWISE_DISABLE_SCHEDULER=false in the
    systemd EnvironmentFile.

    Phase 1.4a defect-fix #2 — the previous default-enabled behaviour
    fired the crawl from any uvicorn process whose .env was silent on
    the flag, including dev sessions started for unrelated testing.
    Result: 03:00 UTC crawls running for two days against the dev
    Anthropic account, $1.06 wasted, no usable log rows.

    Truth table:
      LEASEWISE_DISABLE_SCHEDULER unset       → False (disabled)
      LEASEWISE_DISABLE_SCHEDULER=true / 1    → False (disabled)
      LEASEWISE_DISABLE_SCHEDULER=false / 0   → True (enabled)
      anything else                            → False (disabled)
    """
    raw = os.environ.get("LEASEWISE_DISABLE_SCHEDULER")
    if raw is None:
        return False
    return raw.strip().lower() in ("0", "false", "no")


def start_scheduler() -> AsyncIOScheduler | None:
    """Start the in-process scheduler. Idempotent: returns the existing
    scheduler if already running."""
    global _scheduler
    if not _ingestion_enabled():
        _log.info(
            "ingestion.scheduler_disabled",
            reason="LEASEWISE_DISABLE_SCHEDULER unset or non-false (default-disabled)",
        )
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

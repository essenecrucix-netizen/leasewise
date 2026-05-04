"""
LeaseHackr nightly crawler.

Pulls new topics from three Discourse categories (Signed Deals,
Ask the Hackrs, Wiki), extracts structured facts via Claude Haiku, and
writes:
  - deal posts → market_deals (Canadian only; non-Canadian skipped + logged)
  - knowledge posts → lh_knowledge_chunks
  - every topic touched → lh_crawl_log (idempotency + observability)

Design promises (CLAUDE.md "never" rule #4 + lh_function_app.py):
  - Original post text is NEVER stored. Only structured extracted facts.
  - Idempotent: a topic_id present in lh_crawl_log is never re-processed.
  - Polite: CRAWL_DELAY_SEC seconds between every Discourse request.
  - Cost-aware: Haiku for per-post extraction; weekly Sonnet synthesis
    happens in synthesize.py.

Phase 1.4a defect-fix structure (revised after the May 3-4 silent-fail
incident):

  1. The outer loop body for each topic always writes an 'in_progress'
     row in lh_crawl_log BEFORE doing any API / DB work. If the loop
     is killed mid-topic, that row stays in_progress and is visible
     on the next manual inspection.
  2. Each `_process_*` function returns `(outcome, error_message)` —
     it does NOT call _log_outcome itself. This collapses the failure
     surface to a single place.
  3. The final outcome is upserted via `_record_outcome_safely` —
     never raises. If both the original write and the rollback-retry
     write fail, the failure is logged via structlog but the topic
     loop continues. Worst case the row stays in_progress and is
     diagnosable post-hoc.

Manual one-shot:
    cd backend && source .venv/bin/activate
    python -m app.ingestion.leasehackr.crawl --once

Scheduled invocation: APScheduler in app/main.py lifespan triggers
`run_crawl_once()` nightly at 03:00. Production opts in by setting
LEASEWISE_DISABLE_SCHEDULER=false in the systemd EnvironmentFile;
dev defaults to disabled.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError
from app.db.session import get_session_factory
from app.models.deal import MarketDeal
from app.models.leasehackr import LhCrawlLog, LhKnowledgeChunk
from app.services.ai import claude_client, prompts
from app.ingestion.leasehackr.discourse import (
    CATEGORIES,
    CRAWL_DELAY_SEC,
    MAX_TOPICS_PER_RUN,
    Category,
    DiscourseClient,
    first_post_text,
)


_log = structlog.get_logger()


# Outcomes recorded in lh_crawl_log.outcome — must match the values
# enumerated in lh_schema_additions.sql (extended in Phase 1.4a).
OUTCOME_IN_PROGRESS       = "in_progress"
OUTCOME_DEAL_STORED       = "deal_stored"
OUTCOME_KNOWLEDGE_STORED  = "knowledge_stored"
OUTCOME_NOT_A_DEAL        = "not_a_deal"
OUTCOME_NO_KNOWLEDGE      = "no_knowledge"
OUTCOME_NON_CANADIAN      = "non_canadian"
OUTCOME_SKIPPED_PINNED    = "skipped_pinned"
OUTCOME_SKIPPED_SHORT     = "skipped_short"
OUTCOME_FETCH_FAILED      = "fetch_failed"
OUTCOME_EXTRACTION_FAILED = "extraction_failed"
OUTCOME_DB_ERROR          = "db_error"


CANADIAN_PROVINCES: frozenset[str] = frozenset({
    "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
})


# ── Public entry points ─────────────────────────────────────────────────

async def run_crawl_once() -> dict[str, int]:
    """One pass of the crawler. Returns counters for logging / monitoring."""
    if not claude_client.is_configured():
        _log.warning("leasehackr.crawl_skipped_no_anthropic_key")
        return {"topics_processed": 0, "deals_stored": 0, "knowledge_stored": 0, "skipped": 0}

    counters: dict[str, int] = {
        "topics_processed": 0,
        "deals_stored":     0,
        "knowledge_stored": 0,
        "skipped":          0,
    }
    factory = get_session_factory()
    async with factory() as session:
        crawled_ids = await _get_crawled_topic_ids(session)
        async with DiscourseClient() as lh:
            for cat in CATEGORIES:
                if counters["topics_processed"] >= MAX_TOPICS_PER_RUN:
                    break
                _log.info("leasehackr.category_start", category=cat.name, mode=cat.mode)
                await _crawl_category(session, lh, cat, crawled_ids, counters)

    _log.info("leasehackr.crawl_complete", **counters)
    return counters


# ── Category loop ───────────────────────────────────────────────────────

async def _crawl_category(
    session:     AsyncSession,
    lh:          DiscourseClient,
    cat:         Category,
    crawled_ids: set[int],
    counters:    dict[str, int],
) -> None:
    page = 0
    while counters["topics_processed"] < MAX_TOPICS_PER_RUN:
        topic_list = await lh.get_topic_list(cat.id, page)
        topics = topic_list.get("topic_list", {}).get("topics", [])
        if not topics:
            break

        new_topics = [t for t in topics if t["id"] not in crawled_ids]
        if not new_topics:
            _log.info("leasehackr.category_caught_up", category=cat.slug, page=page)
            break

        for topic in new_topics:
            if counters["topics_processed"] >= MAX_TOPICS_PER_RUN:
                break
            await _handle_topic(session, lh, cat, topic, crawled_ids, counters)

        page += 1
        await asyncio.sleep(CRAWL_DELAY_SEC)


async def _handle_topic(
    session:     AsyncSession,
    lh:          DiscourseClient,
    cat:         Category,
    topic:       dict[str, Any],
    crawled_ids: set[int],
    counters:    dict[str, int],
) -> None:
    """
    Handle one topic. Always emits an outcome row (or upgrades the
    in_progress row to a final outcome). Never raises — failures are
    captured as outcomes.
    """
    topic_id: int = topic["id"]

    # 1. Pre-write 'in_progress'. If we crash before completing, the row
    #    stays in_progress and is visible on the next manual inspection.
    await _record_outcome_safely(
        session, topic_id, cat.slug, OUTCOME_IN_PROGRESS,
        error_message=None,
    )

    # 2. Pinned admin/meta topics (very few replies) — record + return.
    if topic.get("pinned") and topic.get("posts_count", 0) < 3:
        await _record_outcome_safely(session, topic_id, cat.slug, OUTCOME_SKIPPED_PINNED, None)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    # 3. Polite delay, then fetch the topic body.
    await asyncio.sleep(CRAWL_DELAY_SEC)

    try:
        topic_data = await lh.get_topic(topic_id)
    except Exception as e:  # noqa: BLE001
        await _record_outcome_safely(
            session, topic_id, cat.slug, OUTCOME_FETCH_FAILED, _trim(str(e)),
        )
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    if not topic_data:
        await _record_outcome_safely(
            session, topic_id, cat.slug, OUTCOME_FETCH_FAILED,
            "Discourse returned empty body",
        )
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    post_text = first_post_text(topic_data)
    if len(post_text) < 50:
        await _record_outcome_safely(session, topic_id, cat.slug, OUTCOME_SKIPPED_SHORT, None)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    counters["topics_processed"] += 1

    # 4. Branch by category mode. Each branch RETURNS an outcome —
    #    it does not call _record_outcome_safely itself.
    if cat.mode == "deals":
        outcome, err = await _process_deal(session, topic, post_text)
        if outcome == OUTCOME_DEAL_STORED:
            counters["deals_stored"] += 1
        else:
            counters["skipped"] += 1
    else:
        outcome, err = await _process_knowledge(session, topic, post_text)
        if outcome == OUTCOME_KNOWLEDGE_STORED:
            counters["knowledge_stored"] += 1
        else:
            counters["skipped"] += 1

    await _record_outcome_safely(session, topic_id, cat.slug, outcome, err)
    crawled_ids.add(topic_id)


# ── Deal post processing ────────────────────────────────────────────────

async def _process_deal(
    session:   AsyncSession,
    topic:     dict[str, Any],
    post_text: str,
) -> tuple[str, str | None]:
    """Returns (outcome, error_message). Never raises."""
    topic_id = topic["id"]
    try:
        facts = await claude_client.extract_json(
            prompt=prompts.LH_DEAL_EXTRACTION_PROMPT,
            user_input=f"Title: {topic.get('title', '')}\n\nPost:\n{post_text}",
        )
    except ExternalServiceError as e:
        _log.warning("leasehackr.deal_extract_failed", topic_id=topic_id, error=str(e))
        return OUTCOME_EXTRACTION_FAILED, _trim(str(e))
    except Exception as e:  # noqa: BLE001
        _log.warning("leasehackr.deal_extract_unhandled", topic_id=topic_id, error=str(e))
        return OUTCOME_EXTRACTION_FAILED, _trim(str(e))

    if not facts.get("is_deal_post"):
        return OUTCOME_NOT_A_DEAL, None

    province = facts.get("province_code")
    province = province.upper() if isinstance(province, str) else None
    if not province or province not in CANADIAN_PROVINCES:
        return OUTCOME_NON_CANADIAN, None

    try:
        await _store_deal(session, topic, facts, province)
        await session.commit()
        _log.info(
            "leasehackr.deal_stored",
            topic_id=topic_id,
            title=(topic.get("title") or "")[:80],
            province=province,
        )
        return OUTCOME_DEAL_STORED, None
    except Exception as e:  # noqa: BLE001
        await session.rollback()
        _log.warning("leasehackr.deal_store_failed", topic_id=topic_id, error=str(e))
        return OUTCOME_DB_ERROR, _trim(str(e))


async def _store_deal(
    session:  AsyncSession,
    topic:    dict[str, Any],
    facts:    dict[str, Any],
    province: str,
) -> None:
    # Convert MF to lease-rate-percent if only MF given
    lease_rate = _opt_decimal(facts.get("lease_rate_percent"))
    mf = _opt_decimal(facts.get("money_factor"))
    if lease_rate is None and mf is not None:
        lease_rate = (mf * Decimal("2400")).quantize(Decimal("0.0001"))
    # Schema stores rate as decimal fraction (0.0149 = 1.49%). LH posts
    # give the percent (3.99); convert to fraction.
    if lease_rate is not None and lease_rate > Decimal("1"):
        lease_rate = lease_rate / Decimal("100")

    # Convert miles to km if needed
    km_annual = facts.get("km_or_miles_annual")
    if km_annual is not None:
        try:
            km_annual_int = int(km_annual)
            if facts.get("is_miles"):
                km_annual_int = int(round(km_annual_int * 1.60934))
            km_annual = km_annual_int
        except (TypeError, ValueError):
            km_annual = None

    deal_month = _parse_deal_month(facts.get("deal_date"), topic.get("created_at"))

    residual = _opt_decimal(facts.get("residual_percent"))
    if residual is not None and residual > Decimal("1"):
        residual = residual / Decimal("100")

    notes_text = "; ".join(
        [
            "source=leasehackr",
            f"topic_id={topic.get('id')}",
            f"title={(topic.get('title') or '')[:200]}",
            f"lender={facts.get('lender') or ''}",
            f"tactics={','.join(facts.get('key_tactics', []))[:200]}",
        ]
    )

    deal = MarketDeal(
        make_name=str(facts.get("make") or "Unknown"),
        model_name=str(facts.get("model") or "Unknown"),
        trim_name=facts.get("trim"),
        model_year=int(facts.get("vehicle_year") or 0) or 1900,
        province_code=province,
        msrp=_opt_decimal(facts.get("msrp")),
        cap_cost=_opt_decimal(facts.get("selling_price")),
        down_payment=_opt_decimal(facts.get("down_payment")) or Decimal("0"),
        cash_incentives_applied=_opt_decimal(facts.get("cash_incentives")) or Decimal("0"),
        term_months=_opt_int(facts.get("term_months")),
        km_allowance_annual=km_annual,
        lease_rate_percent=lease_rate,
        residual_percent=residual,
        monthly_payment_total=_opt_decimal(facts.get("monthly_payment_total")),
        deal_month=deal_month,
        was_month_end=_opt_bool(facts.get("was_month_end")),
        source="leasehackr",
        source_listing_id=str(topic.get("id")),
        quality_score=3,           # community-reported, unverified worksheet
        notes=notes_text,
        created_at=datetime.now(UTC),
    )
    session.add(deal)
    await session.flush()


# ── Knowledge post processing ───────────────────────────────────────────

async def _process_knowledge(
    session:   AsyncSession,
    topic:     dict[str, Any],
    post_text: str,
) -> tuple[str, str | None]:
    """Returns (outcome, error_message). Never raises."""
    topic_id = topic["id"]
    try:
        knowledge = await claude_client.extract_json(
            prompt=prompts.LH_KNOWLEDGE_EXTRACTION_PROMPT,
            user_input=f"Title: {topic.get('title', '')}\n\nText:\n{post_text}",
        )
    except ExternalServiceError as e:
        _log.warning("leasehackr.knowledge_extract_failed", topic_id=topic_id, error=str(e))
        return OUTCOME_EXTRACTION_FAILED, _trim(str(e))
    except Exception as e:  # noqa: BLE001
        _log.warning("leasehackr.knowledge_extract_unhandled", topic_id=topic_id, error=str(e))
        return OUTCOME_EXTRACTION_FAILED, _trim(str(e))

    if not knowledge.get("has_useful_knowledge"):
        return OUTCOME_NO_KNOWLEDGE, None

    try:
        await _store_knowledge_chunk(session, topic, knowledge)
        await session.commit()
        _log.info(
            "leasehackr.knowledge_stored",
            topic_id=topic_id,
            title=(topic.get("title") or "")[:80],
            confidence=knowledge.get("confidence"),
        )
        return OUTCOME_KNOWLEDGE_STORED, None
    except Exception as e:  # noqa: BLE001
        await session.rollback()
        _log.warning("leasehackr.knowledge_store_failed", topic_id=topic_id, error=str(e))
        return OUTCOME_DB_ERROR, _trim(str(e))


async def _store_knowledge_chunk(
    session:   AsyncSession,
    topic:     dict[str, Any],
    knowledge: dict[str, Any],
) -> None:
    created_at = _parse_iso8601(topic.get("created_at"))
    chunk = LhKnowledgeChunk(
        source_topic_id=int(topic.get("id") or 0),
        source_topic_title=(topic.get("title") or "")[:500],
        source_created_at=created_at,
        makes_mentioned=[m for m in (knowledge.get("makes_mentioned") or []) if isinstance(m, str)],
        topics=[t for t in (knowledge.get("topics") or []) if isinstance(t, str)],
        key_insights=[i for i in (knowledge.get("key_insights") or []) if isinstance(i, str)],
        applies_to_canada=knowledge.get("applies_to_canada"),
        confidence=knowledge.get("confidence"),
        source_tags=[t["name"] for t in topic.get("tags", []) if isinstance(t, dict) and "name" in t],
        created_at=datetime.now(UTC),
    )
    session.add(chunk)
    await session.flush()


# ── Crawl-log helpers ───────────────────────────────────────────────────

async def _get_crawled_topic_ids(session: AsyncSession) -> set[int]:
    """Pre-load the set of FINAL-outcome topic_ids we've already
    processed. Topics still in_progress are NOT excluded — the next
    crawl re-processes them so we recover from interrupted runs.

    Bounded by the table size: a year of nightly crawls at 200/run
    is ~73k rows, fits comfortably in memory.
    """
    result = await session.execute(
        select(LhCrawlLog.topic_id).where(LhCrawlLog.outcome != OUTCOME_IN_PROGRESS)
    )
    return {row[0] for row in result.all()}


async def _record_outcome_safely(
    session:       AsyncSession,
    topic_id:      int,
    category:      str,
    outcome:       str,
    error_message: str | None,
) -> None:
    """
    Bulletproof outcome write. Upserts the row in lh_crawl_log so
    'in_progress' rows can be promoted to a final outcome.

    Never raises. If the original write fails, rollback + retry once.
    If the retry also fails, log via structlog and return — the row
    stays at its previous value (in_progress, or unset). Worst case:
    the topic is re-attempted on the next crawl (which is correct
    behaviour for an interrupted/failed write).
    """
    try:
        await _upsert_outcome(session, topic_id, category, outcome, error_message)
        await session.commit()
        return
    except Exception as e1:  # noqa: BLE001
        try:
            await session.rollback()
            await _upsert_outcome(session, topic_id, category, outcome, error_message)
            await session.commit()
            return
        except Exception as e2:  # noqa: BLE001
            _log.error(
                "leasehackr.outcome_write_failed",
                topic_id=topic_id,
                outcome=outcome,
                first_error=str(e1),
                retry_error=str(e2),
            )


async def _upsert_outcome(
    session:       AsyncSession,
    topic_id:      int,
    category:      str,
    outcome:       str,
    error_message: str | None,
) -> None:
    """ON CONFLICT (topic_id) DO UPDATE — promote in_progress to final."""
    stmt = pg_insert(LhCrawlLog).values(
        topic_id=topic_id,
        category=category,
        outcome=outcome,
        error_message=error_message,
        crawled_at=datetime.now(UTC),
    ).on_conflict_do_update(
        index_elements=["topic_id"],
        set_={
            "outcome":       outcome,
            "error_message": error_message,
            "crawled_at":    datetime.now(UTC),
            "category":      category,
        },
    )
    await session.execute(stmt)


# ── Type coercion helpers ───────────────────────────────────────────────

def _opt_decimal(v: Any) -> Decimal | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return Decimal(str(v))
    if isinstance(v, str):
        cleaned = v.replace(",", "").replace("$", "").replace("%", "").strip()
        if not cleaned:
            return None
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return None
    return None


def _opt_int(v: Any) -> int | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        try:
            return int(v.replace(",", "").strip())
        except ValueError:
            return None
    return None


def _opt_bool(v: Any) -> bool | None:
    if isinstance(v, bool):
        return v
    return None


def _parse_iso8601(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _parse_deal_month(deal_date: Any, fallback_iso: Any) -> date | None:
    """Stored as YYYY-MM-01 for monthly aggregation."""
    if isinstance(deal_date, str) and len(deal_date) >= 7:
        try:
            year, month = deal_date[:4], deal_date[5:7]
            return date(int(year), int(month), 1)
        except ValueError:
            pass
    fallback = _parse_iso8601(fallback_iso)
    if fallback:
        return date(fallback.year, fallback.month, 1)
    return None


# Cap error_message length so a giant traceback doesn't blow up the row.
def _trim(s: str, *, limit: int = 1000) -> str:
    s = s.strip()
    return s if len(s) <= limit else s[: limit - 3] + "..."


# ── CLI ─────────────────────────────────────────────────────────────────

def _main() -> None:
    parser = argparse.ArgumentParser(description="LeaseHackr nightly crawl (one-shot).")
    parser.add_argument("--once", action="store_true", help="Run a single crawl pass and exit.")
    args = parser.parse_args()
    if not args.once:
        parser.error("Pass --once for the manual one-shot path.")

    from app.core.logging import configure_logging
    configure_logging()

    counters = asyncio.run(run_crawl_once())
    print(f"OK leasehackr crawl complete: {counters}")


if __name__ == "__main__":
    _main()

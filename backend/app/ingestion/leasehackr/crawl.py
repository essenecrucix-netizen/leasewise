"""
LeaseHackr nightly crawler.

Pulls new topics from three Discourse categories (Signed Deals,
Ask the Hackrs, Wiki), extracts structured facts via Claude Haiku, and
writes:
  - deal posts → market_deals (Canadian only; non-Canadian skipped + logged)
  - knowledge posts → lh_knowledge_chunks
  - every topic touched → lh_crawl_log (idempotency)

Design promises (per CLAUDE.md "never" rule #4 + lh_function_app.py):
  - Original post text is NEVER stored. Only structured extracted facts.
  - Idempotent: a topic_id present in lh_crawl_log is never re-processed.
  - Polite: CRAWL_DELAY_SEC seconds between every Discourse request.
  - Cost-aware: Haiku for per-post extraction; weekly Sonnet synthesis
    happens in synthesize.py.

Manual one-shot invocation (for verification or backfill):
    cd backend && source .venv/bin/activate
    python -m app.ingestion.leasehackr.crawl --once

Scheduled invocation: APScheduler in app/main.py lifespan triggers
`run_crawl_once()` nightly at 03:00.
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
# enumerated in lh_schema_additions.sql.
OUTCOME_DEAL_STORED       = "deal_stored"
OUTCOME_KNOWLEDGE_STORED  = "knowledge_stored"
OUTCOME_NOT_A_DEAL        = "not_a_deal"
OUTCOME_NO_KNOWLEDGE      = "no_knowledge"
OUTCOME_NON_CANADIAN      = "non_canadian"
OUTCOME_SKIPPED_PINNED    = "skipped_pinned"
OUTCOME_SKIPPED_SHORT     = "skipped_short"
OUTCOME_FETCH_FAILED      = "fetch_failed"
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
            await _process_topic(session, lh, cat, topic, crawled_ids, counters)

        page += 1
        await asyncio.sleep(CRAWL_DELAY_SEC)


async def _process_topic(
    session:     AsyncSession,
    lh:          DiscourseClient,
    cat:         Category,
    topic:       dict[str, Any],
    crawled_ids: set[int],
    counters:    dict[str, int],
) -> None:
    topic_id: int = topic["id"]

    # Skip pinned admin/meta topics with very few replies — usually
    # category housekeeping, not lease content.
    if topic.get("pinned") and topic.get("posts_count", 0) < 3:
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_SKIPPED_PINNED)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    await asyncio.sleep(CRAWL_DELAY_SEC)
    topic_data = await lh.get_topic(topic_id)
    if not topic_data:
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_FETCH_FAILED)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    post_text = first_post_text(topic_data)
    if len(post_text) < 50:
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_SKIPPED_SHORT)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    counters["topics_processed"] += 1

    if cat.mode == "deals":
        await _process_deal(session, cat, topic, post_text, crawled_ids, counters)
    else:
        await _process_knowledge(session, cat, topic, post_text, crawled_ids, counters)


# ── Deal post processing ────────────────────────────────────────────────

async def _process_deal(
    session:     AsyncSession,
    cat:         Category,
    topic:       dict[str, Any],
    post_text:   str,
    crawled_ids: set[int],
    counters:    dict[str, int],
) -> None:
    topic_id = topic["id"]
    try:
        facts = await claude_client.extract_json(
            prompt=prompts.LH_DEAL_EXTRACTION_PROMPT,
            user_input=f"Title: {topic.get('title', '')}\n\nPost:\n{post_text}",
        )
    except ExternalServiceError as e:
        _log.warning("leasehackr.deal_extract_failed", topic_id=topic_id, error=str(e))
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_FETCH_FAILED)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    if not facts.get("is_deal_post"):
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_NOT_A_DEAL)
        crawled_ids.add(topic_id)
        return

    province = facts.get("province_code")
    province = province.upper() if isinstance(province, str) else None
    if not province or province not in CANADIAN_PROVINCES:
        # US deal or geography-unknown — record and skip per Phase 1.4
        # contract: "skip and log non-Canadian; don't try to be clever
        # about edge cases."
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_NON_CANADIAN)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    try:
        await _store_deal(session, topic, facts, province)
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_DEAL_STORED)
        await session.commit()
        crawled_ids.add(topic_id)
        counters["deals_stored"] += 1
        _log.info(
            "leasehackr.deal_stored",
            topic_id=topic_id,
            title=topic.get("title", "")[:80],
            province=province,
        )
    except Exception as e:  # noqa: BLE001 — record failure, continue
        await session.rollback()
        _log.warning("leasehackr.deal_store_failed", topic_id=topic_id, error=str(e))
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_DB_ERROR)
        await session.commit()
        crawled_ids.add(topic_id)
        counters["skipped"] += 1


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
    # Schema stores rate as decimal (0.0149 = 1.49%). LH posts give the
    # percent (3.99); convert to fraction.
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
            f"source=leasehackr",
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
    session:     AsyncSession,
    cat:         Category,
    topic:       dict[str, Any],
    post_text:   str,
    crawled_ids: set[int],
    counters:    dict[str, int],
) -> None:
    topic_id = topic["id"]
    try:
        knowledge = await claude_client.extract_json(
            prompt=prompts.LH_KNOWLEDGE_EXTRACTION_PROMPT,
            user_input=f"Title: {topic.get('title', '')}\n\nText:\n{post_text}",
        )
    except ExternalServiceError as e:
        _log.warning("leasehackr.knowledge_extract_failed", topic_id=topic_id, error=str(e))
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_FETCH_FAILED)
        crawled_ids.add(topic_id)
        counters["skipped"] += 1
        return

    if not knowledge.get("has_useful_knowledge"):
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_NO_KNOWLEDGE)
        crawled_ids.add(topic_id)
        return

    try:
        await _store_knowledge_chunk(session, topic, knowledge)
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_KNOWLEDGE_STORED)
        await session.commit()
        crawled_ids.add(topic_id)
        counters["knowledge_stored"] += 1
        _log.info(
            "leasehackr.knowledge_stored",
            topic_id=topic_id,
            title=topic.get("title", "")[:80],
            confidence=knowledge.get("confidence"),
        )
    except Exception as e:  # noqa: BLE001
        await session.rollback()
        _log.warning("leasehackr.knowledge_store_failed", topic_id=topic_id, error=str(e))
        await _log_outcome(session, topic_id, cat.slug, OUTCOME_DB_ERROR)
        await session.commit()
        crawled_ids.add(topic_id)
        counters["skipped"] += 1


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
    # ON CONFLICT DO NOTHING via the source_topic_id unique constraint:
    # if we somehow re-process the same topic, swallow the duplicate.
    session.add(chunk)
    try:
        await session.flush()
    except Exception:
        await session.rollback()
        # Re-record the outcome silently — caller will retry the commit.
        raise


# ── Crawl-log helpers ───────────────────────────────────────────────────

async def _get_crawled_topic_ids(session: AsyncSession) -> set[int]:
    """Pre-load the set of topic_ids we've already processed. Bounded
    by the table size — for a year of nightly crawls at 200/run, that's
    ~73k rows, comfortable to hold in memory."""
    result = await session.execute(select(LhCrawlLog.topic_id))
    return {row[0] for row in result.all()}


async def _log_outcome(session: AsyncSession, topic_id: int, category: str, outcome: str) -> None:
    """Idempotent insert into lh_crawl_log. ON CONFLICT DO NOTHING via
    the topic_id PK."""
    stmt = pg_insert(LhCrawlLog).values(
        topic_id=topic_id,
        category=category,
        outcome=outcome,
        crawled_at=datetime.now(UTC),
    ).on_conflict_do_nothing(index_elements=["topic_id"])
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

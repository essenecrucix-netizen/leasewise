"""
Market intelligence endpoints.

Surfaces what the LeaseHackr crawler / Sonnet synthesis / oem_programs
have populated. Phase 1.4: rows return from real DB queries (graceful
empty state when ingestion hasn't happened yet). PR2 (Phase 1.4b) wires
these into the homepage.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.deal import MarketDeal
from app.models.leasehackr import LhCrawlLog, LhKnowledgeChunk
from app.models.program import OemProgram
from app.schemas.intel import (
    IngestionOutcome,
    RecentDeal,
    RecentDealsResponse,
    RecentProgram,
    RecentProgramsResponse,
    WeeklySummaryResponse,
)


router = APIRouter()


# ── Recent deals ────────────────────────────────────────────────────────

@router.get("/recent-deals", response_model=RecentDealsResponse)
async def recent_deals(
    limit: int = Query(default=12, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> RecentDealsResponse:
    """Most-recent deals from market_deals (ordered by created_at desc)."""
    stmt = (
        select(MarketDeal)
        .order_by(MarketDeal.created_at.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    deals = [
        RecentDeal(
            deal_id=row.deal_id,
            make_name=row.make_name,
            model_name=row.model_name,
            trim_name=row.trim_name,
            model_year=row.model_year,
            province_code=row.province_code,
            msrp=row.msrp,
            cap_cost=row.cap_cost,
            monthly_payment_total=row.monthly_payment_total,
            term_months=row.term_months,
            lease_rate_percent=row.lease_rate_percent,
            residual_percent=row.residual_percent,
            deal_month=row.deal_month,
            quality_score=row.quality_score,
            source=row.source,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return RecentDealsResponse(deals=deals, count=len(deals))


# ── Recent programs ─────────────────────────────────────────────────────

@router.get("/recent-programs", response_model=RecentProgramsResponse)
async def recent_programs(
    limit: int = Query(default=12, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> RecentProgramsResponse:
    """Currently-active OEM programs (newest captured first)."""
    stmt = (
        select(OemProgram)
        .where(OemProgram.is_current.is_(True))
        .order_by(OemProgram.captured_at.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    programs = [
        RecentProgram(
            program_id=row.program_id,
            make_name=row.make_name,
            model_name=row.model_name,
            trim_name=row.trim_name,
            province_code=row.province_code,
            term_months=row.term_months,
            km_allowance_annual=row.km_allowance_annual,
            lease_rate_percent=row.lease_rate_percent,
            residual_percent=row.residual_percent,
            program_start_date=row.program_start_date,
            program_end_date=row.program_end_date,
            captured_at=row.captured_at,
        )
        for row in rows
    ]
    return RecentProgramsResponse(programs=programs, count=len(programs))


# ── Weekly summary (homepage live strip) ────────────────────────────────

@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
async def weekly_summary(
    session: AsyncSession = Depends(get_session),
) -> WeeklySummaryResponse:
    """Summary stats for the homepage live strip + sources page."""
    deals_count   = int((await session.execute(select(func.count(MarketDeal.deal_id)))).scalar() or 0)
    deals_can     = int((await session.execute(
        select(func.count(MarketDeal.deal_id)).where(MarketDeal.province_code.isnot(None))
    )).scalar() or 0)
    chunks_count  = int((await session.execute(select(func.count(LhKnowledgeChunk.chunk_id)))).scalar() or 0)
    synthesized   = int((await session.execute(
        select(func.count(LhKnowledgeChunk.chunk_id)).where(LhKnowledgeChunk.synthesized_at.isnot(None))
    )).scalar() or 0)

    last_crawl = (await session.execute(select(func.max(LhCrawlLog.crawled_at)))).scalar()
    last_syn   = (await session.execute(select(func.max(LhKnowledgeChunk.synthesized_at)))).scalar()

    outcomes_stmt = (
        select(
            LhCrawlLog.outcome,
            func.count(LhCrawlLog.topic_id),
            func.max(LhCrawlLog.crawled_at),
        )
        .group_by(LhCrawlLog.outcome)
        .order_by(func.count(LhCrawlLog.topic_id).desc())
    )
    outcomes = [
        IngestionOutcome(outcome=outcome, topic_count=int(n), last_seen=last)
        for outcome, n, last in (await session.execute(outcomes_stmt)).all()
    ]

    status = "live" if last_crawl else "pending"

    return WeeklySummaryResponse(
        deals_count=deals_count,
        deals_canadian=deals_can,
        knowledge_chunks=chunks_count,
        knowledge_synthesized=synthesized,
        last_crawl_at=last_crawl,
        last_synthesis_at=last_syn,
        pipeline_outcomes=outcomes,
        status=status,
    )

"""
Brand-page endpoint (Phase 1.4b).

`GET /api/v1/brands/{brand}` returns the eight-section payload that
backs the marketing brand pages (BMW, Mercedes, etc.). Reads from:

  - brand_metadata           (captive lender, negotiation, F&I)
  - oem_programs             (current month + 12-month archive)
  - market_deals             (percentile benchmarks per model/trim)
  - lh_knowledge_chunks      (BMW-tagged community threads)

Rates are stored on disk as DECIMAL(6,4) (0.0149 = 1.49%) and converted
to human APR on the way out (× 100). Make-name matching is
case-insensitive throughout — extractors return mixed casing ("BMW",
"bmw") and we don't want a stray miscapitalisation to drop a deal.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import String, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.brand_metadata import BrandMetadata
from app.models.deal import MarketDeal
from app.models.leasehackr import LhKnowledgeChunk
from app.models.program import OemProgram
from app.schemas.brands import (
    ArchivedMonthPrograms,
    BrandPageResponse,
    BrandProgram,
    CaptiveLender,
    CommunityDiscussion,
    CurrentMonthPrograms,
    DealBenchmarks,
    HistoricalPrograms,
    ModelBenchmark,
    MonthlyAggregate,
    Percentiles,
    ProgramIncentive,
)


router = APIRouter()


# ── Constants ───────────────────────────────────────────────────────────

# Phase 1.4b ships with seeded data through May 2026. We anchor "current
# month" to the most-recent program_start_date present for the brand
# rather than today's date — that way the endpoint stays useful even
# when a calendar month rolls over before fresh data is seeded.
ARCHIVE_LOOKBACK_MONTHS = 12

# Minimum samples needed before a percentile bucket is reported. Fewer
# than 3 deals isn't a "benchmark" — surfacing it would be misleading.
MIN_DEALS_FOR_PERCENTILE = 3


# ── Helpers ─────────────────────────────────────────────────────────────

def _to_apr(rate_decimal: Decimal | None) -> Decimal:
    """0.0149 → 1.49.  Returns 0 for None to keep the wire shape clean."""
    if rate_decimal is None:
        return Decimal("0")
    return (rate_decimal * 100).quantize(Decimal("0.01"))


def _to_residual_pct(residual_decimal: Decimal | None) -> Decimal | None:
    """0.5400 → 54.00.  None passes through."""
    if residual_decimal is None:
        return None
    return (residual_decimal * 100).quantize(Decimal("0.01"))


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _program_to_schema(row: OemProgram) -> BrandProgram:
    incentives: list[ProgramIncentive] = []
    if row.cash_incentive and row.cash_incentive > 0:
        incentives.append(ProgramIncentive(
            type="cash",
            amount=row.cash_incentive,
            description="Lease cash",
        ))
    if row.loyalty_cash and row.loyalty_cash > 0:
        incentives.append(ProgramIncentive(
            type="loyalty",
            amount=row.loyalty_cash,
            description="Loyalty bonus",
        ))
    if row.conquest_cash and row.conquest_cash > 0:
        incentives.append(ProgramIncentive(
            type="conquest",
            amount=row.conquest_cash,
            description="Conquest bonus",
        ))
    return BrandProgram(
        model_name=row.model_name,
        trim_name=row.trim_name,
        province_code=row.province_code,
        term_months=row.term_months,
        annual_km=row.km_allowance_annual,
        rate_apr=_to_apr(row.lease_rate_percent),
        residual_percent=_to_residual_pct(row.residual_percent),
        incentives=incentives,
    )


# ── Endpoint ────────────────────────────────────────────────────────────

@router.get("/{brand}", response_model=BrandPageResponse)
async def brand_page(
    brand: str,
    session: AsyncSession = Depends(get_session),
) -> BrandPageResponse:
    """Eight-section payload for the brand page. Returns 404 if the
    brand has no brand_metadata row — that's the single source of truth
    for "is this a brand we know about." Programs / deals / community
    sections can each be empty; we surface graceful empties, not 404s,
    when the data layer hasn't been populated yet."""

    brand_lower = brand.strip().lower()

    # ── 1) brand_metadata (also gates the whole endpoint) ───────────────
    md_stmt = select(BrandMetadata).where(BrandMetadata.brand == brand_lower)
    metadata = (await session.execute(md_stmt)).scalars().first()
    if metadata is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No brand metadata for {brand_lower!r}.",
        )

    # The make_name in oem_programs / market_deals is denormalised display
    # casing ("BMW") — match it case-insensitively against the lowercased
    # path param so 'bmw' and 'BMW' and 'Bmw' all work.
    make_filter = func.lower(OemProgram.make_name) == brand_lower

    # ── 2 + 8) current month programs + archive ─────────────────────────
    # Anchor "current month" to the latest program_start_date present for
    # this brand (graceful empty if no rows).
    latest_start_stmt = (
        select(func.max(OemProgram.program_start_date))
        .where(make_filter)
    )
    latest_start: date | None = (await session.execute(latest_start_stmt)).scalar()

    current_programs: list[BrandProgram] = []
    archive_buckets: dict[date, list[BrandProgram]] = defaultdict(list)
    historical_rows: list[OemProgram] = []

    if latest_start is not None:
        cutoff = latest_start - timedelta(days=31 * ARCHIVE_LOOKBACK_MONTHS)
        archive_stmt = (
            select(OemProgram)
            .where(and_(make_filter, OemProgram.program_start_date >= cutoff))
            .order_by(OemProgram.program_start_date.desc())
        )
        historical_rows = list((await session.execute(archive_stmt)).scalars().all())
        for row in historical_rows:
            schema = _program_to_schema(row)
            archive_buckets[row.program_start_date].append(schema)
            if row.program_start_date == latest_start:
                current_programs.append(schema)

    current_month_payload = CurrentMonthPrograms(
        month=_month_key(latest_start) if latest_start else "",
        programs=current_programs,
    )

    archive_payload = [
        ArchivedMonthPrograms(month=_month_key(d), programs=programs)
        for d, programs in sorted(archive_buckets.items(), reverse=True)
    ]

    # ── 3) historical aggregates: avg rate + avg residual per month ─────
    monthly_stats: dict[date, dict[str, Decimal | int]] = defaultdict(
        lambda: {"rate_sum": Decimal("0"), "residual_sum": Decimal("0"), "n": 0, "rn": 0}
    )
    for row in historical_rows:
        bucket = monthly_stats[row.program_start_date]
        bucket["rate_sum"] += row.lease_rate_percent
        bucket["n"] += 1
        if row.residual_percent is not None:
            bucket["residual_sum"] += row.residual_percent
            bucket["rn"] += 1

    months_sorted = sorted(monthly_stats.keys())
    rate_trend = [
        MonthlyAggregate(
            month=_month_key(d),
            avg_rate_apr=_to_apr(monthly_stats[d]["rate_sum"] / monthly_stats[d]["n"])
            if monthly_stats[d]["n"] else None,
            program_count=monthly_stats[d]["n"],
        )
        for d in months_sorted
    ]
    residual_trend = [
        MonthlyAggregate(
            month=_month_key(d),
            avg_residual=_to_residual_pct(monthly_stats[d]["residual_sum"] / monthly_stats[d]["rn"])
            if monthly_stats[d]["rn"] else None,
            program_count=monthly_stats[d]["n"],
        )
        for d in months_sorted
    ]
    historical_payload = HistoricalPrograms(
        months=[_month_key(d) for d in months_sorted],
        rate_trend=rate_trend,
        residual_trend=residual_trend,
    )

    # ── 5) deal_benchmarks: percentiles per model/trim ──────────────────
    pct_25 = func.percentile_cont(0.25).within_group(MarketDeal.monthly_payment_total)
    pct_50 = func.percentile_cont(0.50).within_group(MarketDeal.monthly_payment_total)
    pct_75 = func.percentile_cont(0.75).within_group(MarketDeal.monthly_payment_total)

    benchmarks_stmt = (
        select(
            MarketDeal.model_name,
            MarketDeal.trim_name,
            func.count(MarketDeal.deal_id).label("n"),
            pct_25.label("p25"),
            pct_50.label("p50"),
            pct_75.label("p75"),
            func.avg(MarketDeal.discount_percent).label("avg_discount"),
        )
        .where(
            and_(
                func.lower(MarketDeal.make_name) == brand_lower,
                MarketDeal.monthly_payment_total.isnot(None),
            )
        )
        .group_by(MarketDeal.model_name, MarketDeal.trim_name)
        .having(func.count(MarketDeal.deal_id) >= MIN_DEALS_FOR_PERCENTILE)
        .order_by(MarketDeal.model_name, MarketDeal.trim_name)
    )
    benchmark_rows = (await session.execute(benchmarks_stmt)).all()
    benchmark_models = [
        ModelBenchmark(
            model_name=row.model_name,
            trim_name=row.trim_name,
            sample_size=int(row.n),
            percentiles=Percentiles(p25=row.p25, p50=row.p50, p75=row.p75),
            avg_discount_percent=_to_residual_pct(row.avg_discount) if row.avg_discount is not None else None,
        )
        for row in benchmark_rows
    ]

    # ── 7) community_discussions ────────────────────────────────────────
    # Match against the lowercase makes_mentioned[] populated by the
    # knowledge-extraction prompt. Postgres ARRAY membership is exact-
    # match, and we already lowercase makes in the prompt, so a direct
    # equality check on the array element is correct.
    community_stmt = (
        select(LhKnowledgeChunk)
        .where(cast(brand_lower, String) == func.any(LhKnowledgeChunk.makes_mentioned))
        .order_by(LhKnowledgeChunk.source_created_at.desc().nullslast())
        .limit(5)
    )
    community_rows = list((await session.execute(community_stmt)).scalars().all())
    community = [
        CommunityDiscussion(
            topic_id=row.source_topic_id,
            title=row.source_topic_title,
            url=f"https://forum.leasehackr.com/t/{row.source_topic_id}",
            created_at=row.source_created_at,
            insight_count=len(row.key_insights or []),
        )
        for row in community_rows
    ]

    return BrandPageResponse(
        brand=brand_lower,
        captive_lender=CaptiveLender(
            name=metadata.captive_lender_name,
            description=metadata.captive_lender_description,
        ),
        current_month_programs=current_month_payload,
        historical_programs=historical_payload,
        negotiation_profile=metadata.negotiation_profile,
        deal_benchmarks=DealBenchmarks(models=benchmark_models),
        fi_considerations=metadata.fi_considerations,
        community_discussions=community,
        programs_archive=archive_payload,
    )

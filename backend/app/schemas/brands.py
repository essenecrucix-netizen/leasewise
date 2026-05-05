"""
Pydantic models for /api/v1/brands/* — brand-page surface.

Phase 1.4b: powers the BMW brand page (and any subsequent brand pages
that follow the same shape). Eight sections, all derived from the real
DB schema:
  - oem_programs (joined to vehicle_makes/models/trims via FK)
  - market_deals (percentile aggregates per model/trim)
  - brand_metadata (captive lender + negotiation + F&I copy)
  - lh_knowledge_chunks (BMW-tagged community threads)

Rates are returned as DECIMAL display-percent (1.49, not 0.0149) — the
DB stores DECIMAL(6,4) but the consumer-facing API speaks human APR.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Section 1: captive lender ───────────────────────────────────────────

class CaptiveLender(BaseModel):
    name:        str
    description: str | None = None


# ── Section 2: current-month programs ───────────────────────────────────

class ProgramIncentive(BaseModel):
    """An incentive line on a program row. Phase 1.4b only carries the
    cash_incentive bundled inside oem_programs; richer
    structures from oem_incentives table are surfaced in later phases."""
    type:        str               # 'cash' | 'loyalty' | 'conquest' | 'lease_cash'
    amount:      Decimal
    description: str | None = None


class BrandProgram(BaseModel):
    """One row from oem_programs, normalised to display-friendly types."""
    model_name:       str | None = None
    trim_name:        str | None = None
    province_code:    str | None = None
    term_months:      int
    annual_km:        int                            # = km_allowance_annual
    rate_apr:         Decimal                        # 1.49 not 0.0149
    residual_percent: Decimal | None = None          # 54.00 not 0.5400
    incentives:       list[ProgramIncentive] = Field(default_factory=list)


class CurrentMonthPrograms(BaseModel):
    month:    str                                    # 'YYYY-MM'
    programs: list[BrandProgram] = Field(default_factory=list)


# ── Section 3: historical programs ──────────────────────────────────────

class MonthlyAggregate(BaseModel):
    month:        str                                # 'YYYY-MM'
    avg_rate_apr: Decimal | None = None
    avg_residual: Decimal | None = None
    program_count: int = 0


class HistoricalPrograms(BaseModel):
    months:          list[str] = Field(default_factory=list)
    rate_trend:      list[MonthlyAggregate] = Field(default_factory=list)
    residual_trend:  list[MonthlyAggregate] = Field(default_factory=list)


# ── Section 5: deal benchmarks ──────────────────────────────────────────

class Percentiles(BaseModel):
    p25: Decimal | None = None
    p50: Decimal | None = None
    p75: Decimal | None = None


class ModelBenchmark(BaseModel):
    model_name:           str
    trim_name:            str | None = None
    sample_size:          int
    percentiles:          Percentiles
    avg_discount_percent: Decimal | None = None


class DealBenchmarks(BaseModel):
    models: list[ModelBenchmark] = Field(default_factory=list)


# ── Section 7: community discussions ────────────────────────────────────

class CommunityDiscussion(BaseModel):
    topic_id:    int
    title:       str | None = None
    url:         str
    created_at:  datetime | None = None
    insight_count: int = 0                           # # of key_insights extracted


# ── Section 8: programs archive ─────────────────────────────────────────

class ArchivedMonthPrograms(BaseModel):
    month:    str                                    # 'YYYY-MM'
    programs: list[BrandProgram] = Field(default_factory=list)


# ── Top-level response ──────────────────────────────────────────────────

class BrandPageResponse(BaseModel):
    brand:                  str
    captive_lender:         CaptiveLender
    current_month_programs: CurrentMonthPrograms
    historical_programs:    HistoricalPrograms
    negotiation_profile:    str
    deal_benchmarks:        DealBenchmarks
    fi_considerations:      str | None = None
    community_discussions:  list[CommunityDiscussion] = Field(default_factory=list)
    programs_archive:       list[ArchivedMonthPrograms] = Field(default_factory=list)

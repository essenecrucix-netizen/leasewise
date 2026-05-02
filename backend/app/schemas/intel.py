"""
Pydantic models for /api/v1/intel/* — market intelligence surface.

Phase 1.4: reads from market_deals + oem_programs + lh_crawl_log,
populated by the LeaseHackr crawler. PR2 (Phase 1.4b) wires these
endpoints into the homepage.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


# ── Recent deals ────────────────────────────────────────────────────────

class RecentDeal(BaseModel):
    """One row of the homepage deal ticker."""
    deal_id:               int
    make_name:             str
    model_name:             str
    trim_name:             str | None = None
    model_year:            int
    province_code:         str | None = None
    msrp:                  Decimal | None = None
    cap_cost:              Decimal | None = None
    monthly_payment_total: Decimal | None = None
    term_months:           int | None = None
    lease_rate_percent:    Decimal | None = None
    residual_percent:      Decimal | None = None
    deal_month:            date | None = None
    quality_score:         int
    source:                str
    created_at:            datetime


class RecentDealsResponse(BaseModel):
    deals: list[RecentDeal] = Field(default_factory=list)
    count: int = 0


# ── Recent programs ─────────────────────────────────────────────────────

class RecentProgram(BaseModel):
    """One row of the homepage programs snapshot."""
    program_id:            int
    make_name:             str
    model_name:             str | None = None
    trim_name:             str | None = None
    province_code:         str | None = None
    term_months:           int
    km_allowance_annual:   int
    lease_rate_percent:    Decimal
    residual_percent:      Decimal | None = None
    program_start_date:    date
    program_end_date:      date | None = None
    captured_at:           datetime


class RecentProgramsResponse(BaseModel):
    programs: list[RecentProgram] = Field(default_factory=list)
    count:    int = 0


# ── Pipeline stats ──────────────────────────────────────────────────────

class IngestionOutcome(BaseModel):
    """One outcome row from the LeaseHackr pipeline stats view."""
    outcome:     str
    topic_count: int
    last_seen:   datetime | None = None


class WeeklySummaryResponse(BaseModel):
    """High-level summary returned by /api/v1/intel/weekly-summary —
    feeds the live strip on the homepage."""
    deals_count:                 int
    deals_canadian:              int
    knowledge_chunks:             int
    knowledge_synthesized:        int
    last_crawl_at:               datetime | None = None
    last_synthesis_at:            datetime | None = None
    pipeline_outcomes:           list[IngestionOutcome] = Field(default_factory=list)
    status:                      Literal["live", "pending", "error"] = "pending"

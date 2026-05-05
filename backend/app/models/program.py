"""
ORM models — oem_programs and oem_incentives.

Phase 1.4: oem_programs gets seeded from app/services/captive_baseline.py
data via scripts/seed_oem_programs.py. The rater queries this table
first and falls back to captive_baseline.py when empty. Phase 2 OEM
scrapers will populate it for real.

Schema mirrors docs/design-phase/lease_platform_schema.sql sections 5
(oem_programs / oem_incentives).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CHAR,
    DECIMAL,
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OemProgram(Base):
    __tablename__ = "oem_programs"

    program_id:             Mapped[int]            = mapped_column(BigInteger, primary_key=True)
    make_id:                Mapped[int]            = mapped_column(ForeignKey("vehicle_makes.make_id"), nullable=False)
    trim_id:                Mapped[int | None]     = mapped_column(ForeignKey("vehicle_trims.trim_id"))

    make_name:              Mapped[str]            = mapped_column(String(100), nullable=False)
    model_name:             Mapped[str | None]     = mapped_column(String(200))
    model_year:             Mapped[int | None]     = mapped_column(SmallInteger)
    trim_name:              Mapped[str | None]     = mapped_column(String(200))
    oem_model_code:         Mapped[str | None]     = mapped_column(String(50))

    province_code:          Mapped[str | None]     = mapped_column(CHAR(2), ForeignKey("provinces.province_code"))
    region_description:     Mapped[str | None]     = mapped_column(String(200))

    term_months:            Mapped[int]            = mapped_column(SmallInteger, nullable=False)
    km_allowance_annual:    Mapped[int]            = mapped_column(Integer, nullable=False)
    lease_rate_percent:     Mapped[Decimal]        = mapped_column(DECIMAL(6, 4), nullable=False)
    residual_percent:       Mapped[Decimal | None] = mapped_column(DECIMAL(6, 4))
    residual_amount:        Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))

    cash_incentive:         Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2), default=Decimal("0"))
    loyalty_rate_reduction: Mapped[Decimal | None] = mapped_column(DECIMAL(6, 4), default=Decimal("0"))
    loyalty_cash:           Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2), default=Decimal("0"))
    conquest_cash:          Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2), default=Decimal("0"))
    pull_ahead_months:      Mapped[int | None]     = mapped_column(SmallInteger, default=0)

    program_start_date:     Mapped[date]           = mapped_column(Date, nullable=False)
    program_end_date:       Mapped[date | None]    = mapped_column(Date)
    is_current:             Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)

    source_url:             Mapped[str | None]     = mapped_column(String(1000))
    raw_footnote:           Mapped[str | None]     = mapped_column(Text)
    captured_at:            Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    captured_by_run_id:     Mapped[int | None]     = mapped_column(BigInteger)


class OemIncentive(Base):
    __tablename__ = "oem_incentives"

    incentive_id:           Mapped[int]            = mapped_column(BigInteger, primary_key=True)
    make_id:                Mapped[int]            = mapped_column(ForeignKey("vehicle_makes.make_id"), nullable=False)
    trim_id:                Mapped[int | None]     = mapped_column(ForeignKey("vehicle_trims.trim_id"))

    make_name:              Mapped[str]            = mapped_column(String(100), nullable=False)
    model_name:             Mapped[str | None]     = mapped_column(String(200))
    model_year:             Mapped[int | None]     = mapped_column(SmallInteger)
    province_code:          Mapped[str | None]     = mapped_column(CHAR(2), ForeignKey("provinces.province_code"))

    incentive_type:         Mapped[str]            = mapped_column(String(100), nullable=False)
    incentive_amount:       Mapped[Decimal]        = mapped_column(DECIMAL(10, 2), nullable=False)
    is_stackable_with_rate: Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    is_advertised:          Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    eligibility_conditions: Mapped[str | None]     = mapped_column(Text)

    program_start_date:     Mapped[date | None]    = mapped_column(Date)
    program_end_date:       Mapped[date | None]    = mapped_column(Date)
    is_current:             Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)

    source_url:             Mapped[str | None]     = mapped_column(String(1000))
    source:                 Mapped[str | None]     = mapped_column(String(50))
    captured_at:            Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)

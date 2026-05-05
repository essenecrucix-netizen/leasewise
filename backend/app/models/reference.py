"""
ORM models — reference data tables.

These mirror the schema verbatim (snake_case columns, types as defined in
docs/design-phase/lease_platform_schema.sql). Pre-populated by the schema
DDL itself + scripts/seed_reference_data.py. Used by the rater (province
lookup) and the brand-page endpoint (model/trim resolution).
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CHAR,
    DECIMAL,
    Boolean,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Province(Base):
    __tablename__ = "provinces"

    province_code:         Mapped[str]            = mapped_column(CHAR(2), primary_key=True)
    province_name:         Mapped[str]            = mapped_column(String(100), nullable=False)
    gst_rate:              Mapped[Decimal]        = mapped_column(DECIMAL(6, 4), nullable=False)
    pst_rate:              Mapped[Decimal]        = mapped_column(DECIMAL(6, 4), nullable=False)
    hst_rate:              Mapped[Decimal]        = mapped_column(DECIMAL(6, 4), nullable=False)
    has_variable_pst:      Mapped[bool]           = mapped_column(Boolean, nullable=False)
    tax_applied_to:        Mapped[str]            = mapped_column(String(50), nullable=False)
    regulatory_fee_name:   Mapped[str | None]     = mapped_column(String(100))
    regulatory_fee_amount: Mapped[Decimal | None] = mapped_column(DECIMAL(8, 2))
    is_active:             Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    notes:                 Mapped[str | None]     = mapped_column(Text)


class VehicleMake(Base):
    __tablename__ = "vehicle_makes"

    make_id:                   Mapped[int]        = mapped_column(Integer, primary_key=True)
    make_name:                 Mapped[str]        = mapped_column(String(100), nullable=False)
    make_name_normalized:      Mapped[str]        = mapped_column(String(100), nullable=False, unique=True)
    country_of_origin:         Mapped[str | None] = mapped_column(String(100))
    is_luxury:                 Mapped[bool]       = mapped_column(Boolean, nullable=False, default=False)
    is_active_in_canada:       Mapped[bool]       = mapped_column(Boolean, nullable=False, default=True)
    captive_lender_name:       Mapped[str | None] = mapped_column(String(200))
    captive_lender_canada_url: Mapped[str | None] = mapped_column(String(1000))
    program_page_url:          Mapped[str | None] = mapped_column(String(1000))
    program_page_scraper_key:  Mapped[str | None] = mapped_column(String(100))
    created_at:                Mapped[datetime]   = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class VehicleModel(Base):
    __tablename__ = "vehicle_models"

    model_id:               Mapped[int]        = mapped_column(Integer, primary_key=True)
    make_id:                Mapped[int]        = mapped_column(ForeignKey("vehicle_makes.make_id"), nullable=False)
    model_name:             Mapped[str]        = mapped_column(String(200), nullable=False)
    model_name_normalized:  Mapped[str]        = mapped_column(String(200), nullable=False)
    body_style:             Mapped[str | None] = mapped_column(String(50))
    segment:                Mapped[str | None] = mapped_column(String(100))
    drive_type:             Mapped[str | None] = mapped_column(String(20))
    is_discontinued:        Mapped[bool]       = mapped_column(Boolean, nullable=False, default=False)


class VehicleTrim(Base):
    __tablename__ = "vehicle_trims"

    trim_id:                 Mapped[int]            = mapped_column(Integer, primary_key=True)
    model_id:                Mapped[int]            = mapped_column(ForeignKey("vehicle_models.model_id"), nullable=False)
    model_year:              Mapped[int]            = mapped_column(SmallInteger, nullable=False)
    trim_name:               Mapped[str]            = mapped_column(String(200), nullable=False)
    trim_name_normalized:    Mapped[str]            = mapped_column(String(200), nullable=False)
    oem_model_code:          Mapped[str | None]     = mapped_column(String(50))
    base_msrp:               Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))
    freight_pdi:             Mapped[Decimal | None] = mapped_column(DECIMAL(8, 2))
    # total_msrp is a generated column persisted by the DB.
    total_msrp:              Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))
    engine_description:      Mapped[str | None]     = mapped_column(String(200))
    transmission:            Mapped[str | None]     = mapped_column(String(50))
    fuel_type:               Mapped[str | None]     = mapped_column(String(50))
    is_active:               Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    benchmark_residual_36mo: Mapped[Decimal | None] = mapped_column(DECIMAL(6, 4))
    benchmark_residual_48mo: Mapped[Decimal | None] = mapped_column(DECIMAL(6, 4))
    benchmark_residual_60mo: Mapped[Decimal | None] = mapped_column(DECIMAL(6, 4))
    created_at:              Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at:              Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)

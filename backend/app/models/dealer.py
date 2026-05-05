"""ORM model — dealers (one row per franchised location)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CHAR,
    DECIMAL,
    Boolean,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Dealer(Base):
    __tablename__ = "dealers"

    dealer_id:               Mapped[int]            = mapped_column(Integer, primary_key=True)
    make_id:                 Mapped[int]            = mapped_column(ForeignKey("vehicle_makes.make_id"), nullable=False)
    dealer_name:             Mapped[str]            = mapped_column(String(300), nullable=False)
    dealer_group_name:       Mapped[str | None]     = mapped_column(String(300))
    province_code:           Mapped[str]            = mapped_column(CHAR(2), ForeignKey("provinces.province_code"), nullable=False)
    city:                    Mapped[str]            = mapped_column(String(100), nullable=False)
    postal_code:             Mapped[str | None]     = mapped_column(String(10))
    street_address:          Mapped[str | None]     = mapped_column(String(500))
    latitude:                Mapped[Decimal | None] = mapped_column(DECIMAL(10, 7))
    longitude:               Mapped[Decimal | None] = mapped_column(DECIMAL(10, 7))
    internet_sales_email:    Mapped[str | None]     = mapped_column(String(300))
    general_phone:           Mapped[str | None]     = mapped_column(String(20))
    website_url:             Mapped[str | None]     = mapped_column(String(1000))
    marketcheck_dealer_id:   Mapped[str | None]     = mapped_column(String(100))
    google_place_id:         Mapped[str | None]     = mapped_column(String(200))
    is_active:               Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    last_inventory_scraped_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at:              Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at:              Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    # The PostGIS geometry column on this table (geo index `idx_dealers_geo`)
    # is computed via ST_SetSRID(ST_MakePoint(...)) on read — we don't expose
    # it as a column on the ORM model. The lat/lon Decimals above are the
    # source of truth.

"""
ORM model — inventory_listings.

Populated by the MarketCheck crawler in Phase 1.4c (deferred until the
key is available). Backed by the inventory_listings DDL with VIN as the
unique key, generated columns for `discount_from_msrp` and `days_on_lot`,
and a `status` lifecycle (active | sold | transferred | unknown).
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CHAR,
    DECIMAL,
    BigInteger,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InventoryListing(Base):
    __tablename__ = "inventory_listings"

    listing_id:             Mapped[int]            = mapped_column(BigInteger, primary_key=True)
    vin:                    Mapped[str]            = mapped_column(CHAR(17), nullable=False, unique=True)
    dealer_id:              Mapped[int]            = mapped_column(ForeignKey("dealers.dealer_id"), nullable=False)
    trim_id:                Mapped[int | None]     = mapped_column(ForeignKey("vehicle_trims.trim_id"))

    model_year:             Mapped[int]            = mapped_column(SmallInteger, nullable=False)
    make_name:              Mapped[str]            = mapped_column(String(100), nullable=False)
    model_name:             Mapped[str]            = mapped_column(String(200), nullable=False)
    trim_name:              Mapped[str | None]     = mapped_column(String(200))
    oem_model_code:         Mapped[str | None]     = mapped_column(String(50))

    exterior_color:         Mapped[str | None]     = mapped_column(String(100))
    interior_color:         Mapped[str | None]     = mapped_column(String(100))
    options_packages:       Mapped[Any | None]     = mapped_column(JSONB)
    mileage_km:             Mapped[int]            = mapped_column(Integer, default=0)

    msrp:                   Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))
    asking_price:           Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))
    # Generated columns — read-only on the ORM. Persisted by the DB.
    discount_from_msrp:     Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2))
    days_on_lot:            Mapped[int | None]     = mapped_column(Integer)

    first_seen_at:          Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    last_seen_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    status:                 Mapped[str]            = mapped_column(String(20), nullable=False, default="active")
    sold_at:                Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    source:                 Mapped[str]            = mapped_column(String(50), nullable=False)
    source_listing_id:      Mapped[str | None]     = mapped_column(String(300))
    source_last_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    raw_payload:            Mapped[Any | None]     = mapped_column(JSONB)

    created_at:             Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at:             Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), nullable=False)

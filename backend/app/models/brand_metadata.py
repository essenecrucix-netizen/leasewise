"""
ORM model — brand_metadata.

Per-brand captive lender description, negotiation profile, and F&I notes.
Powers the brand-page endpoints (Phase 1.4b). One row per brand,
identified by lowercase `brand` (e.g. 'bmw', 'mercedes-benz').

Created by Alembic migration 0002 (Phase 1.4b). Seeded by
scripts/seed_bmw_programs.py for BMW; future brands seeded similarly.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BrandMetadata(Base):
    __tablename__ = "brand_metadata"

    id:                          Mapped[int]        = mapped_column(Integer, primary_key=True)
    brand:                       Mapped[str]        = mapped_column(String(50), nullable=False, unique=True)
    captive_lender_name:         Mapped[str]        = mapped_column(String(100), nullable=False)
    captive_lender_description:  Mapped[str | None] = mapped_column(Text)
    negotiation_profile:         Mapped[str]        = mapped_column(Text, nullable=False)
    fi_considerations:           Mapped[str | None] = mapped_column(Text)
    created_at:                  Mapped[datetime]   = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at:                  Mapped[datetime]   = mapped_column(TIMESTAMP(timezone=True), nullable=False)

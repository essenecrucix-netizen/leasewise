"""
ORM models — lh_crawl_log + lh_knowledge_chunks.

These mirror docs/design-phase/lh_schema_additions.sql. The crawl log is
the idempotency table — every topic the LeaseHackr crawler touches gets
recorded exactly once (`UNIQUE (topic_id)`), so we never re-extract from
the same post twice. The knowledge chunks table holds Claude's extracted
*facts* — never the original post text, per CLAUDE.md "never" rule #4.

Phase 1.3 had stub registry data; Phase 1.4 actually populates these.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, TEXT, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LhCrawlLog(Base):
    __tablename__ = "lh_crawl_log"

    topic_id:    Mapped[int]      = mapped_column(BigInteger, primary_key=True)
    category:    Mapped[str]      = mapped_column(String(100), nullable=False)
    outcome:     Mapped[str]      = mapped_column(String(50),  nullable=False)
    """One of:
       in_progress
       deal_stored | knowledge_stored
       not_a_deal | no_knowledge | non_canadian
       skipped_pinned | skipped_short | fetch_failed | db_error"""
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    """Populated for failure outcomes (db_error, fetch_failed,
       extraction errors). NULL for happy-path outcomes. Added in
       Alembic revision 0001."""
    crawled_at:  Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class LhKnowledgeChunk(Base):
    __tablename__ = "lh_knowledge_chunks"

    chunk_id:           Mapped[int]            = mapped_column(BigInteger, primary_key=True)
    source_topic_id:    Mapped[int]            = mapped_column(BigInteger, nullable=False, unique=True)
    source_topic_title: Mapped[str | None]     = mapped_column(String(500))
    source_created_at:  Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    makes_mentioned:    Mapped[list[str]]      = mapped_column(ARRAY(TEXT), nullable=False, default=list)
    topics:             Mapped[list[str]]      = mapped_column(ARRAY(TEXT), nullable=False, default=list)
    key_insights:       Mapped[list[str]]      = mapped_column(ARRAY(TEXT), nullable=False, default=list)
    applies_to_canada:  Mapped[bool | None]    = mapped_column(Boolean)
    confidence:         Mapped[str | None]     = mapped_column(String(20))
    source_tags:        Mapped[list[str]]      = mapped_column(ARRAY(TEXT), nullable=False, default=list)

    synthesized_at:     Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at:         Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), nullable=False)

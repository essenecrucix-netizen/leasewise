"""
Pydantic models for the sources transparency endpoint.

Mirrors the design-phase sources page (docs/design-phase/sources.jsx).
Sources are tracked in code (app/services/sources_registry.py) until the
scrapers in Phase 1.4+ start producing live last-sync timestamps.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Confidence = Literal["high", "medium", "low"]


class Source(BaseModel):
    """A single data source entry as shown on the /sources page."""

    name:        str
    coverage:    str          # "BMW FS · Honda Financial · …"
    method:      str          # "Direct partner feed + dealer-shared bulletins"
    last_sync:   datetime | None = None
    """ISO timestamp; None when the source hasn't synced yet (Phase 1.4
       brings live ingestion). UI displays 'pending' for null."""
    last_sync_human: str | None = None
    """Pre-formatted relative string ('2h ago' / 'Apr 1, 2026'). The
       backend computes this so the frontend doesn't need a date library."""
    confidence:  Confidence


class SourcesResponse(BaseModel):
    """Full sources manifest for the transparency page."""

    sources: list[Source]
    summary: dict[str, str | int] = Field(default_factory=dict)
    """High-level stats: { datapoints_label, coverage_label, last_sync_label, … }"""

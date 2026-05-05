"""
Sources transparency endpoint.

GET /api/v1/sources — returns the full sources manifest, each entry with
a confidence rating and a last-sync timestamp. Phase 1.3 reads from
app/services/sources_registry.py (Python constants); when Phase 1.4
ingestion lands, sources_registry will be replaced by a live query
against `pipeline_runs`. The wire format does not change.
"""

from fastapi import APIRouter

from app.schemas.sources import SourcesResponse
from app.services.sources_registry import list_sources, summary


router = APIRouter()


@router.get("", response_model=SourcesResponse)
async def get_sources() -> SourcesResponse:
    return SourcesResponse(sources=list_sources(), summary=summary())

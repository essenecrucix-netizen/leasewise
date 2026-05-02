"""
Deal rater API endpoint.

POST /api/v1/rater/score — accepts pasted worksheet text or a structured
manual-input form, runs Claude-Haiku extraction (or the regex fallback
in dev when ANTHROPIC_API_KEY is unset), and returns a graded result
including markup analysis and 3+ feedback callouts.

Phase 1.3 always returns confidence_band="insufficient_data" because the
market_deals table is empty until ingestion lands in Phase 1.4. The
frontend renders that as the "Confidence (low data)" result state.
"""

from fastapi import APIRouter

from app.core.exceptions import ValidationError
from app.schemas.rater import RaterRequest, RaterResponse
from app.services import extraction_service
from app.services.rater_service import grade, grade_from_structured


router = APIRouter()


@router.post("/score", response_model=RaterResponse)
async def score_worksheet(req: RaterRequest) -> RaterResponse:
    """
    Score a dealer worksheet.

    Send exactly one of `worksheet_text` (paste mode / pdf-extracted)
    or `structured` (manual form). Returns the rater response shape
    documented in app/schemas/rater.py — both APR and money factor on
    every rate field, with `rate_quoted_as` flagging the original
    convention so the UI can preserve the dealer's audit trail.
    """
    if not req.worksheet_text and not req.structured:
        raise ValidationError(
            "Provide either worksheet_text (paste mode) or structured (manual form).",
        )

    if req.worksheet_text and req.structured:
        raise ValidationError(
            "Provide only one input mode at a time — worksheet_text or structured.",
        )

    # Phase 1.3: ingestion hasn't started, so there are no comparables.
    # Wire this to a real `market_deals` count query once Phase 1.4 lands.
    market_deals_count = 0

    if req.structured is not None:
        return grade_from_structured(req.structured, market_deals_count=market_deals_count)

    extracted = await extraction_service.extract(req.worksheet_text or "")
    return grade(extracted, market_deals_count=market_deals_count)

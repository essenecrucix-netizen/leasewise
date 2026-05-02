"""
Deal rater API endpoint.

POST /api/v1/rater/score — accepts pasted worksheet text or a structured
manual-input form, runs Claude-Haiku extraction (or the regex fallback
in dev when ANTHROPIC_API_KEY is unset), and returns a graded result
including markup analysis and 3+ feedback callouts.

Phase 1.4: switched from in-memory `captive_baseline.py` to the
DB-backed `grade_with_db()` path. The endpoint queries `oem_programs`
for captive baselines and counts matching `market_deals` rows for the
percentile / sample_size fields. captive_baseline.py is the fallback
when the DB has no matching row, so the rater keeps working before the
seed script has populated oem_programs (or for any vehicle the seed
doesn't cover).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.db.session import get_session
from app.schemas.rater import RaterRequest, RaterResponse
from app.services import extraction_service
from app.services.rater_service import grade_with_db, structured_to_extracted


router = APIRouter()


@router.post("/score", response_model=RaterResponse)
async def score_worksheet(
    req: RaterRequest,
    session: AsyncSession = Depends(get_session),
) -> RaterResponse:
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

    if req.structured is not None:
        extracted = structured_to_extracted(req.structured)
    else:
        extracted = await extraction_service.extract(req.worksheet_text or "")

    return await grade_with_db(session, extracted)

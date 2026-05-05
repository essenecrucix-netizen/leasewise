"""
Rater-service tests.

Exercises the grading pipeline end-to-end on the canonical sample
worksheets through the regex extractor, then asserting the markup math,
feedback structure, and signal-based grade letter behave as designed.
"""

from decimal import Decimal

from app.services.extraction_service import _regex_extract
from app.services.rater_service import grade


# Re-imported from test_extraction to keep tests independent.
SAMPLE_BMW_X3 = """2026 BMW X3 xDrive30i
MSRP: $62,400
Freight & PDI: $2,480
Selling Price: $58,900
Term: 39 months
Money Factor: 0.00166 (3.99% APR)
Residual: 59% ($36,816)
KM/yr: 16,000
Province: Alberta
Loyalty: $1,500
Monthly Payment (taxed): $698"""

SAMPLE_HONDA_CRV = """2026 Honda CR-V Hybrid Touring
MSRP: $49,100
Freight: $1,995
Selling Price: $48,200
Term: 48 months
Money Factor: 0.00187 (4.49% APR)
Residual: 55%
KM/yr: 20,000
Province: Ontario
Doc fee: $799
Monthly (taxed): $612"""

SAMPLE_MB_GLC = """2025 Mercedes-Benz GLC 300 4MATIC
MSRP: $60,500
Freight: $2,895
Selling Price: $61,200
Term: 36 months
Money Factor: 0.00275 (6.60% APR)
Residual: 56%
KM/yr: 18,000
Province: British Columbia
Wear protection: $42/mo
Monthly (taxed): $948"""


# ── Confidence band: always insufficient_data in Phase 1.3 ──────────────

def test_phase_1_3_always_returns_insufficient_data() -> None:
    """market_deals_count=0 (default) → confidence_band='insufficient_data'."""
    extracted = _regex_extract(SAMPLE_BMW_X3)
    out = grade(extracted)
    assert out.confidence_band == "insufficient_data"
    assert out.percentile is None
    assert out.sample_size == 0


def test_confidence_band_high_when_enough_comparables() -> None:
    extracted = _regex_extract(SAMPLE_BMW_X3)
    out = grade(extracted, market_deals_count=42)
    assert out.confidence_band == "high"
    assert out.sample_size == 42


# ── Markup: BMW X3 has zero markup vs captive base ──────────────────────

def test_bmw_x3_no_markup() -> None:
    """3.99% APR matches BMW captive base; markup_bps should be ~0."""
    extracted = _regex_extract(SAMPLE_BMW_X3)
    out = grade(extracted)
    assert out.markup is not None
    assert abs(out.markup.markup_bps) <= 1
    assert out.markup.captive_apr == Decimal("3.99")
    assert out.markup.quoted_apr == Decimal("3.984")


# ── Markup: Mercedes GLC has 60+ bps markup ─────────────────────────────

def test_mb_glc_heavy_markup() -> None:
    extracted = _regex_extract(SAMPLE_MB_GLC)
    out = grade(extracted)
    assert out.markup is not None
    # Captive base 5.99%, dealer quoted 6.60% → ~61 bps
    assert out.markup.markup_bps >= 50
    # Cost estimate populated when all four prerequisites present
    assert out.markup.cost_per_month_estimate is not None
    assert out.markup.cost_total_estimate is not None


# ── Feedback: at least 3 callouts on every realistic worksheet ──────────

def test_bmw_x3_has_at_least_three_feedback_items() -> None:
    extracted = _regex_extract(SAMPLE_BMW_X3)
    out = grade(extracted)
    assert len(out.feedback) >= 3


def test_mb_glc_has_at_least_three_feedback_items_including_addons() -> None:
    extracted = _regex_extract(SAMPLE_MB_GLC)
    out = grade(extracted)
    assert len(out.feedback) >= 3
    titles = " | ".join(item.title for item in out.feedback)
    assert "F&I add-on" in titles or "wear" in titles.lower()


# ── Signal-based grade letter ───────────────────────────────────────────

def test_bmw_x3_grades_high() -> None:
    """No markup, residual matches, ~9% discount → expect A or B."""
    extracted = _regex_extract(SAMPLE_BMW_X3)
    out = grade(extracted)
    assert out.grade in ("A", "B")


def test_mb_glc_grades_low() -> None:
    """Heavy markup, residual 4 pts below program, cap > MSRP → expect D or F."""
    extracted = _regex_extract(SAMPLE_MB_GLC)
    out = grade(extracted)
    assert out.grade in ("D", "F")


def test_honda_crv_grades_middle() -> None:
    extracted = _regex_extract(SAMPLE_HONDA_CRV)
    out = grade(extracted)
    # No markup but small discount and residual matches.
    assert out.grade in ("A", "B", "C")


# ── Captive-base lookup falls back to "no captive on file" ──────────────

def test_unknown_vehicle_no_captive_data() -> None:
    extracted = _regex_extract(
        """2025 Subaru Outback Limited XT
MSRP: $48,995
Freight: $2,000
Selling Price: $47,000
Term: 36 months
Money Factor: 0.00200 (4.80% APR)
Residual: 55%
Province: Ontario"""
    )
    out = grade(extracted)
    # Subaru not in captive_baseline → markup is None, feedback still
    # surfaces the rate but with a 'no captive on file' note.
    assert out.markup is None
    titles = " | ".join(item.title for item in out.feedback)
    assert "no captive base" in titles.lower() or "captive base" in titles.lower()

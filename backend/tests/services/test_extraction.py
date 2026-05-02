"""
Extraction-service tests.

These run against the regex fallback (no ANTHROPIC_API_KEY required).
The Claude path is exercised on the production environment where the
key is set; the regex fallback handles the canonical sample worksheets
faithfully and is what the sandbox / CI typecheck against.
"""

from decimal import Decimal

import pytest

from app.services.extraction_service import _regex_extract


SAMPLE_BMW_X3 = """2026 BMW X3 xDrive30i
MSRP: $62,400
Freight & PDI: $2,480
Selling Price: $58,900
Term: 39 months
Money Factor: 0.00166 (3.99% APR)
Residual: 59% ($36,816)
KM/yr: 16,000
Down Payment: $0
Trade Equity: $0
Loyalty: $1,500
Province: Alberta
Monthly Payment (taxed): $698"""

SAMPLE_HONDA_CRV = """2026 Honda CR-V Hybrid Touring
MSRP: $49,100
Freight: $1,995
Selling Price: $48,200
Term: 48 months
Money Factor: 0.00187 (4.49% APR)
Residual: 55%
KM/yr: 20,000
Down: $0
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


def test_extract_bmw_x3_basics() -> None:
    f = _regex_extract(SAMPLE_BMW_X3)
    assert f.vehicle and "BMW X3" in f.vehicle
    assert f.make == "BMW"
    assert f.year == 2026
    assert f.msrp == Decimal("62400")
    assert f.freight_pdi == Decimal("2480")
    assert f.cap_cost == Decimal("58900")
    assert f.term_months == 39
    assert f.annual_km == 16000
    assert f.province_code == "AB"
    assert f.residual_percent == Decimal("0.59")
    assert f.cash_incentives == Decimal("1500")
    assert f.monthly_payment == Decimal("698")


def test_extract_bmw_x3_rate_audit_trail_mf() -> None:
    """Worksheet shows MF prominently → rate_quoted_as='money_factor'."""
    f = _regex_extract(SAMPLE_BMW_X3)
    assert f.rate_quoted_as == "money_factor"
    assert f.money_factor == Decimal("0.00166")
    # APR derived via × 2400 — unit conversion only.
    assert f.apr == Decimal("3.984")


def test_extract_honda_crv_provinces_and_addons() -> None:
    f = _regex_extract(SAMPLE_HONDA_CRV)
    assert f.province_code == "ON"
    assert f.doc_fee == Decimal("799")
    assert f.term_months == 48
    assert f.cap_cost == Decimal("48200")


def test_extract_mb_glc_addons_and_high_rate() -> None:
    f = _regex_extract(SAMPLE_MB_GLC)
    assert f.province_code == "BC"
    assert f.addons_per_month == Decimal("42")
    assert f.money_factor == Decimal("0.00275")
    assert f.cap_cost == Decimal("61200")


def test_extract_empty_text() -> None:
    f = _regex_extract("")
    assert f.vehicle is None
    assert f.notes  # at least one caveat note


@pytest.mark.parametrize(
    "text",
    [
        "Random unrelated text without any worksheet structure.",
        "MSRP: not specified\nNo other lease numbers.",
    ],
)
def test_extract_unparseable_returns_safe_nones(text: str) -> None:
    f = _regex_extract(text)
    # Should return safely with mostly-None fields and informative notes.
    assert f.cap_cost is None
    assert f.term_months is None
    assert f.notes

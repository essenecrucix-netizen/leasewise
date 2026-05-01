"""
Calculator math contract tests.

These tests exist because the calculator math is the contract. If you change
the math and these tests break, you've changed the contract — even if the
new behaviour is "more correct," the user-visible numbers shifted.

Each fixture is a real Canadian lease scenario, validated by hand.
"""

from decimal import Decimal

import pytest

from app.lease_math.bc_luxury import bc_luxury_monthly_surtax
from app.lease_math.conversion import apr_to_mf, mf_to_apr
from app.lease_math.payment import LeaseInputs, calculate_lease
from app.lease_math.tax import lease_tax_rate, split_qc_tax


DEC = Decimal


# Tolerance for floating-point comparisons. Real dealer worksheets round
# to the nearest cent, so anything tighter than $1 is success.
TOLERANCE = DEC("1.00")


def _close(a: Decimal, b: Decimal, tol: Decimal = TOLERANCE) -> bool:
    return abs(a - b) <= tol


# ── BMW X3 xDrive30i, Alberta, 39mo / 16k km ────────────────────────────────
def test_bmw_x3_alberta_39mo() -> None:
    """
    The canonical test case from the design phase.

    Vehicle:   2026 BMW X3 xDrive30i
    MSRP:      $62,400
    Freight:   $2,480
    Cap cost:  $58,900
    Residual:  59% (= $38,279 at lease end)
    MF:        0.00166 (3.99% APR)
    Term:      39 months / 16,000 km/yr
    Province:  Alberta (5% GST)
    Loyalty:   $1,500 (current BMW)
    Acq fee:   $675

    Expected: ~$698/month taxed, ~$664.76/month pre-tax, ~$33.24 GST.
    """
    inputs = LeaseInputs(
        msrp=DEC("62400"),
        freight_pdi=DEC("2480"),
        cap_cost=DEC("58900"),
        residual_percent=DEC("0.59"),
        money_factor=DEC("0.00166"),
        term_months=39,
        annual_km=16000,
        cash_incentives=DEC("1500"),    # BMW loyalty cash, applied as cap reduction
        acquisition_fee=DEC("675"),
    )
    out = calculate_lease(inputs, lease_tax_rate("AB"))

    # Verify the headline numbers match design phase. Tolerances allow for
    # small rounding differences between dealer worksheets and our math.
    assert _close(out.monthly_total, DEC("698"), DEC("3.00")), (
        f"Expected monthly ~$698, got {out.monthly_total}"
    )
    assert _close(out.monthly_pre_tax, DEC("664.76"), DEC("3.00")), (
        f"Expected pre-tax ~$664.76, got {out.monthly_pre_tax}"
    )
    assert _close(out.residual_amount, DEC("38279"), DEC("5"))


# ── Ontario HST scenario ────────────────────────────────────────────────────
def test_ontario_hst_applied() -> None:
    """Ontario has 13% HST — verify it's applied to monthly payment."""
    inputs = LeaseInputs(
        msrp=DEC("60000"),
        freight_pdi=DEC("2000"),
        cap_cost=DEC("56000"),
        residual_percent=DEC("0.55"),
        money_factor=DEC("0.00200"),
        term_months=36,
        annual_km=20000,
    )
    on_out = calculate_lease(inputs, lease_tax_rate("ON"))
    ab_out = calculate_lease(inputs, lease_tax_rate("AB"))

    # ON should be more expensive than AB by exactly the tax difference
    expected_diff = on_out.monthly_pre_tax * (DEC("0.13") - DEC("0.05"))
    actual_diff = on_out.monthly_total - ab_out.monthly_total
    assert _close(expected_diff, actual_diff), (
        f"ON-AB diff: expected {expected_diff}, got {actual_diff}"
    )


# ── Quebec QST split ────────────────────────────────────────────────────────
def test_quebec_qst_compounds_correctly() -> None:
    """QC applies QST on top of GST-inclusive amount."""
    monthly_pre_tax = DEC("700.00")
    gst, qst = split_qc_tax(monthly_pre_tax)

    # GST = 700 × 5% = 35.00
    assert gst == DEC("35.00")
    # QST = (700 + 35) × 9.975% = 73.31625, rounded half-even to 73.32
    assert qst == DEC("73.32")
    # The split sums to the *actual* compounded effective QC rate:
    # (1 + 0.05) × (1 + 0.09975) - 1 = 0.1547375. Note this is intentionally
    # different from lease_tax_rate("QC") (which returns the simple sum
    # 0.14975 to match the design-phase JS reference). The simple sum is
    # used as the bulk-tax-rate input to calculate_lease; split_qc_tax is
    # the more accurate breakdown surfaced on the customer worksheet.
    compounded_rate = (DEC("1.05") * DEC("1.09975")) - DEC("1")
    expected_compounded = monthly_pre_tax * compounded_rate
    assert _close(gst + qst, expected_compounded)


# ── BC luxury surtax above threshold ────────────────────────────────────────
def test_bc_luxury_surtax_applies_above_threshold() -> None:
    """Vehicles ≥$125,000 in BC trigger additional surtax."""
    surtax = bc_luxury_monthly_surtax(
        msrp_plus_freight=DEC("148500"),
        province_code="BC",
        term_months=39,
    )
    assert surtax > DEC("0"), "Expected non-zero surtax above luxury threshold"


def test_bc_luxury_surtax_does_not_apply_below() -> None:
    """Vehicles <$125,000 in BC have no surtax."""
    surtax = bc_luxury_monthly_surtax(
        msrp_plus_freight=DEC("60000"),
        province_code="BC",
        term_months=39,
    )
    assert surtax == DEC("0")


def test_bc_luxury_surtax_does_not_apply_outside_bc() -> None:
    """Same expensive vehicle in AB — no surtax."""
    surtax = bc_luxury_monthly_surtax(
        msrp_plus_freight=DEC("148500"),
        province_code="AB",
        term_months=39,
    )
    assert surtax == DEC("0")


# ── Money factor / APR conversion ───────────────────────────────────────────
def test_mf_to_apr_known_values() -> None:
    """Standard conversion: MF 0.00166 ↔ APR 3.984%."""
    assert mf_to_apr(DEC("0.00166")) == DEC("3.984")
    assert mf_to_apr(DEC("0.00250")) == DEC("6.000")


def test_apr_to_mf_round_trip() -> None:
    """Round trip should preserve precision within rounding tolerance."""
    apr = DEC("3.99")
    mf = apr_to_mf(apr)
    apr2 = mf_to_apr(mf)
    assert _close(apr, apr2, DEC("0.01"))


# ── All 13 jurisdictions return a valid rate ────────────────────────────────
@pytest.mark.parametrize("code", [
    "AB", "BC", "MB", "NB", "NL", "NS",
    "NT", "NU", "ON", "PE", "QC", "SK", "YT",
])
def test_every_province_has_lease_tax_rate(code: str) -> None:
    rate = lease_tax_rate(code)
    assert rate > 0, f"{code} returned zero rate"
    assert rate < DEC("0.20"), f"{code} returned implausible rate {rate}"


def test_unknown_province_raises() -> None:
    with pytest.raises(ValueError):
        lease_tax_rate("XX")


# ── Validation errors ───────────────────────────────────────────────────────
def test_zero_term_rejected() -> None:
    with pytest.raises(ValueError, match="term_months"):
        calculate_lease(
            LeaseInputs(
                msrp=DEC("60000"),
                freight_pdi=DEC("2000"),
                cap_cost=DEC("56000"),
                residual_percent=DEC("0.55"),
                money_factor=DEC("0.002"),
                term_months=0,
                annual_km=16000,
            ),
            lease_tax_rate("AB"),
        )


def test_residual_above_one_rejected() -> None:
    with pytest.raises(ValueError, match="residual_percent"):
        calculate_lease(
            LeaseInputs(
                msrp=DEC("60000"),
                freight_pdi=DEC("2000"),
                cap_cost=DEC("56000"),
                residual_percent=DEC("1.01"),
                money_factor=DEC("0.002"),
                term_months=36,
                annual_km=16000,
            ),
            lease_tax_rate("AB"),
        )

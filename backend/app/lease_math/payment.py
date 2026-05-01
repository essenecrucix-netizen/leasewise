"""
Lease payment calculation — the core math.

This is the SINGLE SOURCE OF TRUTH for lease arithmetic in LeaseWise. The
frontend never recomputes these numbers; it always calls the calculator API.

Ported from the design phase calculator.jsx. The math is identical; the
language has changed.

Key formulas (all amounts in CAD unless noted):

    monthly_depreciation = (cap_cost - residual_amount) / term_months
    monthly_finance      = (cap_cost + residual_amount) * money_factor
    monthly_pre_tax      = monthly_depreciation + monthly_finance
    monthly_taxed        = monthly_pre_tax * (1 + provincial_lease_tax_rate)
    drive_off            = first_payment + provincial_fees + acquisition_fee + down_payment

Provincial tax handling lives in `tax.py`. BC luxury surtax handling lives
in `bc_luxury.py`. Money factor / APR conversion lives in `conversion.py`.

This module is pure functions on numeric inputs. No I/O. No side effects.
That is what makes it testable.
"""

from decimal import Decimal
from dataclasses import dataclass


# Use Decimal for all currency arithmetic. Floats accumulate rounding errors
# that become visible when comparing dealer worksheets to LeaseWise output.
DEC = Decimal


@dataclass(frozen=True, slots=True)
class LeaseInputs:
    """All numeric inputs to a lease calculation."""

    msrp:               DEC      # manufacturer's suggested retail price
    freight_pdi:        DEC      # freight & PDI from invoice
    cap_cost:           DEC      # negotiated selling price (before tax/fees)
    residual_percent:   DEC      # residual as decimal, e.g. 0.59 for 59 %
    money_factor:       DEC      # MF, e.g. 0.00166 for ~3.99 % APR
    term_months:        int
    annual_km:          int
    down_payment:       DEC = DEC("0")
    trade_equity:       DEC = DEC("0")
    cash_incentives:    DEC = DEC("0")
    acquisition_fee:    DEC = DEC("675")    # default to BMW captive standard
    provincial_fees:    DEC = DEC("0")      # province-specific dealer fees


@dataclass(frozen=True, slots=True)
class LeaseOutputs:
    """All numeric outputs from a lease calculation."""

    residual_amount:        DEC
    adjusted_cap_cost:      DEC
    monthly_depreciation:   DEC
    monthly_finance:        DEC
    monthly_pre_tax:        DEC
    monthly_tax:            DEC
    monthly_total:          DEC
    drive_off:              DEC
    total_cost_of_lease:    DEC
    effective_discount_pct: DEC
    payment_to_msrp_ratio:  DEC


def calculate_lease(
    inputs: LeaseInputs,
    province_lease_tax_rate: DEC,
    bc_luxury_surtax: DEC = DEC("0"),
) -> LeaseOutputs:
    """
    Compute every output for a lease scenario.

    Args:
        inputs: All numeric lease inputs.
        province_lease_tax_rate: Combined GST/HST/PST/QST as decimal,
            e.g. 0.05 for AB, 0.13 for ON, 0.14975 for QC.
        bc_luxury_surtax: Additional monthly surtax for BC luxury vehicles.
            Use the function in `bc_luxury.py` to compute this.

    Returns:
        Fully-populated LeaseOutputs.

    Raises:
        ValueError: if any input is out of valid range (negative residual,
            zero term, etc.).
    """
    _validate(inputs)

    # Residual is computed against MSRP + freight (the "MSRP-plus" basis used
    # by every Canadian captive lender).
    residual_basis = inputs.msrp + inputs.freight_pdi
    residual_amount = (residual_basis * inputs.residual_percent).quantize(DEC("0.01"))

    # Adjusted cap cost: cap cost minus the cash buy-down sources.
    adjusted_cap = (
        inputs.cap_cost
        - inputs.down_payment
        - inputs.trade_equity
        - inputs.cash_incentives
        + inputs.acquisition_fee  # acquisition fee is typically capitalised
    )

    # Monthly depreciation: how much value the user "burns through" per month.
    monthly_depreciation = (
        (adjusted_cap - residual_amount) / DEC(inputs.term_months)
    ).quantize(DEC("0.01"))

    # Monthly finance: the lease equivalent of interest.
    monthly_finance = (
        (adjusted_cap + residual_amount) * inputs.money_factor
    ).quantize(DEC("0.01"))

    monthly_pre_tax = monthly_depreciation + monthly_finance
    monthly_tax = (monthly_pre_tax * province_lease_tax_rate).quantize(DEC("0.01"))
    monthly_total = monthly_pre_tax + monthly_tax + bc_luxury_surtax

    # Drive-off: cash required at signing.
    drive_off = (
        monthly_total           # first month due at signing
        + inputs.provincial_fees
        + inputs.down_payment
    ).quantize(DEC("0.01"))

    total_cost = (
        monthly_total * DEC(inputs.term_months)
        + drive_off
        - monthly_total         # subtract the first-month payment we double-counted
    ).quantize(DEC("0.01"))

    effective_discount = (DEC("1") - inputs.cap_cost / inputs.msrp).quantize(DEC("0.0001"))
    pmt_to_msrp = (monthly_total / inputs.msrp).quantize(DEC("0.0001"))

    return LeaseOutputs(
        residual_amount=residual_amount,
        adjusted_cap_cost=adjusted_cap,
        monthly_depreciation=monthly_depreciation,
        monthly_finance=monthly_finance,
        monthly_pre_tax=monthly_pre_tax,
        monthly_tax=monthly_tax,
        monthly_total=monthly_total,
        drive_off=drive_off,
        total_cost_of_lease=total_cost,
        effective_discount_pct=effective_discount,
        payment_to_msrp_ratio=pmt_to_msrp,
    )


def _validate(inputs: LeaseInputs) -> None:
    """Reject obviously-invalid inputs early."""
    if inputs.term_months <= 0:
        raise ValueError("term_months must be positive")
    if inputs.msrp <= 0:
        raise ValueError("msrp must be positive")
    if inputs.cap_cost <= 0:
        raise ValueError("cap_cost must be positive")
    if inputs.residual_percent <= 0 or inputs.residual_percent >= 1:
        raise ValueError("residual_percent must be a decimal between 0 and 1")
    if inputs.money_factor < 0:
        raise ValueError("money_factor cannot be negative")
    if inputs.annual_km <= 0:
        raise ValueError("annual_km must be positive")

"""
Calculator API endpoints.

POST /api/v1/calculator/compute — full lease calculation
GET  /api/v1/calculator/programs/{make_slug}/{model_slug} — captive lender programs
"""

from decimal import Decimal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.lease_math.bc_luxury import bc_luxury_monthly_surtax
from app.lease_math.conversion import mf_to_apr
from app.lease_math.payment import LeaseInputs, calculate_lease
from app.lease_math.tax import lease_tax_rate, split_qc_tax


router = APIRouter()


class CalculatorRequest(BaseModel):
    """Inputs from the frontend calculator form."""

    msrp:               Decimal = Field(gt=0,  description="MSRP in CAD")
    freight_pdi:        Decimal = Field(ge=0,  description="Freight & PDI charges in CAD")
    cap_cost:           Decimal = Field(gt=0,  description="Negotiated selling price in CAD")
    residual_percent:   Decimal = Field(gt=0, lt=1, description="Residual as decimal (0.59 = 59%)")
    money_factor:       Decimal = Field(ge=0, description="Money factor (e.g. 0.00166)")
    term_months:        int     = Field(gt=0, le=84)
    annual_km:          int     = Field(gt=0, le=50000)
    province_code:      str     = Field(min_length=2, max_length=2)
    down_payment:       Decimal = Field(default=Decimal("0"), ge=0)
    trade_equity:       Decimal = Field(default=Decimal("0"))
    cash_incentives:    Decimal = Field(default=Decimal("0"), ge=0)
    acquisition_fee:    Decimal = Field(default=Decimal("675"), ge=0)
    provincial_fees:    Decimal = Field(default=Decimal("0"), ge=0)

    @field_validator("province_code")
    @classmethod
    def uppercase_province(cls, v: str) -> str:
        return v.upper()


class CalculatorResponse(BaseModel):
    """Full output of a lease calculation."""

    monthly_total:          Decimal
    monthly_pre_tax:        Decimal
    monthly_tax:            Decimal
    monthly_depreciation:   Decimal
    monthly_finance:        Decimal
    drive_off:              Decimal
    total_cost_of_lease:    Decimal
    residual_amount:        Decimal
    adjusted_cap_cost:      Decimal
    effective_discount_pct: Decimal
    payment_to_msrp_ratio:  Decimal
    apr_equivalent:         Decimal
    bc_luxury_surtax:       Decimal
    qc_tax_split:           dict[str, Decimal] | None = None


@router.post("/compute", response_model=CalculatorResponse)
async def compute_lease(req: CalculatorRequest) -> CalculatorResponse:
    """
    Compute every output for a lease scenario.

    Returns the canonical numbers the user sees in the calculator output card.
    """
    try:
        province_rate = lease_tax_rate(req.province_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    surtax = bc_luxury_monthly_surtax(
        msrp_plus_freight=req.msrp + req.freight_pdi,
        province_code=req.province_code,
        term_months=req.term_months,
    )

    inputs = LeaseInputs(
        msrp=req.msrp,
        freight_pdi=req.freight_pdi,
        cap_cost=req.cap_cost,
        residual_percent=req.residual_percent,
        money_factor=req.money_factor,
        term_months=req.term_months,
        annual_km=req.annual_km,
        down_payment=req.down_payment,
        trade_equity=req.trade_equity,
        cash_incentives=req.cash_incentives,
        acquisition_fee=req.acquisition_fee,
        provincial_fees=req.provincial_fees,
    )

    out = calculate_lease(inputs, province_rate, surtax)

    qc_split = None
    if req.province_code == "QC":
        gst, qst = split_qc_tax(out.monthly_pre_tax)
        qc_split = {"gst": gst, "qst": qst}

    return CalculatorResponse(
        monthly_total=out.monthly_total,
        monthly_pre_tax=out.monthly_pre_tax,
        monthly_tax=out.monthly_tax,
        monthly_depreciation=out.monthly_depreciation,
        monthly_finance=out.monthly_finance,
        drive_off=out.drive_off,
        total_cost_of_lease=out.total_cost_of_lease,
        residual_amount=out.residual_amount,
        adjusted_cap_cost=out.adjusted_cap_cost,
        effective_discount_pct=out.effective_discount_pct,
        payment_to_msrp_ratio=out.payment_to_msrp_ratio,
        apr_equivalent=mf_to_apr(req.money_factor),
        bc_luxury_surtax=surtax,
        qc_tax_split=qc_split,
    )

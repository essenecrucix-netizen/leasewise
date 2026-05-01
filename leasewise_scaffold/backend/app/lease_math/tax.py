"""
Provincial tax application for vehicle leases.

Lease tax in Canada is applied to each monthly payment, not to the full
purchase price up front. The rate that applies depends on the province
where the customer registers the vehicle, not the dealer's province.

Combined rates as of May 2026. Update this table when rates change; the
calculator endpoint is the single point of truth for the customer-facing
math, and these rates flow through to every output.
"""

from decimal import Decimal
from typing import Final


DEC = Decimal


# Combined effective lease-tax rate by province code.
# - ON, NB, NL, NS, PE: HST (combined federal+provincial)
# - QC: GST + QST applied compoundingly (GST first, QST on the GST-inclusive amount)
# - BC, MB, SK: GST + PST
# - AB, NT, NU, YT: GST only (no provincial sales tax)
PROVINCIAL_LEASE_TAX_RATE: Final[dict[str, Decimal]] = {
    "AB": DEC("0.05"),       # 5 % GST
    "BC": DEC("0.12"),       # 5 % GST + 7 % PST
    "MB": DEC("0.12"),       # 5 % GST + 7 % PST
    "NB": DEC("0.15"),       # HST 15 %
    "NL": DEC("0.15"),       # HST 15 %
    "NS": DEC("0.15"),       # HST 15 %
    "NT": DEC("0.05"),       # GST only
    "NU": DEC("0.05"),       # GST only
    "ON": DEC("0.13"),       # HST 13 %
    "PE": DEC("0.15"),       # HST 15 %
    "QC": DEC("0.14975"),    # 5 % GST then 9.975 % QST compounded → effective 14.975 %
    "SK": DEC("0.11"),       # 5 % GST + 6 % PST
    "YT": DEC("0.05"),       # GST only
}


def lease_tax_rate(province_code: str) -> Decimal:
    """
    Return the combined effective lease-tax rate for a province.

    Args:
        province_code: Two-letter uppercase code (AB, BC, ON, QC, etc.).

    Returns:
        Decimal rate, e.g. 0.13 for Ontario.

    Raises:
        ValueError: if the province code is unknown.
    """
    code = province_code.upper().strip()
    rate = PROVINCIAL_LEASE_TAX_RATE.get(code)
    if rate is None:
        raise ValueError(
            f"Unknown province code: {province_code!r}. "
            f"Expected one of {sorted(PROVINCIAL_LEASE_TAX_RATE.keys())}."
        )
    return rate


def split_qc_tax(monthly_pre_tax: Decimal) -> tuple[Decimal, Decimal]:
    """
    For Quebec only: return the (GST, QST) split for a given pre-tax amount.

    Quebec applies QST on top of the GST-inclusive amount, so the effective
    rate (14.975 %) is not simply 5 + 9.975. Customers want to see the split
    on their worksheet.

    Returns:
        (gst_amount, qst_amount). Sum equals total tax for the period.
    """
    gst_rate = DEC("0.05")
    qst_rate = DEC("0.09975")

    gst = (monthly_pre_tax * gst_rate).quantize(DEC("0.01"))
    qst = ((monthly_pre_tax + gst) * qst_rate).quantize(DEC("0.01"))
    return gst, qst

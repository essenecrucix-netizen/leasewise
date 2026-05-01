"""
Money factor / APR conversion.

Money factor is the lease-equivalent of an interest rate, expressed as a
small decimal (e.g. 0.00166). To convert to APR, multiply by 2400. To
convert APR to money factor, divide by 2400.

This module exists because:
  1. Dealers quote one or the other depending on what's convenient for them.
  2. The customer should always see both, with the relationship made
     explicit. Dealer money-factor markup is the single biggest hidden cost
     in a Canadian lease, and surfacing the conversion is a defense.
"""

from decimal import Decimal


DEC = Decimal


def mf_to_apr(money_factor: Decimal) -> Decimal:
    """
    Convert money factor to APR.

    Example:
        >>> mf_to_apr(Decimal("0.00166"))
        Decimal('3.984')
    """
    return (money_factor * DEC("2400")).quantize(DEC("0.001"))


def apr_to_mf(apr_percent: Decimal) -> Decimal:
    """
    Convert APR (as a percent, e.g. 3.99) to money factor.

    Example:
        >>> apr_to_mf(Decimal("3.99"))
        Decimal('0.00166250')
    """
    return (apr_percent / DEC("2400")).quantize(DEC("0.00000001"))


def detect_input_type(raw: float | str | Decimal) -> Decimal:
    """
    Heuristic: was the user typing money factor or APR?

    Money factors are always < 0.01. APRs are always > 0.5. The gap between
    them is wide enough to be unambiguous.

    Returns the value as a money factor regardless of which the user typed.
    """
    value = Decimal(str(raw))
    if value < DEC("0.01"):
        return value                    # already a money factor
    return apr_to_mf(value)             # APR → money factor

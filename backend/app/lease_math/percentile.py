"""
Percentile scoring for the deal rater.

Given a candidate deal (vehicle + term + province + monthly payment), return
the percentile this payment occupies in the distribution of comparable deals
from `market_deals` over the trailing 90 days. Lower payment = better deal =
higher percentile.

Phase 1.1 stub: returns None when the deals table is empty or insufficiently
populated. The deal rater UI shows "insufficient data" in that state. Real
implementation lands in Phase 1.3 alongside the rater service.
"""

from collections.abc import Sequence
from decimal import Decimal


# Minimum number of comparable deals before a percentile is meaningful.
# Below this threshold, score_against_distribution returns None.
MIN_COMPARABLES: int = 10


def score_against_distribution(
    candidate_payment: Decimal,
    comparable_payments: Sequence[Decimal],
) -> Decimal | None:
    """
    Return the percentile rank (0-100) of `candidate_payment` against the
    distribution of `comparable_payments`.

    Lower payment → better deal → higher percentile. A payment lower than
    every comparable returns 100; higher than every comparable returns 0.

    Returns None if the comparable set is too small to be statistically
    meaningful (fewer than MIN_COMPARABLES).

    Note:
        This is a pure function over a list. The caller is responsible for
        querying market_deals and passing in comparable_payments. The
        decision of "what counts as comparable" (same trim? same term band?
        same province? rolling 90 days?) lives in the rater service.

    TODO(phase-1.3):
        Once market_deals is populated by ingestion, the rater service will
        call this with a real comparable set. Until then, this returns None
        for the stub state.
    """
    n = len(comparable_payments)
    if n < MIN_COMPARABLES:
        return None

    # Lower payment = better deal. Count how many comparables are >= candidate.
    better_or_equal = sum(1 for p in comparable_payments if p >= candidate_payment)
    pct = (Decimal(better_or_equal) / Decimal(n)) * Decimal("100")
    return pct.quantize(Decimal("0.1"))

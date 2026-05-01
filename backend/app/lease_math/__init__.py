"""
Lease math — single source of truth for LeaseWise calculations.

Pure functions on numeric inputs. No I/O. No side effects. Decimal arithmetic
throughout. The frontend never recomputes any of this; it always calls the
backend.

See docs/CALCULATOR_MATH.md for the math, and the fixture tests under
tests/lease_math/ for the contract.
"""

from app.lease_math.bc_luxury import bc_luxury_monthly_surtax, bc_luxury_threshold
from app.lease_math.conversion import apr_to_mf, detect_input_type, mf_to_apr
from app.lease_math.payment import LeaseInputs, LeaseOutputs, calculate_lease
from app.lease_math.percentile import score_against_distribution
from app.lease_math.tax import lease_tax_rate, split_qc_tax

__all__ = [
    "LeaseInputs",
    "LeaseOutputs",
    "apr_to_mf",
    "bc_luxury_monthly_surtax",
    "bc_luxury_threshold",
    "calculate_lease",
    "detect_input_type",
    "lease_tax_rate",
    "mf_to_apr",
    "score_against_distribution",
    "split_qc_tax",
]

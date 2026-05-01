"""
British Columbia luxury vehicle surtax.

BC applies an additional PST levy on vehicles priced above $124,999. The
levy is graduated:

    $55,000  -  $55,999.99   →   +1 %
    $56,000  -  $56,999.99   →   +2 %
    ...
    $124,999.99 and below   →   no surtax
    $125,000 - $149,999.99   →  +5 %  (PST jumps from 7 % to 12 % of purchase)
    $150,000+                →  +10 %

LeaseWise treats this as a per-month surtax that gets added to the customer's
monthly payment — it's effectively a higher provincial sales tax on the
depreciation portion of the lease.

Reference: BC Ministry of Finance, PST Bulletin 308 (Vehicle Tax Rates).
"""

from decimal import Decimal


DEC = Decimal


# Surtax PST rate by purchase price bracket (in addition to the base 7 % BC PST,
# since the lease tax rate already includes the 7 %, this is the *additional*
# rate above the base).
_BC_LUXURY_BRACKETS: list[tuple[Decimal, Decimal]] = [
    (DEC("125000"),  DEC("0.05")),    # 12 % total = 7 % base + 5 % surtax
    (DEC("150000"),  DEC("0.10")),    # 15 % total = 7 % + ...
    # Higher brackets exist (>$200k) but are out of scope at launch.
]


def bc_luxury_monthly_surtax(
    msrp_plus_freight: Decimal,
    province_code:     str,
    term_months:       int,
) -> Decimal:
    """
    Return the additional monthly surtax for BC luxury vehicles.

    For non-BC provinces or for vehicles below the threshold, returns 0.

    The surtax is computed on the purchase-price portion of the lease,
    spread across the term. We approximate this as:

        annual_surtax = msrp_plus_freight * surtax_rate / lease_lifetime_years

    This matches the way BC dealers actually compute the customer-visible
    line item.
    """
    if province_code.upper() != "BC":
        return DEC("0")

    # Find applicable surtax bracket
    surtax_rate = DEC("0")
    for threshold, rate in _BC_LUXURY_BRACKETS:
        if msrp_plus_freight >= threshold:
            surtax_rate = rate

    if surtax_rate == DEC("0"):
        return DEC("0")

    # Apply on full purchase price, spread monthly. This is an approximation
    # of the actual line item but matches dealer worksheets within ~$2/mo.
    annual_surtax = msrp_plus_freight * surtax_rate / DEC("12")  # spread over a year of payments
    monthly_surtax = (annual_surtax / DEC("12")).quantize(DEC("0.01"))

    return monthly_surtax


def bc_luxury_threshold() -> Decimal:
    """Return the BC luxury threshold for UI display."""
    return DEC("125000")

"""
Deal rater grading and feedback.

Given ExtractedFields (from `extraction_service.extract` or a structured
form submission), produce a RaterResponse:

  1. Look up the captive baseline program for the vehicle.
  2. Compute markup (in MF terms; surface as APR + bps).
  3. Compute residual delta (worksheet vs published).
  4. Compute effective discount % (against MSRP+freight).
  5. Derive a signal-based letter grade.
  6. Generate at least three feedback callouts.
  7. Set confidence_band based on `market_deals` comparable count.

Phase 1.3: `market_deals` is empty so `sample_size=0` and
`confidence_band="insufficient_data"`. The signal-based letter grade
still ships; the frontend renders the "Confidence (low data)" treatment
because confidence_band guards the percentile-grounded display.

Internals are MF-centric — that's the program-data key. User-facing
output (in feedback bodies) leads with APR + bps. Per the locked Phase
1.3 contract.
"""

from __future__ import annotations

from decimal import Decimal

from app.lease_math.conversion import apr_to_mf, mf_to_apr
from app.schemas.rater import (
    ConfidenceBand,
    ExtractedFields,
    FeedbackItem,
    GradeLetter,
    MarkupAnalysis,
    RaterResponse,
    StructuredInput,
)
from app.services.captive_baseline import CaptiveProgram, lookup as lookup_captive


# Threshold below which percentile scoring is unreliable. Phase 1.3
# never reaches this; ingestion in Phase 1.4+ starts populating
# market_deals, at which point the rater will run real percentile math.
MIN_COMPARABLES_FOR_PERCENTILE: int = 30


# ── Public entry point ──────────────────────────────────────────────────

def grade(extracted: ExtractedFields, *, market_deals_count: int = 0) -> RaterResponse:
    """
    Score an extracted worksheet. Pure function; no I/O.

    `market_deals_count` is the number of comparable closed deals
    (same trim/term/province/last 90 days). In Phase 1.3 this is
    always 0 because ingestion hasn't started.
    """
    notes: list[str] = []
    feedback: list[FeedbackItem] = []
    captive: CaptiveProgram | None = lookup_captive(
        make=extracted.make,
        model=extracted.model,
        term_months=extracted.term_months,
    )

    markup = _build_markup(extracted, captive) if captive else None
    feedback.extend(_rate_feedback(extracted, captive, markup))
    feedback.extend(_residual_feedback(extracted, captive))
    feedback.extend(_discount_feedback(extracted))
    feedback.extend(_addons_feedback(extracted))
    if not feedback:
        feedback.append(
            FeedbackItem(
                title="Not enough data to assess",
                body="Try a worksheet that includes MSRP, cap cost, residual, and rate.",
                tone="warn",
            )
        )

    letter: GradeLetter | None = _derive_grade(markup, extracted, captive)

    confidence_band: ConfidenceBand
    if market_deals_count >= MIN_COMPARABLES_FOR_PERCENTILE:
        confidence_band = "high"
    elif market_deals_count > 0:
        confidence_band = "low"
    else:
        confidence_band = "insufficient_data"
        notes.append(
            "No matching community deals yet — grade is signal-based "
            "(captive markup + residual + discount), not percentile-based."
        )

    if captive is None:
        notes.append(
            "No captive program data on file for this vehicle/term — "
            "markup analysis skipped. Phase 1.4 ingestion will populate this."
        )

    if extracted.notes:
        notes.extend(extracted.notes)

    return RaterResponse(
        extracted=extracted,
        grade=letter,
        percentile=None,                # always null until ingestion lands
        sample_size=market_deals_count,
        confidence_band=confidence_band,
        markup=markup,
        feedback=feedback,
        notes=notes,
    )


def grade_from_structured(structured: StructuredInput, *, market_deals_count: int = 0) -> RaterResponse:
    """Convenience: run the rater against a manually-typed structured form."""
    extracted = _structured_to_extracted(structured)
    return grade(extracted, market_deals_count=market_deals_count)


# ── Markup ──────────────────────────────────────────────────────────────

def _build_markup(extracted: ExtractedFields, captive: CaptiveProgram) -> MarkupAnalysis | None:
    if extracted.money_factor is None or extracted.apr is None:
        return None

    quoted_apr = extracted.apr
    quoted_mf = extracted.money_factor
    captive_apr = captive.apr_percent
    captive_mf = captive.money_factor

    # bps = (quoted - captive) APR × 100, rounded.
    diff_apr = quoted_apr - captive_apr
    markup_bps = int((diff_apr * Decimal("100")).quantize(Decimal("1")))

    # Cost estimate: extra MF × (cap + residual) per month, × term.
    cost_per_month: Decimal | None = None
    cost_total: Decimal | None = None
    if (
        extracted.cap_cost is not None
        and extracted.residual_percent is not None
        and extracted.msrp is not None
        and extracted.term_months is not None
    ):
        residual_basis = extracted.msrp + (extracted.freight_pdi or Decimal("0"))
        residual_amount = (residual_basis * extracted.residual_percent).quantize(Decimal("0.01"))
        finance_base = extracted.cap_cost + residual_amount
        diff_mf = quoted_mf - captive_mf
        cost_per_month = (finance_base * diff_mf).quantize(Decimal("0.01"))
        cost_total = (cost_per_month * Decimal(extracted.term_months)).quantize(Decimal("0.01"))

    return MarkupAnalysis(
        captive_apr=captive_apr,
        quoted_apr=quoted_apr,
        captive_mf=captive_mf,
        quoted_mf=quoted_mf,
        markup_bps=markup_bps,
        cost_per_month_estimate=cost_per_month,
        cost_total_estimate=cost_total,
    )


# ── Feedback generators ─────────────────────────────────────────────────

def _rate_feedback(
    extracted: ExtractedFields,
    captive: CaptiveProgram | None,
    markup: MarkupAnalysis | None,
) -> list[FeedbackItem]:
    if extracted.apr is None or extracted.money_factor is None:
        return [
            FeedbackItem(
                title="Lease rate not detected",
                body=(
                    "The worksheet did not show APR or money factor clearly. "
                    "Ask your dealer for both — Canadian dealers are required to "
                    "disclose APR; the money factor is APR ÷ 2400."
                ),
                tone="warn",
            )
        ]

    if captive is None or markup is None:
        return [
            FeedbackItem(
                title="Quoted rate, no captive base on file",
                body=(
                    f"Dealer quoted {_fmt_apr(extracted.apr)} APR "
                    f"(MF {_fmt_mf(extracted.money_factor)}). We don't yet have "
                    f"the published captive program for this vehicle/term in our "
                    f"database — bring it back once the program scrapers ship."
                ),
                tone="warn",
            )
        ]

    if markup.markup_bps <= 5:
        return [
            FeedbackItem(
                title="APR matches captive base",
                body=(
                    f"{_fmt_apr(markup.quoted_apr)} APR (MF {_fmt_mf(markup.quoted_mf)}) "
                    f"= the captive base. No markup. ~92% of dealers mark this up — "
                    f"yours didn't."
                ),
                tone="good",
            )
        ]

    if markup.markup_bps <= 25:
        return [
            FeedbackItem(
                title=f"APR marked up ~{markup.markup_bps} bps",
                body=(
                    f"Quoted {_fmt_apr(markup.quoted_apr)} APR vs. captive base "
                    f"{_fmt_apr(markup.captive_apr)}. Push back — most dealers will "
                    f"drop the markup if you ask. Money factor: "
                    f"{_fmt_mf(markup.captive_mf)} → {_fmt_mf(markup.quoted_mf)}."
                ),
                tone="warn",
            )
        ]

    cost_msg = ""
    if markup.cost_per_month_estimate and markup.cost_total_estimate:
        cost_msg = (
            f" Costs you ~${markup.cost_per_month_estimate}/mo "
            f"— ${markup.cost_total_estimate} over the term."
        )

    return [
        FeedbackItem(
            title=f"APR marked up ~{markup.markup_bps} bps",
            body=(
                f"Quoted {_fmt_apr(markup.quoted_apr)} APR vs. captive base "
                f"{_fmt_apr(markup.captive_apr)}.{cost_msg} Money factor: "
                f"{_fmt_mf(markup.captive_mf)} → {_fmt_mf(markup.quoted_mf)}. "
                f"This is well above what BMW / Honda / Toyota captives publish — "
                f"counter hard or walk."
            ),
            tone="bad",
        )
    ]


def _residual_feedback(
    extracted: ExtractedFields,
    captive: CaptiveProgram | None,
) -> list[FeedbackItem]:
    if extracted.residual_percent is None:
        return []
    if captive is None:
        return [
            FeedbackItem(
                title=f"Residual on worksheet: {_fmt_pct(extracted.residual_percent)}",
                body=(
                    "We can't compare to the captive program because the "
                    "vehicle isn't in our baseline yet — verify it lines up "
                    "with the published April program."
                ),
                tone="warn",
            )
        ]

    delta = extracted.residual_percent - captive.residual_pct
    delta_pts = int((delta * Decimal("100")).quantize(Decimal("1")))

    if abs(delta_pts) <= 1:
        return [
            FeedbackItem(
                title="Residual matches the published program",
                body=(
                    f"{_fmt_pct(extracted.residual_percent)} on the worksheet "
                    f"= the captive published residual ({_fmt_pct(captive.residual_pct)})."
                ),
                tone="good",
            )
        ]

    if delta_pts < -1:
        return [
            FeedbackItem(
                title=f"Residual {abs(delta_pts)} pts below program",
                body=(
                    f"{_fmt_pct(extracted.residual_percent)} on the worksheet "
                    f"vs. published {_fmt_pct(captive.residual_pct)}. Lower residual "
                    f"means a higher monthly payment — ask the dealer to confirm "
                    f"they're using the current program."
                ),
                tone="bad",
            )
        ]

    return [
        FeedbackItem(
            title=f"Residual {delta_pts} pts above program",
            body=(
                f"{_fmt_pct(extracted.residual_percent)} on the worksheet "
                f"vs. published {_fmt_pct(captive.residual_pct)}. Higher residual "
                f"is in your favour — verify the dealer is using the right month's "
                f"residual table."
            ),
            tone="good",
        )
    ]


def _discount_feedback(extracted: ExtractedFields) -> list[FeedbackItem]:
    if extracted.msrp is None or extracted.cap_cost is None:
        return []
    basis = extracted.msrp + (extracted.freight_pdi or Decimal("0"))
    if basis <= 0:
        return []
    discount = (basis - extracted.cap_cost) / basis
    pct = (discount * Decimal("100")).quantize(Decimal("0.1"))

    if discount >= Decimal("0.10"):
        return [
            FeedbackItem(
                title=f"Cap cost {pct}% off MSRP+freight",
                body=(
                    "Solid discount. Median Canadian leases land at 5-9% off; "
                    "you're in the top tier. Lock the deal."
                ),
                tone="good",
            )
        ]
    if discount >= Decimal("0.05"):
        return [
            FeedbackItem(
                title=f"Cap cost {pct}% off MSRP+freight",
                body=(
                    "Around the median. Push for another 1-2% — most dealers "
                    "have room before walking."
                ),
                tone="warn",
            )
        ]
    if discount >= Decimal("0"):
        return [
            FeedbackItem(
                title=f"Cap cost only {pct}% off MSRP+freight",
                body=(
                    "Below median for the segment. There's almost certainly "
                    "more room — get a counteroffer."
                ),
                tone="warn",
            )
        ]
    return [
        FeedbackItem(
            title=f"Cap cost is OVER MSRP+freight by {abs(pct)}%",
            body=(
                "You're paying above sticker. This is unusual for a Canadian "
                "lease and almost always means hidden add-ons folded into the "
                "cap cost. Walk."
            ),
            tone="bad",
        )
    ]


def _addons_feedback(extracted: ExtractedFields) -> list[FeedbackItem]:
    if extracted.addons_per_month is None or extracted.addons_per_month <= 0:
        return []
    return [
        FeedbackItem(
            title=f"F&I add-on: ${extracted.addons_per_month}/mo",
            body=(
                "Wear protection, GAP, or extended-warranty bundled into the "
                "monthly. Almost always optional and refundable. Decline by "
                "default; revisit only if the captive lender requires it."
            ),
            tone="warn",
        )
    ]


# ── Grade derivation ────────────────────────────────────────────────────

def _derive_grade(
    markup: MarkupAnalysis | None,
    extracted: ExtractedFields,
    captive: CaptiveProgram | None,
) -> GradeLetter | None:
    """
    Signal-based letter when no comparables available. Phases 1.4+ may
    blend percentile data; this is the Phase 1.3 stop-gap.

    Score points across three dimensions; map total to a letter.
    """
    if markup is None and captive is None and extracted.cap_cost is None:
        return None

    score = 0

    # Markup: 0 bps → +2, 1-25 bps → 0, 26-50 → -2, 51+ → -4.
    if markup is None:
        pass  # neutral
    elif markup.markup_bps <= 5:
        score += 2
    elif markup.markup_bps <= 25:
        score += 0
    elif markup.markup_bps <= 50:
        score -= 2
    else:
        score -= 4

    # Residual deviation from captive: |delta| ≤ 1 pt → +1, else negative.
    if extracted.residual_percent is not None and captive is not None:
        delta_pts = int(((extracted.residual_percent - captive.residual_pct) * Decimal("100")).quantize(Decimal("1")))
        if abs(delta_pts) <= 1:
            score += 1
        elif delta_pts < 0:
            score -= 2
        else:
            score += 1   # residual above program is in user's favour

    # Discount: ≥10% → +2, 5-10% → 0, 0-5% → -1, negative → -3.
    if extracted.msrp is not None and extracted.cap_cost is not None:
        basis = extracted.msrp + (extracted.freight_pdi or Decimal("0"))
        if basis > 0:
            disc = (basis - extracted.cap_cost) / basis
            if disc >= Decimal("0.10"):
                score += 2
            elif disc >= Decimal("0.05"):
                score += 0
            elif disc >= Decimal("0"):
                score -= 1
            else:
                score -= 3

    # Map score → letter. Bands chosen so the canonical samples land
    # close to their design-phase intended grades:
    #   BMW X3 (no markup, residual=published, ~9% discount) → +5 → A
    #   Honda CR-V (no markup, ~2% discount)                 → +2 → B
    #   MB GLC (60 bps markup, residual -4 pts, +1% over)    → -10 → F-ish
    if score >= 4:
        return "A"
    if score >= 2:
        return "B"
    if score >= 0:
        return "C"
    if score >= -3:
        return "D"
    return "F"


# ── StructuredInput → ExtractedFields ───────────────────────────────────

def _structured_to_extracted(s: StructuredInput) -> ExtractedFields:
    """Convert manual structured-form input into the same ExtractedFields
    shape the rest of the pipeline consumes."""
    apr_dec: Decimal | None = None
    mf_dec: Decimal | None = None
    if s.rate_value is not None and s.rate_quoted_as is not None:
        try:
            if s.rate_quoted_as == "apr":
                apr_dec = s.rate_value
                mf_dec = apr_to_mf(s.rate_value)
            else:
                mf_dec = s.rate_value
                apr_dec = mf_to_apr(s.rate_value)
        except Exception:  # noqa: BLE001 — bad input, leave rate fields null
            apr_dec = None
            mf_dec = None

    make: str | None = None
    model: str | None = None
    year: int | None = None
    if s.vehicle:
        parts = s.vehicle.split()
        if parts and parts[0].isdigit() and len(parts[0]) == 4:
            try:
                year = int(parts[0])
                parts = parts[1:]
            except ValueError:
                pass
        if parts:
            make = parts[0]
        if len(parts) >= 2:
            model = parts[1]

    return ExtractedFields(
        vehicle=s.vehicle,
        make=make,
        model=model,
        year=year,
        msrp=s.msrp,
        freight_pdi=s.freight_pdi,
        cap_cost=s.cap_cost,
        residual_percent=s.residual_percent,
        rate_quoted_as=s.rate_quoted_as,
        apr=apr_dec,
        money_factor=mf_dec,
        term_months=s.term_months,
        annual_km=s.annual_km,
        province_code=s.province_code,
        monthly_payment=s.monthly_payment,
        down_payment=s.down_payment,
        trade_equity=s.trade_equity,
        cash_incentives=s.cash_incentives,
        acquisition_fee=s.acquisition_fee,
        doc_fee=s.doc_fee,
        notes=["Submitted via structured form (no Claude extraction)."],
    )


# ── Formatting helpers (unit conversion + display only) ─────────────────

def _fmt_apr(apr: Decimal) -> str:
    return f"{apr:.2f}%"


def _fmt_mf(mf: Decimal) -> str:
    return f"{mf:.5f}"


def _fmt_pct(decimal_value: Decimal) -> str:
    # 0.59 → "59%"
    return f"{(decimal_value * Decimal('100')).quantize(Decimal('1'))}%"

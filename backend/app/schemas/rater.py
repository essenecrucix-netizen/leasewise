"""
Pydantic models for the deal rater API.

Wire contract: shipped over JSON between FastAPI and the frontend rater UI.
Decimals serialise as JSON strings (Pydantic default) — the frontend leaves
them as strings and only parses to Number for display.

Per the locked Phase 1.3 contract:

- Request supports three input modes: paste text, upload PDF (server-side
  text extracted then routed through `worksheet_text`), and a structured
  form (manual fields → `structured`).
- Response carries both APR and money factor — the dealer's worksheet
  "audit trail" lives in `extracted.rate_quoted_as`. Frontend leads with
  APR; the JSON contract carries both forms so no TS-side conversion
  library is needed.
- Markup computed internally in MF (matches `oem_programs.lease_rate`
  keying), exposed to the user as APR + bps.
- `confidence_band` separately conveys data quality. Phase 1.3 always
  returns "insufficient_data" because `market_deals` is empty; the UI
  treats that as the "Confidence (low data)" result state.
"""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ── Request ─────────────────────────────────────────────────────────────

class StructuredInput(BaseModel):
    """
    Manual-entry mode. The user types their fields directly instead of
    pasting a worksheet. Mirrors the calculator's input surface plus the
    monthly-payment line that grading needs.
    """

    model_config = ConfigDict(extra="forbid")

    vehicle:          str | None = None
    msrp:             Decimal | None = None
    freight_pdi:      Decimal | None = None
    cap_cost:         Decimal | None = None
    residual_percent: Decimal | None = None     # 0.59 for 59%
    rate_quoted_as:   Literal["apr", "money_factor"] | None = "apr"
    rate_value:       Decimal | None = None     # 3.99 if APR, 0.00166 if MF
    term_months:      int | None = None
    annual_km:        int | None = None
    province_code:    str | None = None
    monthly_payment:  Decimal | None = None
    down_payment:     Decimal | None = None
    trade_equity:     Decimal | None = None
    cash_incentives:  Decimal | None = None
    acquisition_fee: Decimal | None = None
    doc_fee:          Decimal | None = None


class RaterRequest(BaseModel):
    """
    One of three input modes:
      - `worksheet_text`: pasted worksheet (preferred path, Claude extracts)
      - `structured`:     manual structured form (no Claude needed)
      - upload PDF:       server-side text extraction → routed through
                          `worksheet_text` after the byte upload
    """

    worksheet_text: str | None = Field(
        default=None,
        description="Raw text pasted from a dealer worksheet. Sent to "
                    "Claude Haiku for structured extraction.",
        max_length=20_000,
    )
    structured: StructuredInput | None = None


# ── Extracted fields ────────────────────────────────────────────────────

RateQuotedAs = Literal["apr", "money_factor"]


class ExtractedFields(BaseModel):
    """
    What Claude (or the regex fallback) parsed out of the worksheet.

    `rate_quoted_as` records whether the dealer's paperwork showed APR
    (Canadian convention) or money factor (US convention from US-format
    software). Both `apr` and `money_factor` are populated regardless —
    the conversion is a unit conversion, not lease math.
    """

    vehicle:           str | None = None     # "2026 BMW X3 xDrive30i"
    make:              str | None = None
    model:             str | None = None
    year:              int | None = None
    trim:              str | None = None

    msrp:              Decimal | None = None
    freight_pdi:       Decimal | None = None
    cap_cost:          Decimal | None = None      # selling / negotiated price

    residual_percent:  Decimal | None = None      # 0.59 = 59%
    rate_quoted_as:    RateQuotedAs | None = None
    apr:               Decimal | None = None      # 3.99 — the canonical Canadian display
    money_factor:      Decimal | None = None      # 0.00166 — the US-internal pricing

    term_months:       int | None = None
    annual_km:         int | None = None
    province_code:     str | None = None          # AB / BC / ON / etc

    monthly_payment:   Decimal | None = None      # what the dealer quoted, taxed
    down_payment:      Decimal | None = None
    trade_equity:      Decimal | None = None
    cash_incentives:   Decimal | None = None      # loyalty / conquest cash
    acquisition_fee:   Decimal | None = None
    doc_fee:           Decimal | None = None      # dealer admin fee, F&I-attached
    addons_per_month:  Decimal | None = None      # GAP / wear / etc disclosed monthly

    raw_text_excerpt:  str | None = None          # first ~500 chars, audit trail
    notes:             list[str] = Field(default_factory=list)
    """Per-field caveats — fields that were ambiguous or missing."""


# ── Markup analysis ─────────────────────────────────────────────────────

class MarkupAnalysis(BaseModel):
    """
    Comparison of the dealer's quoted rate to the captive lender's
    published base. Markup is computed in money factor terms internally
    (that's the program-data key) and surfaced as APR + bps for the user.
    """

    captive_apr:               Decimal
    quoted_apr:                Decimal
    captive_mf:                Decimal
    quoted_mf:                 Decimal
    markup_bps:                int        # (quoted - captive) APR * 100
    cost_per_month_estimate:   Decimal | None = None
    cost_total_estimate:       Decimal | None = None


# ── Feedback callouts ───────────────────────────────────────────────────

FeedbackTone = Literal["good", "warn", "bad"]


class FeedbackItem(BaseModel):
    title: str
    body:  str
    tone:  FeedbackTone


# ── Response ────────────────────────────────────────────────────────────

GradeLetter   = Literal["A", "B", "C", "D", "F"]
ConfidenceBand = Literal["high", "medium", "low", "insufficient_data"]


class RaterResponse(BaseModel):
    """
    Result of scoring a worksheet.

    The frontend's seven result-state taxonomy maps to the response as:

      - "A" / "B" / "C" / "D" / "F"  →  confidence_band != "insufficient_data" AND grade is set
      - "Confidence (low data)"      →  confidence_band == "insufficient_data"
                                          (Phase 1.3 always; market_deals is empty)
      - "Error"                      →  HTTP 5xx OR `error` is set on the body

    `grade` is signal-based when comparable data is sparse — derived from
    markup + residual + discount checks, not from a percentile rank. When
    confidence_band == "insufficient_data" the frontend still has the
    letter to display contextually but renders the "Confidence (low data)"
    treatment instead of the full A/B/C/D/F card.
    """

    extracted:         ExtractedFields
    grade:             GradeLetter | None = None
    percentile:        int | None = None
    sample_size:       int = 0
    confidence_band:   ConfidenceBand = "insufficient_data"
    markup:            MarkupAnalysis | None = None
    feedback:          list[FeedbackItem] = Field(default_factory=list)
    notes:             list[str] = Field(default_factory=list)
    error:             str | None = None
    """Set when extraction or grading hit a recoverable failure. The HTTP
       response is still 200 — the UI flips to its Error variant. Hard
       failures (Claude unreachable, request malformed) raise typed
       exceptions and surface as 5xx through the global handler."""

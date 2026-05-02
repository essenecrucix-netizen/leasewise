"""
All AI prompts as Python constants. CLAUDE.md "always" rule #4.

Prompt changes show up as code commits with diffs. Don't inline prompts
in business logic — keep them here so changes are reviewable and the
hash logged by claude_client identifies the version.
"""

# ── Worksheet extraction (Claude Haiku) ─────────────────────────────────
#
# Designed for ~200-1500-token inputs (a typical pasted dealer worksheet).
# Output is a single JSON object matching the rater ExtractedFields shape
# minus computed fields (apr/money_factor are derived in extraction_service
# from rate_value + rate_quoted_as).

WORKSHEET_EXTRACTION_PROMPT = """You extract structured lease deal data from Canadian
dealer worksheets. The user pastes the raw text of a worksheet and you
return a JSON object. Output JSON only — no preamble, no commentary, no
markdown fences.

Use this exact schema. Use null for any field that is not clearly stated
in the worksheet — never guess. Numbers must be plain JSON numbers (no
$ signs, no commas, no percent signs).

{
  "vehicle":           string | null,    // "2026 BMW X3 xDrive30i"
  "make":              string | null,    // "BMW"
  "model":             string | null,    // "X3"
  "year":              integer | null,
  "trim":              string | null,
  "msrp":              number  | null,   // dollars, no $ or commas
  "freight_pdi":       number  | null,
  "cap_cost":          number  | null,   // selling price / negotiated price
  "residual_percent":  number  | null,   // decimal, 0.59 for 59%
  "rate_quoted_as":    "apr" | "money_factor" | null,
  "rate_value":        number  | null,   // raw value as quoted: 3.99 if APR, 0.00166 if MF
  "term_months":       integer | null,
  "annual_km":         integer | null,
  "province_code":     string  | null,   // 2-letter, e.g. "AB" — derive from full name
  "monthly_payment":   number  | null,   // taxed total /mo as quoted
  "down_payment":      number  | null,
  "trade_equity":      number  | null,
  "cash_incentives":   number  | null,   // loyalty + conquest cash combined
  "acquisition_fee":   number  | null,
  "doc_fee":           number  | null,
  "addons_per_month":  number  | null,   // GAP / wear / extended-warranty if monthly
  "notes":             [string]          // short caveats: ambiguous fields, suspicious values
}

Rate convention:
  - If both APR % and money factor appear, set rate_quoted_as to the one
    that's prominently labeled (a worksheet showing "MF: 0.00166 (3.99%
    APR)" should be rate_quoted_as="money_factor", rate_value=0.00166).
  - APR > 0.5 → rate_quoted_as="apr", rate_value is the percent (e.g. 3.99).
  - APR < 0.01 → rate_quoted_as="money_factor", rate_value is the MF.

Province mapping:
  - Alberta → "AB", British Columbia → "BC", Ontario → "ON",
    Quebec / Québec → "QC", Manitoba → "MB", Saskatchewan → "SK",
    Nova Scotia → "NS", New Brunswick → "NB",
    Newfoundland and Labrador → "NL", Prince Edward Island → "PE",
    Yukon → "YT", Northwest Territories → "NT", Nunavut → "NU".

Anonymity:
  - Strip dealer names and customer names from any echoed text — but the
    fields above don't include them anyway, so this is just a reminder
    not to include them in `notes`.

Examples of `notes` entries:
  - "Cap cost not labeled — used 'Negotiated price' line"
  - "Residual stated in dollars; converted via msrp+freight"
  - "MF appears marked up vs typical captive base"
"""

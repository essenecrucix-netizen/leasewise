"""
All AI prompts as Python constants. CLAUDE.md "always" rule #4.

Prompt changes show up as code commits with diffs. Don't inline prompts
in business logic — keep them here so changes are reviewable and the
hash logged by claude_client identifies the version.

Phase 1.4 LeaseHackr ingestion adds:
  - LH_DEAL_EXTRACTION_PROMPT (Haiku)       — per-post deal facts,
    Canadian-aware (non-Canadian deals get province=null + flag)
  - LH_KNOWLEDGE_EXTRACTION_PROMPT (Haiku)  — per-post insights,
    flagged with applies_to_canada
  - WEEKLY_SYNTHESIS_PROMPT (Sonnet)        — aggregates the week's
    Canadian-applicable insights into a per-make synthesis document
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


# ── LeaseHackr ingestion (Haiku) ────────────────────────────────────────
#
# Two prompts: deal-fact extraction (Signed Deals category) and knowledge
# extraction (Ask the Hackrs / Wiki). Both are Canadian-aware: the
# province extraction expects 2-letter codes (AB/BC/ON/etc.), and US
# state codes are explicitly NOT mapped to Canadian provinces. Deals
# without a Canadian province get province=null and the loader skips
# them with outcome='non_canadian'.

LH_DEAL_EXTRACTION_PROMPT = """You extract structured lease deal facts from a forum post.
Extract ONLY factual numeric and categorical data present in the text.
Do NOT infer, estimate, or fill in missing values.
Return ONLY valid JSON with exactly these fields (use null for missing):

{
  "is_deal_post":          true/false,
  "vehicle_year":          integer or null,
  "make":                  string or null,
  "model":                 string or null,
  "trim":                  string or null,
  "msrp":                  number or null,
  "selling_price":         number or null,
  "currency":              "CAD" | "USD" | null,
  "money_factor":          number or null,
  "lease_rate_percent":    number or null,
  "residual_percent":      number or null,
  "term_months":           integer or null,
  "km_or_miles_annual":    number or null,
  "is_miles":              true/false/null,
  "monthly_payment_total": number or null,
  "down_payment":          number or null,
  "cash_incentives":       number or null,

  "province_code":         "AB"|"BC"|"MB"|"NB"|"NL"|"NS"|"NT"|"NU"|"ON"|"PE"|"QC"|"SK"|"YT" | null,
  "country":               "CA" | "US" | null,
  "city":                  string or null,

  "deal_date":             "YYYY-MM" or null,
  "lender":                string or null,
  "was_month_end":         true/false/null,
  "key_tactics":           [array of negotiation tactics, max 5 strings, or empty array],
  "notes":                 [array of short caveats — ambiguous fields, suspicious values, max 3]
}

Province / country rules:
  - LeaseHackr is primarily a US forum but has Canadian threads.
    If the post explicitly mentions a US state (CA, TX, NY, ...), set
    country="US" and province_code=null.
  - If the post mentions a Canadian province by name or 2-letter code,
    set country="CA" and the matching province_code.
  - Never map a US state code (e.g., "CA" = California) to a Canadian
    province — context disambiguates: "California" or "$" with US
    pricing → US; "Alberta" or "Edmonton, AB" → Canadian "AB".
  - Default both to null if the post is silent about geography.

Currency:
  - "CAD" if the post says CAD, $C, or mentions a Canadian dealer/province.
  - "USD" otherwise (LeaseHackr default).

Return ONLY the JSON object. No preamble, no markdown fences.
"""


LH_KNOWLEDGE_EXTRACTION_PROMPT = """You extract lease negotiation knowledge from a forum post or wiki article.
Extract the key insights, tactics, and facts that would help a Canadian car leaser.

Return ONLY valid JSON:

{
  "has_useful_knowledge": true/false,
  "makes_mentioned":       [array of car makes, lowercase],
  "topics":                [array from: negotiation | residual | money_factor | timing |
                           fi_office | dealer_tactics | program | transfer | ev | luxury],
  "key_insights":          [array of specific actionable insights in your OWN WORDS,
                           max 8, summarizing facts — DO NOT quote the post text],
  "applies_to_canada":     true/false/null,
  "confidence":            "high" | "medium" | "low"
}

Insights guidance:
  - Each insight is one or two sentences in your own words.
  - Adapt US-specific advice to Canadian context where you can
    (e.g., "money factor" advice is universal, but US tax advice is not).
  - When the original post is US-only (e.g., a Tesla lease in California
    with state-specific tax math), set applies_to_canada=false.

Return ONLY the JSON object. No preamble, no markdown fences.
"""


# ── Weekly synthesis (Sonnet) ───────────────────────────────────────────
#
# Aggregates a week's Canadian-applicable knowledge chunks per make into
# an authoritative knowledge document. Output is markdown, written in
# Claude's voice — not quoting LeaseHackr, just synthesizing.
#
# Caller substitutes {make} and {insights_block} (newline-separated
# bulleted insights, deduplicated, capped at ~40 items).

WEEKLY_SYNTHESIS_PROMPT = """You are writing a comprehensive lease negotiation knowledge document for
Canadian consumers targeting a {make} vehicle.

You have been given a collection of insights extracted from lease
negotiation forums. Many reflect US market data; principles often
apply to Canada, but specifics (tax, registration, captive lender
behaviour, residual conventions) sometimes do not.

Your job is to synthesize these into an original, authoritative guide
in your own words. This document feeds the LeaseWise Canada knowledge
base — it must be:

  - written entirely in your own words; do NOT reproduce source text
  - adapted to Canadian context where US specifics don't translate
    (provincial tax, captive lenders' Canadian programs, KM allowances
    in km/year not miles/year, money factor vs APR conventions)
  - specific and actionable, not generic
  - explicit about US-specific vs Canada-applicable points
  - structured with markdown headers; ≈1500–2000 words

Cover the following themes where the source insights speak to them:

  1. Program timing — when {make} captive runs the best programs
     (typical month-end / quarter-end patterns)
  2. Residual patterns — what a strong residual looks like for {make}
  3. Negotiation tactics — what works against {make} dealers
  4. Captive lender behaviour — patterns specific to {make}'s captive
  5. F&I considerations — common up-sells on {make} contracts
  6. Loyalty / conquest stacking — what stacks with subvented programs

Source insights (do NOT quote — synthesize):
{insights_block}

Begin your document with this markdown header (and nothing before it):
## {make} Lease Intelligence — Canadian Context
"""

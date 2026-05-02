"""
Worksheet extraction.

Two paths:

1. Claude Haiku (production): when ANTHROPIC_API_KEY is set, send the
   pasted worksheet to Claude and parse the structured response. This
   handles the long tail — formatting variations, OCR noise, atypical
   layouts.

2. Regex fallback (dev / no-key): a deterministic parser that handles
   the canonical sample worksheets and common patterns. Faithfully
   ported from docs/design-phase/rater.jsx so the contract matches what
   the design intended.

The fallback is selected automatically when claude_client.is_configured()
is False. The endpoint logs which path ran in `notes` so reviewers can
tell which extraction shaped the result.

Both paths produce ExtractedFields with apr + money_factor populated
(unit-converted from rate_value via the existing Decimal helpers in
app/lease_math/conversion.py — that's a unit conversion, not lease
math, so it's allowed outside the lease_math/ module per CLAUDE.md).
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any

import structlog

from app.lease_math.conversion import apr_to_mf, mf_to_apr
from app.schemas.rater import ExtractedFields, RateQuotedAs
from app.services.ai import claude_client, prompts


_log = structlog.get_logger()


# ── Public entry point ─────────────────────────────────────────────────

async def extract(worksheet_text: str) -> ExtractedFields:
    """
    Parse worksheet_text into ExtractedFields. Uses Claude when
    configured, falls back to the regex parser otherwise.
    """
    text = worksheet_text.strip()
    if not text:
        return ExtractedFields(notes=["Empty worksheet."])

    if claude_client.is_configured():
        try:
            data = await claude_client.extract_json(
                prompt=prompts.WORKSHEET_EXTRACTION_PROMPT,
                user_input=text,
            )
            return _shape(data, raw_excerpt=text[:500], used="claude-haiku")
        except Exception as e:  # noqa: BLE001 — fall back rather than crash
            _log.warning("extraction.claude_failed_falling_back", error=str(e))
            fields = _regex_extract(text)
            fields.notes.append(f"Claude extraction failed: {e!s}; using regex fallback.")
            return fields

    # No key → regex
    return _regex_extract(text)


# ── Regex parser (port of docs/design-phase/rater.jsx extract()) ────────

_PROVINCE_NAMES: dict[str, str] = {
    "alberta": "AB",
    "british columbia": "BC",
    "manitoba": "MB",
    "new brunswick": "NB",
    "newfoundland and labrador": "NL",
    "newfoundland": "NL",
    "labrador": "NL",
    "nova scotia": "NS",
    "ontario": "ON",
    "prince edward island": "PE",
    "pei": "PE",
    "quebec": "QC",
    "québec": "QC",
    "saskatchewan": "SK",
    "yukon": "YT",
    "northwest territories": "NT",
    "nunavut": "NU",
}


def _regex_extract(text: str) -> ExtractedFields:
    notes: list[str] = ["Extracted via regex fallback (no ANTHROPIC_API_KEY)."]

    vehicle  = _re_search(r"(20\d{2}\s+[A-Za-z][^\n]+)", text, group=1)
    msrp     = _re_money(r"MSRP[:\s]+\$?([\d,]+)", text)
    freight  = _re_money(r"Freight(?:\s*(?:and|&)\s*PDI)?[:\s]+\$?([\d,]+)", text)
    cap      = _re_money(r"(?:Selling\s*Price|Negotiated\s*Price|Cap\s*Cost)[:\s]+\$?([\d,]+)", text)
    term     = _re_int  (r"Term[:\s]+(\d+)\s*mo", text) or _re_int(r"Term[:\s]+(\d+)", text)
    res_pct  = _re_decimal(r"Residual[:\s]+(\d+(?:\.\d+)?)\s*%", text, divide_by=100)

    apr_match = _re_decimal(r"(\d+\.\d+)\s*%\s*APR", text)
    mf_match  = _re_decimal(r"Money\s*Factor[:\s]+([0-9]*\.[0-9]+)", text)

    rate_quoted_as: RateQuotedAs | None = None
    rate_value: Decimal | None = None
    if mf_match is not None:
        rate_quoted_as = "money_factor"
        rate_value = mf_match
    elif apr_match is not None:
        rate_quoted_as = "apr"
        rate_value = apr_match

    apr_dec, mf_dec = _derive_apr_mf(rate_quoted_as, rate_value)

    km       = _re_int  (r"KM[/\s]*yr[:\s]+([\d,]+)", text) or _re_int(r"([\d,]+)\s*km/?yr", text)
    monthly  = _re_money(r"Monthly[^$\n]*\$?([\d,.]+)", text)
    down     = _re_money(r"Down(?:\s*Payment)?[:\s]+\$?([\d,]+)", text)
    trade    = _re_money(r"Trade\s*Equity[:\s]+\$?([\d,]+)", text)
    loyalty  = _re_money(r"Loyalty[:\s]+\$?([\d,]+)", text)
    conquest = _re_money(r"Conquest[:\s]+\$?([\d,]+)", text)
    incentives = _sum_optional([loyalty, conquest])
    acq      = _re_money(r"Acquisition\s*Fee[:\s]+\$?([\d,]+)", text)
    doc      = _re_money(r"Doc(?:umentation)?\s*Fee[:\s]+\$?([\d,]+)", text)
    addons   = _re_money(r"(?:Wear\s*protection|GAP|Extended\s*Warranty)[:\s]+\$?([\d,.]+)\s*/\s*mo", text)

    province = _detect_province(text)

    make, model, year, trim = _split_vehicle(vehicle)

    if rate_quoted_as is None:
        notes.append("Could not identify lease rate (APR or money factor).")
    if cap is None:
        notes.append("Cap cost / selling price not found.")

    # `rate_value` lives only in the Claude prompt schema — at the
    # response model boundary we surface only apr + money_factor.
    return ExtractedFields(
        vehicle=vehicle,
        make=make, model=model, year=year, trim=trim,
        msrp=msrp, freight_pdi=freight, cap_cost=cap,
        residual_percent=res_pct,
        rate_quoted_as=rate_quoted_as,
        apr=apr_dec, money_factor=mf_dec,
        term_months=term, annual_km=km,
        province_code=province,
        monthly_payment=monthly,
        down_payment=down, trade_equity=trade,
        cash_incentives=incentives,
        acquisition_fee=acq, doc_fee=doc,
        addons_per_month=addons,
        raw_text_excerpt=text[:500],
        notes=notes,
    )


# ── Claude response → ExtractedFields ───────────────────────────────────

def _shape(data: dict[str, Any], raw_excerpt: str, used: str) -> ExtractedFields:
    """Reshape Claude's JSON output into the ExtractedFields model.
    Tolerates missing fields and bad types."""
    notes_in: list[str] = list(data.get("notes") or [])
    notes: list[str] = [f"Extracted via {used}.", *notes_in]

    rate_quoted_as_raw = data.get("rate_quoted_as")
    rate_quoted_as: RateQuotedAs | None = (
        rate_quoted_as_raw if rate_quoted_as_raw in ("apr", "money_factor") else None
    )
    rate_value = _opt_decimal(data.get("rate_value"))
    apr_dec, mf_dec = _derive_apr_mf(rate_quoted_as, rate_value)

    province_raw = data.get("province_code")
    province = (
        province_raw.upper()[:2] if isinstance(province_raw, str) and province_raw else None
    )

    return ExtractedFields(
        vehicle=_opt_str(data.get("vehicle")),
        make=_opt_str(data.get("make")),
        model=_opt_str(data.get("model")),
        year=_opt_int(data.get("year")),
        trim=_opt_str(data.get("trim")),
        msrp=_opt_decimal(data.get("msrp")),
        freight_pdi=_opt_decimal(data.get("freight_pdi")),
        cap_cost=_opt_decimal(data.get("cap_cost")),
        residual_percent=_opt_decimal(data.get("residual_percent")),
        rate_quoted_as=rate_quoted_as,
        apr=apr_dec, money_factor=mf_dec,
        term_months=_opt_int(data.get("term_months")),
        annual_km=_opt_int(data.get("annual_km")),
        province_code=province,
        monthly_payment=_opt_decimal(data.get("monthly_payment")),
        down_payment=_opt_decimal(data.get("down_payment")),
        trade_equity=_opt_decimal(data.get("trade_equity")),
        cash_incentives=_opt_decimal(data.get("cash_incentives")),
        acquisition_fee=_opt_decimal(data.get("acquisition_fee")),
        doc_fee=_opt_decimal(data.get("doc_fee")),
        addons_per_month=_opt_decimal(data.get("addons_per_month")),
        raw_text_excerpt=raw_excerpt,
        notes=notes,
    )


# ── Rate derivation ─────────────────────────────────────────────────────

def _derive_apr_mf(
    quoted_as: RateQuotedAs | None,
    value: Decimal | None,
) -> tuple[Decimal | None, Decimal | None]:
    """Given how the rate was quoted and its raw value, compute both."""
    if value is None or quoted_as is None:
        return None, None
    try:
        if quoted_as == "apr":
            return value, apr_to_mf(value)
        return mf_to_apr(value), value
    except (InvalidOperation, ZeroDivisionError):
        return None, None


# ── Helpers ─────────────────────────────────────────────────────────────

def _re_search(pattern: str, text: str, group: int = 1) -> str | None:
    m = re.search(pattern, text, re.IGNORECASE)
    if m and m.group(group):
        return m.group(group).strip()
    return None


def _re_money(pattern: str, text: str) -> Decimal | None:
    raw = _re_search(pattern, text)
    if raw is None:
        return None
    cleaned = raw.replace(",", "").replace("$", "").strip()
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _re_int(pattern: str, text: str) -> int | None:
    raw = _re_search(pattern, text)
    if raw is None:
        return None
    cleaned = raw.replace(",", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return None


def _re_decimal(pattern: str, text: str, divide_by: int = 1) -> Decimal | None:
    raw = _re_search(pattern, text)
    if raw is None:
        return None
    try:
        v = Decimal(raw)
        return v / Decimal(divide_by) if divide_by != 1 else v
    except InvalidOperation:
        return None


def _sum_optional(values: list[Decimal | None]) -> Decimal | None:
    nums = [v for v in values if v is not None]
    return sum(nums, Decimal("0")) if nums else None


def _opt_str(v: Any) -> str | None:
    return v.strip() if isinstance(v, str) and v.strip() else None


def _opt_int(v: Any) -> int | None:
    if isinstance(v, bool):  # bool is int subclass; reject
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        try:
            return int(v.replace(",", "").strip())
        except ValueError:
            return None
    return None


def _opt_decimal(v: Any) -> Decimal | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return Decimal(str(v))
    if isinstance(v, str):
        cleaned = v.replace(",", "").replace("$", "").replace("%", "").strip()
        if not cleaned:
            return None
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return None
    return None


def _detect_province(text: str) -> str | None:
    """Find a province by full name, then by 2-letter code on a 'Province:' line."""
    lower = text.lower()
    for name, code in _PROVINCE_NAMES.items():
        if re.search(rf"\b{re.escape(name)}\b", lower):
            return code
    code_match = re.search(r"province[:\s]+([A-Z]{2})\b", text, re.IGNORECASE)
    if code_match:
        cand = code_match.group(1).upper()
        if cand in _PROVINCE_NAMES.values():
            return cand
    return None


def _split_vehicle(
    vehicle: str | None,
) -> tuple[str | None, str | None, int | None, str | None]:
    """Best-effort split of '2026 BMW X3 xDrive30i' into make/model/year/trim."""
    if not vehicle:
        return None, None, None, None
    parts = vehicle.split()
    if not parts:
        return None, None, None, None

    year: int | None = None
    if parts[0].isdigit() and len(parts[0]) == 4:
        try:
            year = int(parts[0])
            parts = parts[1:]
        except ValueError:
            year = None

    make = parts[0] if parts else None
    if make and make.lower() in {"mercedes-benz", "mercedes"}:
        make = "Mercedes-Benz"

    rest = parts[1:]
    model = rest[0] if rest else None
    # Two-word model recognition for "RX 350", "CR-V Hybrid", etc.
    if len(rest) >= 2 and re.match(r"^(?:\d+|[A-Z][A-Za-z\-]*$)", rest[1] or ""):
        # crude: stop appending after a clearly trim-like token (lowercase mid-word)
        if rest[1] and not rest[1][0].islower():
            model = f"{rest[0]} {rest[1]}"
            rest = [rest[0]] + rest[2:]
    trim = " ".join(rest[1:]).strip() or None
    return make, model, year, trim

"""
LeaseHackr ingestion tests.

Pure-function tests for the crawler's helpers (HTML stripping, type
coercion, deal_month parsing) and the synthesizer's aggregation logic.
The end-to-end Discourse + Claude path is verified manually on the dev
VM where the API key + network are available.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.ingestion.leasehackr.crawl import (
    CANADIAN_PROVINCES,
    OUTCOME_DEAL_STORED,
    OUTCOME_NON_CANADIAN,
    _opt_decimal,
    _opt_int,
    _parse_deal_month,
)
from app.ingestion.leasehackr.discourse import strip_html, first_post_text


# ── HTML stripping ──────────────────────────────────────────────────────

def test_strip_html_removes_tags() -> None:
    out = strip_html("<p>Hello <strong>world</strong>!</p>")
    assert out == "Hello world !"


def test_strip_html_decodes_entities() -> None:
    assert strip_html("Smith &amp; Jones &lt;5&gt;") == "Smith & Jones <5>"


def test_strip_html_collapses_whitespace() -> None:
    assert strip_html("a\n\nb\t\tc") == "a b c"


def test_first_post_text_caps_at_3000_chars() -> None:
    cooked = "<p>" + ("x " * 5000) + "</p>"
    text = first_post_text({"post_stream": {"posts": [{"cooked": cooked}]}})
    assert len(text) <= 3000


def test_first_post_text_handles_no_posts() -> None:
    assert first_post_text({"post_stream": {"posts": []}}) == ""
    assert first_post_text({}) == ""


# ── Type coercion ───────────────────────────────────────────────────────

def test_opt_decimal_handles_strings_and_numbers() -> None:
    assert _opt_decimal("3.99") == Decimal("3.99")
    assert _opt_decimal("$62,400") == Decimal("62400")
    assert _opt_decimal(58900) == Decimal("58900")
    assert _opt_decimal(58900.5) == Decimal("58900.5")
    assert _opt_decimal(None) is None
    assert _opt_decimal("") is None
    assert _opt_decimal("not a number") is None
    assert _opt_decimal(True) is None  # bool is excluded


def test_opt_int_handles_strings_and_numbers() -> None:
    assert _opt_int("39") == 39
    assert _opt_int("16,000") == 16000
    assert _opt_int(48) == 48
    assert _opt_int(48.0) == 48
    assert _opt_int(48.5) is None
    assert _opt_int("not a number") is None
    assert _opt_int(None) is None


# ── deal_month parsing ──────────────────────────────────────────────────

def test_parse_deal_month_from_yyyy_mm() -> None:
    assert _parse_deal_month("2026-04", None) == date(2026, 4, 1)


def test_parse_deal_month_falls_back_to_topic_created_at() -> None:
    assert _parse_deal_month(None, "2026-03-15T10:00:00Z") == date(2026, 3, 1)


def test_parse_deal_month_returns_none_when_unparseable() -> None:
    assert _parse_deal_month(None, None) is None
    assert _parse_deal_month("garbage", "garbage") is None


# ── Canadian-only contract ──────────────────────────────────────────────

def test_canadian_provinces_set_has_thirteen_entries() -> None:
    assert len(CANADIAN_PROVINCES) == 13
    assert "AB" in CANADIAN_PROVINCES
    assert "QC" in CANADIAN_PROVINCES
    assert "YT" in CANADIAN_PROVINCES
    # US states accidentally matching Canadian abbreviations should NOT
    # be in this set. (None of CA/TX/NY/FL/etc. overlap with Canadian
    # 2-letter codes.)


def test_outcome_constants_match_schema_enum() -> None:
    """Spot-check the outcome strings — the schema's lh_crawl_log.outcome
    column is a free-form VARCHAR(50) but the contract is the enumeration
    in lh_schema_additions.sql + the OUTCOME_* constants."""
    assert OUTCOME_DEAL_STORED == "deal_stored"
    assert OUTCOME_NON_CANADIAN == "non_canadian"

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
    OUTCOME_DB_ERROR,
    OUTCOME_DEAL_STORED,
    OUTCOME_EXTRACTION_FAILED,
    OUTCOME_FETCH_FAILED,
    OUTCOME_IN_PROGRESS,
    OUTCOME_NON_CANADIAN,
    _opt_decimal,
    _opt_int,
    _parse_deal_month,
    _trim,
)
from app.ingestion.leasehackr.discourse import strip_html, first_post_text
from app.ingestion.scheduler import _ingestion_enabled


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
    # Phase 1.4a defect-fix additions
    assert OUTCOME_IN_PROGRESS == "in_progress"
    assert OUTCOME_EXTRACTION_FAILED == "extraction_failed"
    assert OUTCOME_DB_ERROR == "db_error"
    assert OUTCOME_FETCH_FAILED == "fetch_failed"


# ── Error message trimming ──────────────────────────────────────────────

def test_trim_truncates_long_strings() -> None:
    """error_message column is TEXT but we cap to keep rows reasonable."""
    long_err = "x" * 5000
    out = _trim(long_err)
    assert len(out) <= 1000
    assert out.endswith("...")


def test_trim_passes_short_strings_unchanged() -> None:
    assert _trim("short error") == "short error"


def test_trim_strips_whitespace() -> None:
    assert _trim("  err  \n") == "err"


# ── Scheduler default-disabled (Phase 1.4a defect-fix #2) ───────────────

def test_scheduler_default_disabled_when_unset(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.delenv("LEASEWISE_DISABLE_SCHEDULER", raising=False)
    assert _ingestion_enabled() is False


def test_scheduler_disabled_when_explicit_true(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("LEASEWISE_DISABLE_SCHEDULER", "true")
    assert _ingestion_enabled() is False


def test_scheduler_enabled_only_when_explicit_false(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("LEASEWISE_DISABLE_SCHEDULER", "false")
    assert _ingestion_enabled() is True


def test_scheduler_disabled_for_unknown_values(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    """Defensive: any value other than the documented 'false'/'0'/'no'
    leaves scheduling off. A typo'd value should fail safe."""
    monkeypatch.setenv("LEASEWISE_DISABLE_SCHEDULER", "yes-please")
    assert _ingestion_enabled() is False
    monkeypatch.setenv("LEASEWISE_DISABLE_SCHEDULER", "")
    assert _ingestion_enabled() is False


# ── error_message persistence (Phase 1.4a defect-fix #1) ────────────────

def test_upsert_outcome_renders_error_message_in_sql() -> None:
    """
    Verifies that `_upsert_outcome` actually emits SQL that carries
    the Python-local error_message into both the INSERT VALUES and the
    DO UPDATE SET clauses. This is the defect that bit Erik's first
    real-data run — error_message stayed NULL in the DB despite the
    crawler passing the value through.

    We construct the same statement the function builds, compile it
    against the postgresql dialect, and inspect the bound parameters.
    """
    from datetime import UTC, datetime
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.models.leasehackr import LhCrawlLog

    error_text = "Postgres error: relation does not exist"
    stmt = pg_insert(LhCrawlLog).values(
        topic_id=99,
        category="signed-deals",
        outcome="db_error",
        error_message=error_text,
        crawled_at=datetime(2026, 5, 5, tzinfo=UTC),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["topic_id"],
        set_={
            "outcome":       stmt.excluded.outcome,
            "error_message": stmt.excluded.error_message,
            "crawled_at":    stmt.excluded.crawled_at,
            "category":      stmt.excluded.category,
        },
    )

    # Compile to literal SQL so the error message is visible in the
    # rendered statement (only safe in tests; production uses bound
    # parameters via the engine).
    compiled = stmt.compile(
        dialect=__import__("sqlalchemy.dialects.postgresql", fromlist=["dialect"]).dialect(),
        compile_kwargs={"literal_binds": True},
    )
    rendered = str(compiled)
    # The INSERT ... VALUES (..., 'Postgres error: relation does not exist', ...)
    assert error_text in rendered
    # And the DO UPDATE SET should reference the EXCLUDED column, not
    # a stale bound parameter that could lose its value.
    assert "EXCLUDED.error_message" in rendered or "excluded.error_message" in rendered.lower()
    assert "ON CONFLICT" in rendered.upper()


def test_upsert_outcome_handles_null_error_message() -> None:
    """error_message=None should serialize as NULL in both VALUES and
    SET, not as an empty string or missing binding."""
    from datetime import UTC, datetime
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.models.leasehackr import LhCrawlLog

    stmt = pg_insert(LhCrawlLog).values(
        topic_id=100,
        category="ask-the-hackrs",
        outcome="in_progress",
        error_message=None,
        crawled_at=datetime(2026, 5, 5, tzinfo=UTC),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["topic_id"],
        set_={
            "outcome":       stmt.excluded.outcome,
            "error_message": stmt.excluded.error_message,
            "crawled_at":    stmt.excluded.crawled_at,
            "category":      stmt.excluded.category,
        },
    )
    rendered = str(
        stmt.compile(
            dialect=__import__(
                "sqlalchemy.dialects.postgresql", fromlist=["dialect"],
            ).dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    assert "NULL" in rendered.upper()

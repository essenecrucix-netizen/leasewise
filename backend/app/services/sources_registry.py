"""
Sources transparency registry.

Static snapshot of where LeaseWise data comes from. Each entry has a
human-readable name, what it covers, the method, a confidence band, and
a last-sync timestamp.

Phase 1.3: timestamps are placeholders for sources that don't yet sync
(captive bulletins, dealer worksheets, days-on-lot signal — those start
flowing in Phase 1.4 with the scrapers and rater submissions). Sources
that don't sync periodically (provincial tax rules, BC luxury surtax
brackets) have a real "last reviewed" date.

When ingestion lands, this module gets replaced by a live query against
`pipeline_runs` — but the public sources page contract on the frontend
stays identical.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Final

from app.schemas.sources import Source


def _hours_ago(h: int) -> datetime:
    return datetime.now(UTC) - timedelta(hours=h)


def _months_ago(*, year: int, month: int, day: int = 1) -> datetime:
    return datetime(year, month, day, tzinfo=UTC)


def _humanize(dt: datetime | None, *, kind: str = "auto") -> str | None:
    """Format a timestamp for the UI. kind='auto' picks 'Nh ago' for
    recent values and 'MMM D, YYYY' for older ones."""
    if dt is None:
        return None
    if kind == "absolute":
        return dt.strftime("%b %-d, %Y")
    delta = datetime.now(UTC) - dt
    if delta.total_seconds() < 60:
        return "just now"
    if delta.total_seconds() < 3600:
        return f"{int(delta.total_seconds() // 60)}m ago"
    if delta.total_seconds() < 86400:
        return f"{int(delta.total_seconds() // 3600)}h ago"
    if delta.days < 14:
        return f"{delta.days}d ago"
    return dt.strftime("%b %-d, %Y")


def list_sources() -> list[Source]:
    """Return the current sources manifest. Pure function, no I/O."""
    items: Final[list[tuple[str, str, str, datetime | None, str, str]]] = [
        # name, coverage, method, last_sync, last_sync_kind, confidence
        (
            "Captive lender bulletins",
            "BMW FS · Honda Financial · Toyota Financial · MB Financial · Lexus Financial · Volvo Cars Financial",
            "Direct partner feed + dealer-shared bulletins. Not yet syncing — "
            "ingestion ships in Phase 1.4.",
            None,
            "auto",
            "high",
        ),
        (
            "Dealer worksheet uploads",
            "Anonymized leases via /tools/deal-rater (paste / PDF / structured)",
            "Community uploads, parsed by Claude Haiku, peer-verified before "
            "scoring. Not yet flowing into market_deals at this phase.",
            None,
            "auto",
            "medium",
        ),
        (
            "Provincial tax rules",
            "GST / HST / PST / QST current rates · 13 jurisdictions",
            "Canada Revenue Agency + provincial finance ministries. "
            "Re-reviewed manually each quarter.",
            _months_ago(year=2026, month=4, day=1),
            "absolute",
            "high",
        ),
        (
            "BC luxury surtax thresholds",
            "$55k / $125k / $150k+ brackets",
            "BC Ministry of Finance — PST Bulletin 308 (Vehicle Tax Rates).",
            _months_ago(year=2026, month=4, day=1),
            "absolute",
            "high",
        ),
        (
            "Quebec QST treatment",
            "Lease tax base + compounding rules",
            "Revenu Québec — IN-203-V.",
            _months_ago(year=2026, month=1, day=1),
            "absolute",
            "high",
        ),
        (
            "MSRP & freight figures",
            "Reference vehicles seeded for Phase 1.3 calculator + rater",
            "OEM Canada websites + manufacturer build-and-price. "
            "Idempotent UPSERT via scripts/seed_reference_data.py.",
            _hours_ago(24),
            "auto",
            "high",
        ),
        (
            "Days-on-lot signal",
            "Inventory aging by VIN",
            "Dealer feeds (where available). Pipeline lands in Phase 1.4 "
            "alongside the MarketCheck integration.",
            None,
            "auto",
            "medium",
        ),
        (
            "Conquest / loyalty stackability",
            "Per-OEM stacking rules surfaced in deal rater feedback",
            "Aggregated from dealer F&I disclosures + community confirmations.",
            _months_ago(year=2026, month=4, day=14),
            "absolute",
            "medium",
        ),
    ]

    return [
        Source(
            name=name,
            coverage=coverage,
            method=method,
            last_sync=last_sync,
            last_sync_human=_humanize(last_sync, kind=kind),
            confidence=confidence,  # type: ignore[arg-type]
        )
        for (name, coverage, method, last_sync, kind, confidence) in items
    ]


def summary() -> dict[str, str | int]:
    """Summary stats for the live strip on the /sources page."""
    items = list_sources()
    n_synced = sum(1 for s in items if s.last_sync is not None)
    return {
        "datapoints_label":   f"{len(items)} sources · {n_synced} actively tracked",
        "coverage_label":     "13 provinces · 5 captive baselines (Phase 1.3)",
        "last_sync_label":    "Updated via redeploy (live ingestion: Phase 1.4)",
        "independence_label": "No paid placement",
        "n_sources":          len(items),
    }

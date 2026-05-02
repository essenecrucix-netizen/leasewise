"""
In-memory captive lender program data — Phase 1.3 stop-gap.

The schema's `oem_programs` table is the canonical home for this data,
but the scrapers that populate it land in Phase 1.4. Until then the
rater needs *something* to compute markup against, so we ship a small
hand-curated set covering the vehicles in the design-phase sample chips
(BMW X3, Honda CR-V Hybrid, Mercedes GLC, Lexus RX 350, Toyota RAV4
Hybrid).

When Phase 1.4 (or later) wires the scrapers, rater_service.lookup() is
the seam — replace this dict-backed helper with an oem_programs query
and the rest of the rater is unaffected.

Real April 2026 program rates per `docs/design-phase/data.js`. CLAUDE.md
"always" rule #7 — real Canadian data, not fake numbers.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class CaptiveProgram:
    make_normalized:  str         # "bmw", "honda", "mercedes-benz", "lexus", "toyota"
    model_normalized: str         # "x3", "cr-v hybrid", "glc 300", "rx 350", "rav4 hybrid"
    term_months:      int
    apr_percent:      Decimal     # canonical Canadian display
    money_factor:     Decimal     # internal pricing key
    residual_pct:     Decimal     # 0.59 = 59%
    annual_km:        int


# Note: programs published as APR by Canadian captives; MF is the
# straightforward APR/2400 conversion (unit conversion, not lease math).
# Computed once at module load.
def _p(make: str, model: str, term: int, apr: str, residual: str, km: int) -> CaptiveProgram:
    apr_dec = Decimal(apr)
    return CaptiveProgram(
        make_normalized=make,
        model_normalized=model,
        term_months=term,
        apr_percent=apr_dec,
        money_factor=(apr_dec / Decimal("2400")),
        residual_pct=Decimal(residual),
        annual_km=km,
    )


PROGRAMS: tuple[CaptiveProgram, ...] = (
    # BMW X3 xDrive30i — Apr 2026
    _p("bmw",           "x3",           36, "4.99", "0.62", 16000),
    _p("bmw",           "x3",           39, "3.99", "0.59", 16000),
    _p("bmw",           "x3",           48, "4.49", "0.51", 16000),
    # Honda CR-V Hybrid Touring
    _p("honda",         "cr-v hybrid",  36, "4.99", "0.65", 20000),
    _p("honda",         "cr-v hybrid",  48, "4.99", "0.55", 20000),
    # Mercedes-Benz GLC 300
    _p("mercedes-benz", "glc 300",      36, "5.99", "0.60", 18000),
    _p("mercedes-benz", "glc 300",      48, "5.49", "0.50", 18000),
    # Lexus RX 350 Premium
    _p("lexus",         "rx 350",       36, "5.49", "0.66", 16000),
    _p("lexus",         "rx 350",       48, "5.49", "0.55", 16000),
    # Toyota RAV4 Hybrid XLE AWD
    _p("toyota",        "rav4 hybrid",  36, "6.49", "0.64", 20000),
    _p("toyota",        "rav4 hybrid",  48, "6.49", "0.55", 20000),
    _p("toyota",        "rav4 hybrid",  60, "6.99", "0.45", 20000),
)


def _normalize(s: str | None) -> str:
    if not s:
        return ""
    return s.strip().lower().replace("-benz", "-benz")  # placeholder; case-fold only


def lookup(
    *,
    make: str | None,
    model: str | None,
    term_months: int | None,
) -> CaptiveProgram | None:
    """
    Find the captive program matching make/model/term. Forgiving on
    model: matches when the worksheet's model is a prefix of (or equal
    to) the program's model — so 'X3' matches 'x3', and 'CR-V Hybrid
    Touring' matches 'cr-v hybrid'.
    """
    if not make or not model or not term_months:
        return None
    m = _normalize(make)
    md = _normalize(model)
    for p in PROGRAMS:
        if p.term_months != term_months:
            continue
        if p.make_normalized != m:
            continue
        if md.startswith(p.model_normalized) or p.model_normalized.startswith(md):
            return p
    return None

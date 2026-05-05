"""
Seed BMW May 2026 oem_programs + brand_metadata (Phase 1.4b).

Adds the May 2026 BMW Financial Services lease programs to oem_programs
alongside the April 2026 captive_baseline-derived rows. Also populates
the brand_metadata row for BMW (captive lender description, negotiation
profile, F&I notes) — used by the /api/v1/brands/bmw endpoint.

These rates are illustrative placeholders pending real BMW Financial
Services May 2026 publishing. Update the PROGRAMS list below when Erik
confirms actual numbers.

Idempotent: re-running upserts on (make_id, trim_id, term_months,
km_allowance_annual, program_start_date) for oem_programs, and on the
unique `brand` column for brand_metadata.

Invocation:
    cd backend
    source .venv/bin/activate
    python ../scripts/seed_bmw_programs.py
"""

from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

import asyncpg


_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.core.config import settings  # noqa: E402


# ── BMW May 2026 program window ─────────────────────────────────────────

PROGRAM_START = date(2026, 5, 1)
PROGRAM_END   = date(2026, 5, 31)


@dataclass(frozen=True, slots=True)
class BmwProgram:
    """One BMW lease program. Rates stored on disk as DECIMAL(6,4) —
    e.g. lease_rate_percent=Decimal('0.0149') represents 1.49% APR.
    Residual is stored the same way: Decimal('0.5400') = 54%."""
    model_normalized:    str           # matches vehicle_models.model_name_normalized
    trim_normalized:     str | None    # matches vehicle_trims.trim_name_normalized; None = any trim
    province_code:       str | None    # 'QC' for Quebec-only program; None = national
    term_months:         int
    annual_km:           int
    lease_rate_percent:  Decimal       # 0.0149 for 1.49%
    residual_percent:    Decimal       # 0.5400 for 54%
    cash_incentive:      Decimal       # lease cash etc., at the program level


# Illustrative May 2026 BMW Financial Services programs.
# Replace with real numbers once Erik confirms.
PROGRAMS: list[BmwProgram] = [
    # X3 xDrive30i — National
    BmwProgram(
        model_normalized="x3", trim_normalized="xdrive30i",
        province_code=None,
        term_months=39, annual_km=16000,
        lease_rate_percent=Decimal("0.0149"),
        residual_percent=Decimal("0.5400"),
        cash_incentive=Decimal("2500.00"),
    ),
    # X3 xDrive30i — Quebec (slightly higher rate, lower residual)
    BmwProgram(
        model_normalized="x3", trim_normalized="xdrive30i",
        province_code="QC",
        term_months=39, annual_km=16000,
        lease_rate_percent=Decimal("0.0199"),
        residual_percent=Decimal("0.5200"),
        cash_incentive=Decimal("2000.00"),
    ),
    # 3 Series 330i xDrive — National (no incentive)
    BmwProgram(
        model_normalized="3 series", trim_normalized=None,
        province_code=None,
        term_months=48, annual_km=16000,
        lease_rate_percent=Decimal("0.0299"),
        residual_percent=Decimal("0.4800"),
        cash_incentive=Decimal("0.00"),
    ),
]


# ── Brand metadata (one row per brand) ──────────────────────────────────

BMW_METADATA = {
    "brand": "bmw",
    "captive_lender_name": "BMW Financial Services",
    "captive_lender_description": (
        "BMW Financial Services is the captive lender for BMW vehicles "
        "in Canada. They set residual values and money factors for all "
        "BMW leases. BMW FS programs typically run monthly with "
        "competitive rates on popular models like the X3, 3 Series, and "
        "X5."
    ),
    "negotiation_profile": (
        "BMW dealers in Canada operate with moderate negotiation flexibility. "
        "National programs are consistent, but dealer cash and volume bonuses "
        "create variability. Best results come from:\n\n"
        "- Month-end timing (last 5 days of the month)\n"
        "- Focusing on cap cost reduction rather than payment\n"
        "- Leveraging competing BMW dealer quotes (especially in "
        "Toronto/Vancouver/Calgary markets)\n"
        "- Understanding that X3 and 3 Series have the most competitive "
        "pricing due to volume\n"
        "- Being aware that M models and limited-production vehicles have "
        "minimal discount\n"
        "- Asking explicitly about loyalty bonuses (usually $1000-$1500) if "
        "you currently lease a BMW\n\n"
        "BMW dealers are generally professional but can be rigid on pricing "
        "for in-demand models. European Delivery programs (pre-COVID) offered "
        "additional savings but are currently suspended."
    ),
    "fi_considerations": (
        "BMW F&I offices typically push:\n\n"
        "- BMW Extended Warranty (overpriced vs third-party; negotiate or decline)\n"
        "- Tire & Rim Protection (reasonable at $400-600 for 4 years)\n"
        "- Paint Protection / Ceramic Coating (decline; overpriced dealer install)\n"
        "- GAP Insurance (check if your provincial auto insurance already covers this)\n"
        "- Loyalty Maintenance Package (can be value if you service at the dealer)\n\n"
        "BMW Financial Services contracts are generally clean with few gotchas. "
        "Watch for lease-end wear-and-tear charges — BMW is stricter than average "
        "on minor cosmetic damage."
    ),
}


# ── Seed routine ────────────────────────────────────────────────────────

async def _seed_programs(conn: asyncpg.Connection, captured_at: datetime) -> tuple[int, int, int]:
    """Returns (inserted, updated, skipped)."""
    bmw_row = await conn.fetchrow(
        "SELECT make_id, make_name FROM vehicle_makes WHERE make_name_normalized = $1",
        "bmw",
    )
    if bmw_row is None:
        raise RuntimeError(
            "No vehicle_makes row for bmw. Apply the schema first via "
            "./scripts/apply_schema.sh."
        )
    make_id   = bmw_row["make_id"]
    make_name = bmw_row["make_name"]

    n_inserted = 0
    n_updated  = 0
    n_skipped  = 0

    for p in PROGRAMS:
        # Resolve trim_id by joining models/trims under this make.
        if p.trim_normalized is not None:
            trim_row = await conn.fetchrow(
                """
                SELECT vt.trim_id, vt.trim_name, vm.model_name
                FROM vehicle_trims vt
                JOIN vehicle_models vm ON vm.model_id = vt.model_id
                WHERE vm.make_id = $1
                  AND vm.model_name_normalized = $2
                  AND vt.trim_name_normalized   = $3
                LIMIT 1
                """,
                make_id, p.model_normalized, p.trim_normalized,
            )
        else:
            trim_row = await conn.fetchrow(
                """
                SELECT vt.trim_id, vt.trim_name, vm.model_name
                FROM vehicle_trims vt
                JOIN vehicle_models vm ON vm.model_id = vt.model_id
                WHERE vm.make_id = $1
                  AND vm.model_name_normalized = $2
                LIMIT 1
                """,
                make_id, p.model_normalized,
            )

        if trim_row is None:
            print(
                f"!! No vehicle_trims row for bmw {p.model_normalized!r} "
                f"trim={p.trim_normalized!r}; skipping."
            )
            n_skipped += 1
            continue

        trim_id    = trim_row["trim_id"]
        trim_name  = trim_row["trim_name"]
        model_name = trim_row["model_name"]

        # Idempotency key matches seed_oem_programs.py: include province
        # so national + QC variants don't collide.
        existing = await conn.fetchrow(
            """
            SELECT program_id FROM oem_programs
            WHERE make_id = $1
              AND COALESCE(trim_id, -1)         = COALESCE($2, -1)
              AND term_months                   = $3
              AND km_allowance_annual           = $4
              AND program_start_date            = $5
              AND COALESCE(province_code, '--') = COALESCE($6, '--')
            """,
            make_id, trim_id, p.term_months, p.annual_km,
            PROGRAM_START, p.province_code,
        )

        if existing is None:
            await conn.execute(
                """
                INSERT INTO oem_programs (
                    make_id, trim_id,
                    make_name, model_name, model_year, trim_name,
                    province_code, region_description,
                    term_months, km_allowance_annual,
                    lease_rate_percent, residual_percent,
                    cash_incentive,
                    program_start_date, program_end_date, is_current,
                    source_url, captured_at
                ) VALUES (
                    $1, $2,
                    $3, $4, NULL, $5,
                    $6, $7,
                    $8, $9,
                    $10, $11,
                    $12,
                    $13, $14, TRUE,
                    'scripts/seed_bmw_programs.py',
                    $15
                )
                """,
                make_id, trim_id,
                make_name, model_name, trim_name,
                p.province_code,
                "Quebec" if p.province_code == "QC" else "national",
                p.term_months, p.annual_km,
                p.lease_rate_percent, p.residual_percent,
                p.cash_incentive,
                PROGRAM_START, PROGRAM_END, captured_at,
            )
            n_inserted += 1
            verb = "INSERTED"
        else:
            await conn.execute(
                """
                UPDATE oem_programs
                SET lease_rate_percent = $1,
                    residual_percent   = $2,
                    cash_incentive     = $3,
                    captured_at        = $4,
                    is_current         = TRUE
                WHERE program_id = $5
                """,
                p.lease_rate_percent, p.residual_percent, p.cash_incentive,
                captured_at, existing["program_id"],
            )
            n_updated += 1
            verb = "UPDATED"

        prov_label = p.province_code or "national"
        print(
            f"   bmw {model_name:<10} {trim_name or '(any)':<14} "
            f"{p.term_months}mo / {p.annual_km // 1000}k / "
            f"{p.lease_rate_percent * 100}% / "
            f"residual {(p.residual_percent * 100):.0f}% "
            f"({prov_label})  {verb}"
        )

    return n_inserted, n_updated, n_skipped


async def _seed_brand_metadata(conn: asyncpg.Connection) -> str:
    """Returns 'INSERTED' or 'UPDATED'."""
    existing = await conn.fetchrow(
        "SELECT id FROM brand_metadata WHERE brand = $1",
        BMW_METADATA["brand"],
    )
    if existing is None:
        await conn.execute(
            """
            INSERT INTO brand_metadata (
                brand, captive_lender_name, captive_lender_description,
                negotiation_profile, fi_considerations
            ) VALUES ($1, $2, $3, $4, $5)
            """,
            BMW_METADATA["brand"],
            BMW_METADATA["captive_lender_name"],
            BMW_METADATA["captive_lender_description"],
            BMW_METADATA["negotiation_profile"],
            BMW_METADATA["fi_considerations"],
        )
        return "INSERTED"
    await conn.execute(
        """
        UPDATE brand_metadata
        SET captive_lender_name        = $2,
            captive_lender_description = $3,
            negotiation_profile        = $4,
            fi_considerations          = $5,
            updated_at                 = NOW()
        WHERE brand = $1
        """,
        BMW_METADATA["brand"],
        BMW_METADATA["captive_lender_name"],
        BMW_METADATA["captive_lender_description"],
        BMW_METADATA["negotiation_profile"],
        BMW_METADATA["fi_considerations"],
    )
    return "UPDATED"


async def seed() -> None:
    print(
        f"-> Connecting to {settings.postgres_user}@{settings.postgres_host}:"
        f"{settings.postgres_port}/{settings.postgres_db}  "
        f"(ssl={'require' if settings.postgres_ssl else 'disable'})"
    )
    conn = await asyncpg.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        database=settings.postgres_db,
        ssl="require" if settings.postgres_ssl else False,
    )
    try:
        captured_at = datetime.now(UTC)
        async with conn.transaction():
            inserted, updated, skipped = await _seed_programs(conn, captured_at)
            md_verb = await _seed_brand_metadata(conn)

        total = await conn.fetchval(
            "SELECT COUNT(*) FROM oem_programs WHERE program_start_date = $1",
            PROGRAM_START,
        )
        print(
            f"\nOK seed complete.\n"
            f"  oem_programs (May 2026): {inserted} inserted, {updated} updated, "
            f"{skipped} skipped. Total May 2026 rows = {total}\n"
            f"  brand_metadata (bmw): {md_verb}"
        )
    finally:
        await conn.close()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()

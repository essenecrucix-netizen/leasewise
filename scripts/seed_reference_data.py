"""
Seed reference data — vehicle_models and vehicle_trims.

The schema DDL pre-populates `provinces`, `provincial_fees`, and
`vehicle_makes` via inline INSERT statements (see
docs/design-phase/lease_platform_schema.sql lines 88-200). This script
populates the remaining reference tables — vehicle_models and
vehicle_trims — using the real Canadian MSRPs and trim data from the
design-phase reference (docs/design-phase/data.js).

Idempotent: re-running is a no-op (UPSERTs on the unique constraints).

Invocation (from CLAUDE.md "One-time setup"):
    cd backend
    source .venv/bin/activate
    python ../scripts/seed_reference_data.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import asyncpg


# Make the backend package importable so we can pull settings from app.core.config.
_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.core.config import settings  # noqa: E402


# ── Reference data, ported verbatim from docs/design-phase/data.js ──────────
# Real 2025-2026 Canadian MSRPs and freight/PDI. Used by the calculator
# fixture tests and as anchors for the deal rater's percentile scoring.

@dataclass(frozen=True, slots=True)
class TrimSeed:
    make_normalized: str        # matches vehicle_makes.make_name_normalized
    model_name: str
    body_style: str
    segment: str
    drive_type: str
    model_year: int
    trim_name: str
    base_msrp: Decimal
    freight_pdi: Decimal
    fuel_type: str
    benchmark_residual_36mo: Decimal | None = None
    benchmark_residual_48mo: Decimal | None = None


SEED_TRIMS: list[TrimSeed] = [
    TrimSeed(
        make_normalized="bmw",
        model_name="X3", body_style="suv", segment="luxury_compact_suv", drive_type="awd",
        model_year=2026, trim_name="xDrive30i",
        base_msrp=Decimal("62400"), freight_pdi=Decimal("2480"),
        fuel_type="gas",
        benchmark_residual_36mo=Decimal("0.62"),
        benchmark_residual_48mo=Decimal("0.51"),
    ),
    TrimSeed(
        make_normalized="lexus",
        model_name="RX 350", body_style="suv", segment="luxury_midsize_suv", drive_type="awd",
        model_year=2025, trim_name="Premium",
        base_msrp=Decimal("64950"), freight_pdi=Decimal("2205"),
        fuel_type="gas",
        benchmark_residual_36mo=Decimal("0.66"),
        benchmark_residual_48mo=Decimal("0.55"),
    ),
    TrimSeed(
        make_normalized="toyota",
        model_name="RAV4 Hybrid", body_style="suv", segment="compact_suv", drive_type="awd",
        model_year=2026, trim_name="XLE AWD",
        base_msrp=Decimal("41450"), freight_pdi=Decimal("1930"),
        fuel_type="hybrid",
        benchmark_residual_36mo=Decimal("0.64"),
        benchmark_residual_48mo=Decimal("0.55"),
    ),
    TrimSeed(
        make_normalized="mercedes-benz",
        model_name="GLC 300", body_style="suv", segment="luxury_compact_suv", drive_type="awd",
        model_year=2025, trim_name="4MATIC",
        base_msrp=Decimal("60500"), freight_pdi=Decimal("2895"),
        fuel_type="gas",
        benchmark_residual_36mo=Decimal("0.60"),
        benchmark_residual_48mo=Decimal("0.50"),
    ),
    TrimSeed(
        make_normalized="honda",
        model_name="CR-V Hybrid", body_style="suv", segment="compact_suv", drive_type="awd",
        model_year=2026, trim_name="Touring",
        base_msrp=Decimal("49100"), freight_pdi=Decimal("1995"),
        fuel_type="hybrid",
        benchmark_residual_36mo=Decimal("0.65"),
        benchmark_residual_48mo=Decimal("0.55"),
    ),
]


# Tables we expect the schema DDL to have populated. We verify counts and
# print a warning if anything is unexpectedly empty — that means the schema
# was applied incorrectly, not that this seed script failed.
EXPECTED_PRESEEDED = {
    "provinces": 13,
    "vehicle_makes": 25,
}


# ── Operations ──────────────────────────────────────────────────────────────

async def _verify_preseeded(conn: asyncpg.Connection) -> None:
    """Confirm provinces and makes are present (populated by schema DDL)."""
    for table, expected_min in EXPECTED_PRESEEDED.items():
        count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
        if count is None or count < expected_min:
            raise RuntimeError(
                f"Expected at least {expected_min} rows in {table}, found {count}. "
                f"Has docs/design-phase/lease_platform_schema.sql been applied?"
            )
        print(f"   {table}: {count} rows present (ok)")


def _normalize(name: str) -> str:
    """Mirror the schema's *_normalized convention: lowercase, no spaces."""
    return name.lower().replace(" ", "-")


async def _upsert_model(
    conn: asyncpg.Connection,
    *,
    make_id: int,
    model_name: str,
    body_style: str,
    segment: str,
    drive_type: str,
) -> int:
    """Idempotent insert of vehicle_models. Returns model_id."""
    model_norm = _normalize(model_name)
    model_id = await conn.fetchval(
        """
        INSERT INTO vehicle_models
            (make_id, model_name, model_name_normalized, body_style, segment, drive_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (make_id, model_name_normalized) DO UPDATE
            SET body_style = EXCLUDED.body_style,
                segment    = EXCLUDED.segment,
                drive_type = EXCLUDED.drive_type
        RETURNING model_id
        """,
        make_id, model_name, model_norm, body_style, segment, drive_type,
    )
    return int(model_id)


async def _upsert_trim(conn: asyncpg.Connection, model_id: int, t: TrimSeed) -> None:
    """Idempotent insert of vehicle_trims."""
    trim_norm = _normalize(t.trim_name)
    await conn.execute(
        """
        INSERT INTO vehicle_trims (
            model_id, model_year, trim_name, trim_name_normalized,
            base_msrp, freight_pdi, fuel_type,
            benchmark_residual_36mo, benchmark_residual_48mo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (model_id, model_year, trim_name_normalized) DO UPDATE
            SET base_msrp                = EXCLUDED.base_msrp,
                freight_pdi              = EXCLUDED.freight_pdi,
                fuel_type                = EXCLUDED.fuel_type,
                benchmark_residual_36mo  = EXCLUDED.benchmark_residual_36mo,
                benchmark_residual_48mo  = EXCLUDED.benchmark_residual_48mo,
                updated_at               = NOW()
        """,
        model_id, t.model_year, t.trim_name, trim_norm,
        t.base_msrp, t.freight_pdi, t.fuel_type,
        t.benchmark_residual_36mo, t.benchmark_residual_48mo,
    )


async def seed() -> None:
    print(
        f"-> Connecting to {settings.postgres_user}@{settings.postgres_host}:"
        f"{settings.postgres_port}/{settings.postgres_db}"
    )
    conn = await asyncpg.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        database=settings.postgres_db,
    )
    try:
        print("-> Verifying schema-seeded reference tables...")
        await _verify_preseeded(conn)

        print(f"-> Upserting {len(SEED_TRIMS)} vehicle_models / vehicle_trims...")
        async with conn.transaction():
            # Resolve make_id once per make_normalized.
            make_ids: dict[str, int] = {}
            for t in SEED_TRIMS:
                if t.make_normalized not in make_ids:
                    row = await conn.fetchrow(
                        "SELECT make_id FROM vehicle_makes WHERE make_name_normalized = $1",
                        t.make_normalized,
                    )
                    if row is None:
                        raise RuntimeError(
                            f"vehicle_makes row not found for '{t.make_normalized}'. "
                            f"Has the schema DDL been applied?"
                        )
                    make_ids[t.make_normalized] = int(row["make_id"])

                model_id = await _upsert_model(
                    conn,
                    make_id=make_ids[t.make_normalized],
                    model_name=t.model_name,
                    body_style=t.body_style,
                    segment=t.segment,
                    drive_type=t.drive_type,
                )
                await _upsert_trim(conn, model_id, t)
                print(f"   {t.make_normalized} {t.model_name} {t.model_year} {t.trim_name}: ok")

        models = await conn.fetchval("SELECT COUNT(*) FROM vehicle_models")
        trims = await conn.fetchval("SELECT COUNT(*) FROM vehicle_trims")
        print(f"OK seed complete. vehicle_models={models}, vehicle_trims={trims}")
    finally:
        await conn.close()


def main() -> None:
    # Allow PG* env vars to override .env if needed (e.g. a one-off remote seed).
    if not settings.postgres_password and not os.environ.get("PGPASSWORD"):
        print("(note: POSTGRES_PASSWORD is empty — relying on host auth or PGPASSWORD)")
    asyncio.run(seed())


if __name__ == "__main__":
    main()

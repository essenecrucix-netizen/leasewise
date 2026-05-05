"""
Seed oem_programs from app/services/captive_baseline.py.

Phase 1.4: lifts the in-memory captive program data into the
oem_programs table so the rater can query it directly. The rater keeps
captive_baseline.py as a fallback when the table is empty (or for a
specific make/model/term combination it doesn't cover) — see
app/services/rater_service.py.

Phase 2 OEM scrapers will replace this script's role; oem_programs
becomes the live source of truth and captive_baseline.py is retired.

Idempotent: re-running upserts on (make_id, model_year, trim_id, term).
Empty fields (residual_amount, end_date, etc.) are populated where the
captive_baseline data has them.

Invocation:
    cd backend
    source .venv/bin/activate
    python ../scripts/seed_oem_programs.py
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, date, datetime
from pathlib import Path

import asyncpg


_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.core.config import settings  # noqa: E402
from app.services.captive_baseline import PROGRAMS  # noqa: E402


# Default: April 2026 program window (matches data.js / captive_baseline).
PROGRAM_START = date(2026, 4, 1)
PROGRAM_END   = date(2026, 4, 30)


async def seed() -> None:
    print(
        f"-> Connecting to {settings.postgres_user}@{settings.postgres_host}:"
        f"{settings.postgres_port}/{settings.postgres_db}  (ssl={'require' if settings.postgres_ssl else 'disable'})"
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
        # Resolve make_id once per make
        make_ids: dict[str, int] = {}
        rows = await conn.fetch(
            "SELECT make_id, make_name_normalized, make_name FROM vehicle_makes"
        )
        for r in rows:
            make_ids[r["make_name_normalized"]] = r["make_id"]
        if not make_ids:
            raise RuntimeError(
                "No vehicle_makes rows present. Apply the schema first via "
                "./scripts/apply_schema.sh."
            )

        captured_at = datetime.now(UTC)
        n_inserted = 0
        n_updated = 0

        async with conn.transaction():
            for p in PROGRAMS:
                make_id = make_ids.get(p.make_normalized)
                if make_id is None:
                    print(f"!! No vehicle_makes row for {p.make_normalized!r}; skipping.")
                    continue

                # Resolve trim_id (prefer matching trim, fall back to model-only).
                trim_row = await conn.fetchrow(
                    """
                    SELECT vt.trim_id
                    FROM vehicle_trims vt
                    JOIN vehicle_models vm ON vm.model_id = vt.model_id
                    WHERE vm.make_id = $1
                      AND vm.model_name_normalized = $2
                    LIMIT 1
                    """,
                    make_id,
                    p.model_normalized,
                )
                trim_id = trim_row["trim_id"] if trim_row else None

                # Upsert keyed on (make, model, term, km, start_date) — the
                # natural compound key we want to remain idempotent under.
                existing = await conn.fetchrow(
                    """
                    SELECT program_id FROM oem_programs
                    WHERE make_id = $1
                      AND COALESCE(trim_id, -1) = COALESCE($2, -1)
                      AND term_months = $3
                      AND km_allowance_annual = $4
                      AND program_start_date = $5
                    """,
                    make_id, trim_id, p.term_months, p.annual_km, PROGRAM_START,
                )

                # Find make_name display string
                make_name_row = await conn.fetchrow(
                    "SELECT make_name FROM vehicle_makes WHERE make_id = $1", make_id,
                )
                make_name = make_name_row["make_name"] if make_name_row else p.make_normalized

                if existing is None:
                    await conn.execute(
                        """
                        INSERT INTO oem_programs (
                            make_id, trim_id,
                            make_name, model_name, model_year, trim_name,
                            province_code, region_description,
                            term_months, km_allowance_annual,
                            lease_rate_percent, residual_percent,
                            program_start_date, program_end_date, is_current,
                            source_url, captured_at
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6,
                            NULL, 'national',
                            $7, $8,
                            $9, $10,
                            $11, $12, TRUE,
                            'app/services/captive_baseline.py',
                            $13
                        )
                        """,
                        make_id, trim_id,
                        make_name, p.model_normalized, None, None,
                        p.term_months, p.annual_km,
                        p.apr_percent / 100, p.residual_pct,
                        PROGRAM_START, PROGRAM_END, captured_at,
                    )
                    n_inserted += 1
                else:
                    await conn.execute(
                        """
                        UPDATE oem_programs
                        SET lease_rate_percent = $1,
                            residual_percent   = $2,
                            captured_at        = $3,
                            is_current         = TRUE
                        WHERE program_id = $4
                        """,
                        p.apr_percent / 100, p.residual_pct, captured_at, existing["program_id"],
                    )
                    n_updated += 1

                print(
                    f"   {p.make_normalized:>12} {p.model_normalized:<12} "
                    f"{p.term_months}mo / {p.apr_percent}% / "
                    f"residual {(p.residual_pct * 100):.0f}%  "
                    f"{'INSERTED' if existing is None else 'UPDATED'}"
                )

        total = await conn.fetchval("SELECT COUNT(*) FROM oem_programs")
        print(
            f"OK seed complete. Inserted {n_inserted}, updated {n_updated}. "
            f"oem_programs total = {total}"
        )
    finally:
        await conn.close()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()

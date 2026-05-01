#!/usr/bin/env bash
# apply_schema.sh — apply the LeaseWise schema to a local or remote Postgres.
#
# Connects via native `psql` (no Docker). Reads connection details from .env
# at the repo root, with sensible defaults for a local dev install.
#
# Applies:
#   1. The base schema from docs/design-phase/lease_platform_schema.sql
#   2. The LeaseHackr additions from docs/design-phase/lh_schema_additions.sql
#
# Both files are frozen. Schema changes after launch happen via Alembic.
#
# Usage:
#   ./scripts/apply_schema.sh                # uses values from .env / defaults
#   POSTGRES_HOST=... POSTGRES_USER=... ./scripts/apply_schema.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# ── Load .env if present (export every line, ignore comments / blanks) ──────
if [[ -f .env ]]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-leasewise}"
POSTGRES_USER="${POSTGRES_USER:-leasewise}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

SCHEMA_BASE="docs/design-phase/lease_platform_schema.sql"
SCHEMA_LH="docs/design-phase/lh_schema_additions.sql"

if [[ ! -f "$SCHEMA_BASE" ]]; then
    echo "x $SCHEMA_BASE not found. Design-phase outputs must be in place." >&2
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo "x psql not found. Install PostgreSQL client (apt install postgresql-client)." >&2
    exit 1
fi

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL=(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1)

echo "-> Applying $SCHEMA_BASE to ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}..."
"${PSQL[@]}" -f "$SCHEMA_BASE"

if [[ -f "$SCHEMA_LH" ]]; then
    echo "-> Applying $SCHEMA_LH..."
    "${PSQL[@]}" -f "$SCHEMA_LH"
fi

echo "OK schema applied."

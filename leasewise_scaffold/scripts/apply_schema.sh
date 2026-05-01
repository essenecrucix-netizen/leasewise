#!/usr/bin/env bash
# apply_schema.sh — apply the LeaseWise schema to the local Postgres.
#
# This applies:
#   1. The base schema from docs/design-phase/lease_platform_schema.sql
#   2. The LeaseHackr additions from docs/design-phase/lh_schema_additions.sql
#
# These files are frozen — schema changes after launch happen via Alembic.

set -euo pipefail

cd "$(dirname "$0")/.."

SCHEMA_BASE="docs/design-phase/lease_platform_schema.sql"
SCHEMA_LH="docs/design-phase/lh_schema_additions.sql"

if [[ ! -f "$SCHEMA_BASE" ]]; then
    echo "× $SCHEMA_BASE not found. The design-phase outputs must be in place."
    exit 1
fi

echo "→ Applying $SCHEMA_BASE..."
docker compose exec -T postgres psql -U leasewise -d leasewise < "$SCHEMA_BASE"

if [[ -f "$SCHEMA_LH" ]]; then
    echo "→ Applying $SCHEMA_LH..."
    docker compose exec -T postgres psql -U leasewise -d leasewise < "$SCHEMA_LH"
fi

echo "✓ Schema applied."

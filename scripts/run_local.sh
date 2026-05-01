#!/usr/bin/env bash
# run_local.sh — bootstrap the local LeaseWise dev environment.
#
# Bootstrap-only. Verifies prerequisites, applies the schema if not yet
# applied, seeds reference data, and prints the two commands you run in two
# terminals to actually work. Does NOT background long-lived processes —
# that's the daily two-terminal workflow per CLAUDE.md.
#
# Prereqs (host installs, no Docker):
#   - PostgreSQL 14+ with PostGIS (apt or brew)
#   - Python 3.12+ via uv
#   - Node 20+
#
# Usage: ./scripts/run_local.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# ── 1. .env present ─────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
    echo "x .env not found. Copy .env.example to .env and set ANTHROPIC_API_KEY." >&2
    exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-leasewise}"
POSTGRES_USER="${POSTGRES_USER:-leasewise}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

# ── 2. Tools present ────────────────────────────────────────────────────────
for tool in psql uv node; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "x $tool not found on PATH. See CLAUDE.md 'Local development setup'." >&2
        exit 1
    fi
done

# ── 3. Postgres reachable ───────────────────────────────────────────────────
echo "-> Checking Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" >/dev/null 2>&1; then
    echo "x Postgres not reachable at ${POSTGRES_HOST}:${POSTGRES_PORT}." >&2
    echo "  Start your local Postgres (e.g. 'sudo systemctl start postgresql')." >&2
    exit 1
fi

# ── 4. Apply schema if not yet applied (idempotent) ─────────────────────────
SCHEMA_APPLIED=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provinces')" \
    2>/dev/null || echo "f")

if [[ "$SCHEMA_APPLIED" == "t" ]]; then
    echo "-> Schema already applied. Skipping."
else
    echo "-> Applying schema..."
    ./scripts/apply_schema.sh
    echo "-> Seeding reference data..."
    (cd backend && source .venv/bin/activate && python ../scripts/seed_reference_data.py)
fi

# ── 5. Print the two-terminal instructions ──────────────────────────────────
cat <<'EOF'

OK Bootstrap complete.

Now open two terminals:

  Terminal 1 (backend):
    cd backend
    source .venv/bin/activate
    uv run uvicorn app.main:app --reload --port 8000
    -> http://localhost:8000   (docs at /docs)

  Terminal 2 (frontend):
    cd frontend
    npm run dev
    -> http://localhost:3000

Postgres: ${POSTGRES_HOST}:${POSTGRES_PORT}  (db: ${POSTGRES_DB}, user: ${POSTGRES_USER})

EOF

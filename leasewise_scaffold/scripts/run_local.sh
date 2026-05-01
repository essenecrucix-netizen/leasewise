#!/usr/bin/env bash
# run_local.sh — bring up the local development environment.
#
# Steps:
#   1. Ensure .env exists
#   2. Start Postgres + apply schema if not yet applied
#   3. Start frontend and backend via docker compose
#   4. Tail logs
#
# Usage: ./scripts/run_local.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# ── 1. Verify env file ──────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
    echo "× .env not found. Copy .env.example → .env and set ANTHROPIC_API_KEY."
    exit 1
fi

# ── 2. Start Postgres ───────────────────────────────────────────────────────
echo "→ Starting Postgres..."
docker compose up -d postgres

# Wait for Postgres healthcheck
echo "→ Waiting for Postgres to be ready..."
for _ in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U leasewise -d leasewise >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# ── 3. Apply schema if not yet applied ──────────────────────────────────────
SCHEMA_APPLIED=$(docker compose exec -T postgres \
    psql -U leasewise -d leasewise -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provinces')")

if [[ "$SCHEMA_APPLIED" == "f" ]]; then
    echo "→ Schema not yet applied. Applying..."
    ./scripts/apply_schema.sh
    echo "→ Seeding reference data..."
    docker compose run --rm backend uv run python scripts/seed_reference_data.py
else
    echo "→ Schema already applied. Skipping."
fi

# ── 4. Start everything else ────────────────────────────────────────────────
echo "→ Starting backend and frontend..."
docker compose up -d backend frontend

# ── 5. Tail logs ────────────────────────────────────────────────────────────
echo ""
echo "✓ LeaseWise running:"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://localhost:8000  (docs at /docs)"
echo "    Postgres: localhost:5432  (user/pass: leasewise/leasewise_dev)"
echo ""
echo "→ Tailing logs (Ctrl+C to detach, services keep running)..."
docker compose logs -f backend frontend

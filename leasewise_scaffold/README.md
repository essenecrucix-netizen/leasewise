# LeaseWise Canada

A Canadian automotive lease intelligence platform.

## Quick start

```bash
git clone <repo>
cd leasewise
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY at minimum
./scripts/run_local.sh
```

Then:

- Frontend at http://localhost:3000
- Backend at http://localhost:8000 (API docs at /docs)
- Postgres at localhost:5432 (user/pass: leasewise/leasewise_dev)

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Backend**: FastAPI + Python 3.12
- **Database**: PostgreSQL 14 with PostGIS + pg_trgm
- **AI**: Anthropic Claude (Haiku for extraction, Sonnet for synthesis)
- **Auth**: Azure Entra ID (with mock auth for local dev)
- **Production**: Azure VM, Nginx, Cloudflare Tunnel, Azure PostgreSQL

## Documentation

- **`CLAUDE.md`** — Operational manual for Claude Code. Read first.
- **`docs/ARCHITECTURE.md`** — Architecture overview
- **`docs/CALCULATOR_MATH.md`** — The lease math, with worked examples
- **`docs/DEPLOYMENT.md`** — Production deployment runbook

## Repository structure

```
leasewise/
├── frontend/          Next.js 16 app
├── backend/           FastAPI service
├── infrastructure/    Nginx, Cloudflare Tunnel, Postgres init
├── scripts/           Deploy, seed, schema-apply
└── docs/              Architecture, math, deployment
```

## Contributing

This is a side project owned by Erik Brisson. Not currently accepting external contributions.

## License

Proprietary — all rights reserved.

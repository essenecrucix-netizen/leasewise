# LeaseWise Canada

A Canadian automotive lease intelligence platform. Side project owned by Erik Brisson.

This file is the operational manual for Claude Code. Read it in full before doing any work in this repo. It supersedes generic best practices when they conflict.

---

## What this product is

LeaseWise Canada is a consumer-aligned Canadian car lease intelligence platform. Three layers:

1. **Consumer education** — calculator, deal rater, brand guides, forum
2. **Market intelligence** — aggregated closed deals, OEM program tracking, inventory monitoring
3. **Semi-autonomous negotiation agent** (Phase 3) — drafts dealer emails for user approval, manages multi-turn email threads

The platform is **consumer-aligned, not dealer-revenue-driven**. Pricing model is one-time lifetime access. We never sell leads. We never accept paid placement. We disclose every data source publicly at /sources.

---

## Stack at a glance

- **Frontend**: Next.js 16 (App Router) — TypeScript, React 18+
- **Backend**: FastAPI (Python 3.12+) — async, Pydantic v2
- **Database**: PostgreSQL 14+ with PostGIS and pg_trgm extensions
- **ORM**: SQLAlchemy 2.0 async
- **Auth**: Azure Entra ID (JWT validation in FastAPI)
- **AI**: Anthropic Claude (Haiku for extraction, Sonnet for synthesis) — *not OpenAI*
- **Process supervision**: systemd unit files for backend and frontend
- **Web server**: Nginx (system package), reverse proxy to FastAPI and Next.js
- **Production**: Azure VM (Ubuntu 22.04+), Cloudflare Tunnel for inbound traffic
- **Database (prod)**: Azure Database for PostgreSQL Flexible Server
- **Database (dev)**: Local Postgres install (apt or homebrew)
- **Local dev**: venv + npm run dev, both invoked directly. No Docker.

This stack mirrors Workgraph (Erik's other project) for consistency.

**There is no Docker in this project.** No Dockerfile, no docker-compose.yml, no container orchestration. If you find yourself reaching for Docker, stop and ask — the established pattern is venv + systemd + Nginx, native to the host.

---

## Repository structure

```
leasewise/
├── CLAUDE.md                         # this file
├── README.md
├── .env.example
├── .env                              # NEVER commit
├── .gitignore
│
├── frontend/                         # Next.js 16 app
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── public/tokens.css             # ported from design phase
│   └── src/{app,components,lib,styles}/
│
├── backend/                          # FastAPI service
│   ├── pyproject.toml
│   ├── .venv/                        # gitignored
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/v1/
│   │   ├── lease_math/               # SINGLE SOURCE OF TRUTH for calculations
│   │   ├── services/
│   │   └── ingestion/
│   └── tests/
│
├── infrastructure/
│   ├── nginx/sites-available/
│   │   └── leasewise.conf            # nginx vhost — symlinked into sites-enabled on VM
│   ├── systemd/
│   │   ├── leasewise-backend.service
│   │   └── leasewise-frontend.service
│   └── postgres/
│       └── extensions.sql            # CREATE EXTENSION postgis, pg_trgm
│
├── scripts/
│   ├── setup_vm.sh                   # one-time VM bootstrap
│   ├── deploy.sh                     # pull + rebuild + restart on VM
│   ├── seed_reference_data.py
│   ├── apply_schema.sh
│   └── run_local.sh                  # local dev — venv + npm dev
│
└── docs/
    ├── ARCHITECTURE.md
    ├── CALCULATOR_MATH.md
    ├── DEPLOYMENT.md
    └── design-phase/                 # reference, do not edit
```

---

## Coding conventions

### TypeScript (frontend)

- Strict mode on. No `any` types except where third-party APIs force it.
- Server Components by default. `'use client'` only when needed.
- No client-side fetching for initial render.
- All backend calls go through `src/lib/api-client.ts` with typed shapes.
- File names: kebab-case for routes, PascalCase for components, camelCase for utilities.
- No CSS-in-JS. Plain CSS modules referencing `tokens.css`.
- No emoji in user-facing copy.
- All monetary values use the mono font.

### Python (backend)

- Python 3.12+. Modern syntax.
- Type hints everywhere. Mypy strict mode in CI.
- Pydantic v2 for all request/response models.
- Async by default. SQLAlchemy 2.0 async, `httpx.AsyncClient`.
- Snake_case files, modules, and database columns.
- Settings via `pydantic_settings.BaseSettings` in `app/core/config.py`.
- Every endpoint has a Pydantic `response_model`.
- Errors raise typed exceptions from `app/core/exceptions.py`.

### SQL & database

- Schema exists at `docs/design-phase/lease_platform_schema.sql` and `lh_schema_additions.sql`. Apply via `scripts/apply_schema.sh`. Do not regenerate.
- Future schema changes go through Alembic migrations.
- Tenant scoping: `tenant_id VARCHAR(50)` first column on user-scoped tables; every query filters by `tenant_id` (enforced via `app/db/session.py`).
- Generated columns persist `days_on_lot`, `discount_percent`, `payment_to_msrp_ratio`. Don't recompute; query the column.

### Azure Postgres specifics (production DB)

The production DB is Azure Database for PostgreSQL Flexible Server, sharing
the existing Workgraph instance with a separate `leasewise` database. Two
quirks worth knowing:

- **`CREATE EXTENSION` is admin-only on Azure managed Postgres.** The
  application user (`leasewise`) does not have permission to run
  `CREATE EXTENSION postgis` etc. Extensions are installed via the
  Azure portal's `azure.extensions` parameter, then created in the
  target DB by the admin (one-time). When applying `lease_platform_schema.sql`
  to Azure, lines 31–33 (the three `CREATE EXTENSION` statements) are
  commented out — the extensions are pre-provisioned. Local dev with apt /
  brew Postgres can run them as-is; the lines are only commented when
  applying against Azure.
- **SSL is required.** Set `POSTGRES_SSL=true` in production `.env`.
  `app/db/session.py` passes `ssl="require"` to `connect_args`. Set
  `POSTGRES_SSL=false` for a local apt / brew Postgres without TLS.

---

## Critical rules — always do these

1. **All lease math lives in `backend/app/lease_math/`.** Single source of truth. Frontend never recomputes.
2. **Reference `tokens.css` for every visual choice.** No hardcoded colour values.
3. **All AI calls go through `app/services/ai/claude_client.py`.**
4. **All AI prompts live in `app/services/ai/prompts.py`** as Python constants.
5. **Every API endpoint has tests.** Calculator additionally has math-correctness tests.
6. **Calculator math has fixture-based tests.** Known input → known output, ≥12 cases covering all 13 provinces + BC luxury threshold + Quebec QST. Tests are the contract.
7. **Real Canadian data, always.** No fake dealers, no round-number MSRPs.
8. **Lime accent stays disciplined.** Max three uses per visible viewport. Never lime as text on light background.
9. **Every external API call has timeout, retry policy, and error logging.** Use the wrapped client.
10. **Keep the `data-theme` system honest.** Every text/background/border colour is a CSS custom property. No hardcoded `rgba(255,255,255,X)`.

---

## Critical rules — never do these

1. **Never write OpenAI integration code.** Anthropic Claude only.
2. **Never put fetch calls in client components for initial data.** Server Components fetch on the server.
3. **Never reimplement provincial tax math anywhere outside `app/lease_math/tax.py`.**
4. **Never store original LeaseHackr post text.** Extract structured facts only.
5. **Never commit `.env`, `*.key`, `*.pem`, or `secrets/`.**
6. **Never auto-deploy without manual approval.** GitHub Actions builds artifacts; `scripts/deploy.sh` runs manually on the VM.
7. **Never add a new external dependency without confirming with Erik.**
8. **Never modify the existing schema DDL files.** Schema changes via Alembic.
9. **Never use `useEffect` to fetch data.**
10. **Never break the seven hard scoping promises.** No newsletter modals, no "sign up" gates on data, no promotional banners in tools, no urgency language, no social proof inflation, no dealer affiliate links, no selling user data.
11. **Never add Docker.** No Dockerfile, no docker-compose.yml. The deployment pattern is venv + systemd + Nginx native to the host. If you think Docker is the answer here, you're wrong about this project — ask Erik.

---

## Things to ASK Erik about before doing

1. Schema changes (adding/renaming columns or tables).
2. New external dependencies.
3. Adding new pages or routes beyond the design phase output.
4. Modifying the calculation engine math.
5. Anything involving the negotiation agent (Phase 3 has agent-safety considerations).
6. Deleting files that look like design-phase outputs. Move to `_attic/` first.
7. Changing the build, deploy, or auth flow.
8. Production database migrations — even reversible ones.
9. Anything that introduces a containerization layer.

---

## Existing assets to use, not recreate

- **`docs/design-phase/tokens.css`** → `frontend/public/tokens.css` verbatim.
- **`docs/design-phase/calculator.jsx`** — JS reference for the lease math. Port to Python in `backend/app/lease_math/`. Don't redesign.
- **`docs/design-phase/data.js`** — sample reference data. Shape for `seed_reference_data.py`.
- **`docs/design-phase/chrome.jsx`** — header/footer pattern. Adapt to Next.js layout.
- **`docs/design-phase/lease_platform_schema.sql`** — apply via `scripts/apply_schema.sh`.
- **`docs/design-phase/lh_function_app.py`** — LeaseHackr ingestion code. Port to `backend/app/ingestion/leasehackr/` as APScheduler jobs in the FastAPI process.

---

## Local development setup

### Prerequisites

- Python 3.12+ (install via [uv](https://docs.astral.sh/uv/) or system package)
- Node.js 20+ (via nvm, fnm, or system package)
- PostgreSQL 14+ with PostGIS extension (apt or homebrew)

### One-time setup

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone repo
git clone <repo>
cd leasewise

# Env — single source of truth at the repo root.
cp .env.example .env
# Edit .env: ANTHROPIC_API_KEY at minimum, MOCK_AUTH=true for local

# Symlink so Next.js can read the same .env. Next looks in frontend/
# but the canonical .env lives at repo root (also where the systemd
# unit's EnvironmentFile= points). Keep this as a symlink — never as
# a real file copy. A real file would drift out of sync with backend
# env vars and bite you when CORS_ORIGINS or POSTGRES_* changes.
ln -s ../.env frontend/.env

# Backend
cd backend
uv venv
source .venv/bin/activate     # or .venv\Scripts\activate on Windows
uv sync

# Frontend
cd ../frontend
npm install

# Schema + seed
cd ..
./scripts/apply_schema.sh
cd backend && source .venv/bin/activate && python ../scripts/seed_reference_data.py
```

**Do not run `npm install` from the repo root.** There is no `package.json`
at root — the only Node project is `frontend/`. Running npm at root creates
a stray `package-lock.json` and triggers Next.js workspace-root-inference
warnings on every dev start. The root `.gitignore` blocks committing such
a file; just don't create it.

### Daily workflow

Two terminals:

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate
uv run uvicorn app.main:app --reload --port 8000
# → http://localhost:8000 (docs at /docs)

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

Or `./scripts/run_local.sh` to bootstrap (verify prereqs, apply schema,
seed) and print the same two commands.

#### Port allocation on the shared dev VM

The Azure dev VM also hosts Workgraph, which owns ports **3000** (frontend)
and **8000** (backend). To avoid collisions, LeaseWise dev uses:

| Service           | Default port | LeaseWise dev VM port |
|-------------------|--------------|-----------------------|
| Backend (uvicorn) | 8000         | **8001**              |
| Frontend (next)   | 3000         | **3010**              |

Override on the command line — neither port is hardcoded in the scripts:

```bash
uv run uvicorn app.main:app --reload --port 8001
npm run dev -- --port 3010
```

When the frontend port is non-default, also append it to `CORS_ORIGINS`
in `.env` (multi-origin syntax):

```
CORS_ORIGINS=["http://localhost:3000","http://localhost:3010"]
```

Production is unaffected — the systemd unit binds `8000` and Nginx
upstreams `127.0.0.1:8000`. The dev-VM collision is local only; both
projects' production traffic comes through different Cloudflare Tunnel
hostnames into different vhosts on the production Nginx.

### Tests

```bash
# Backend
cd backend && uv run pytest

# Frontend
cd frontend && npm test
```

### Migrations

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
# review the generated SQL
uv run alembic upgrade head
```

### Mock auth

When `MOCK_AUTH=true` in `.env`, the auth middleware bypasses Azure Entra and uses a fixed test user. Production startup aborts if `MOCK_AUTH=true` and `ENVIRONMENT=production`.

---

## Production deployment

The production VM is an Azure VM running Ubuntu 22.04+. Services run as systemd units. Nginx (system package) terminates internal HTTP and reverse-proxies to backend (port 8000) and frontend (port 3000). Cloudflare Tunnel handles inbound from the internet.

### Service topology on the VM

```
/var/www/leasewise/                     # repo root on the VM
├── backend/.venv/                      # production venv
└── frontend/.next/                     # built Next.js output

/etc/systemd/system/
├── leasewise-backend.service           # uvicorn for FastAPI
└── leasewise-frontend.service          # next start for Next.js

/etc/nginx/sites-available/leasewise.conf
/etc/nginx/sites-enabled/leasewise.conf  # symlink to above
```

The systemd unit files and Nginx vhost config are committed in `infrastructure/`. The deploy script copies them to the right paths and reloads.

### Deployment flow

```bash
# On the VM
cd /var/www/leasewise
git pull
./scripts/deploy.sh
```

`deploy.sh` does:
1. `cd backend && uv sync`
2. `uv run alembic upgrade head` (migrations)
3. `cd ../frontend && npm install && npm run build`
4. Copy systemd unit files from `infrastructure/systemd/` to `/etc/systemd/system/` if changed
5. `sudo systemctl daemon-reload`
6. `sudo systemctl restart leasewise-backend leasewise-frontend`
7. Copy Nginx vhost from `infrastructure/nginx/sites-available/` if changed; `sudo nginx -t && sudo systemctl reload nginx`

Manual deployment is intentional — no auto-deploy on push.

### Cloudflare Tunnel

`cloudflared` runs as its own systemd service (already configured on the VM for Workgraph; LeaseWise reuses the same tunnel with a different hostname route). The tunnel routes the production hostname to the VM's local Nginx on port 80. TLS terminates at Cloudflare's edge — no certs on the VM.

---

## Environment variables

See `.env.example` for the full list. Critical ones:

```
ENVIRONMENT=development|production
LOG_LEVEL=INFO
TENANT_ID=leasewise

# Frontend
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_DISCOURSE_URL=http://localhost:4200

# Backend — database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=leasewise
POSTGRES_USER=leasewise
POSTGRES_PASSWORD=

# Backend — auth
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
JWT_AUDIENCE=
MOCK_AUTH=false

# Backend — AI
ANTHROPIC_API_KEY=
ANTHROPIC_HAIKU_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_SONNET_MODEL=claude-sonnet-4-6

# Backend — external APIs
MARKETCHECK_API_KEY=
LEASEHACKR_USER_AGENT=LeaseWise-Research/1.0 (canadian-lease-intelligence)

# Backend — Discourse SSO
DISCOURSE_SSO_SECRET=
DISCOURSE_URL=http://localhost:4200

# Production only
SENTRY_DSN=
```

**Never commit `.env`.**

---

## First-task hints for Claude Code

If opening this repo for the first time without a specific task:

1. Read `docs/ARCHITECTURE.md`
2. Read `docs/CALCULATOR_MATH.md`
3. Read `docs/design-phase/lease_platform_schema.sql`
4. Run `./scripts/run_local.sh` to verify the environment
5. Check GitHub issues for the assigned task; if none, ask Erik

For any non-trivial task: read relevant files first, confirm scope with Erik before crossing module boundaries, write tests alongside the code, run linters and tests locally before committing, open a PR with a clear description.

---

## When this file is wrong

If this file disagrees with the actual code (a path that no longer exists, a convention that drifted), flag it to Erik. Don't silently work around it. The conventions and rules are intentional. The paths are best-effort and may drift. If in doubt about *intent*, ask. If in doubt about *structure*, the actual code wins.

---

*Last updated: May 2026 (v2 — corrected to remove Docker, match Workgraph deployment pattern). Maintained by Erik Brisson + Claude Code.*

---

# Engineering Principles

(The four principles below are from Andrej Karpathy's observations on LLM coding pitfalls. They apply to every task in this repo.)


Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Engineering Principles

(The four principles below are from Andrej Karpathy's observations on LLM coding pitfalls. They apply to every task in this repo.)


Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

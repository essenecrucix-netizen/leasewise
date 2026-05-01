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
- **Production**: Azure VM (Ubuntu 22.04), Nginx, Cloudflare Tunnel, Azure PostgreSQL Flexible Server
- **Local dev**: Docker Compose with Postgres + mock auth

This stack mirrors Workgraph (Erik's other project) for consistency.

---

## Repository structure

```
leasewise/
├── CLAUDE.md                         # this file
├── README.md                         # human-facing repo intro
├── docker-compose.yml                # local dev orchestration
├── docker-compose.prod.yml           # production VM orchestration
├── .env.example                      # env var template (commit this)
├── .env                              # actual env vars (NEVER commit)
├── .gitignore
│
├── frontend/                         # Next.js 16 app
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts            # if/when Tailwind added; design uses raw CSS for now
│   ├── public/
│   │   └── tokens.css                # ported from design phase (single source of truth for colour, type, spacing)
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx            # root layout: chrome (header/footer), theme provider
│   │   │   ├── page.tsx              # homepage (/)
│   │   │   ├── tools/
│   │   │   │   ├── calculator/page.tsx
│   │   │   │   ├── deal-rater/page.tsx
│   │   │   │   └── ...
│   │   │   ├── learn/
│   │   │   │   ├── [brand]-deal-guide/page.tsx   # dynamic brand pages
│   │   │   │   └── ...
│   │   │   ├── community/
│   │   │   │   ├── page.tsx                       # forum index (Discourse SSO embed)
│   │   │   │   └── t/[slug]/[id]/page.tsx        # thread detail
│   │   │   ├── sources/page.tsx
│   │   │   └── api/                              # ONLY for things that must run on the Next.js side (e.g., Discourse SSO)
│   │   ├── components/
│   │   │   ├── chrome/Header.tsx
│   │   │   ├── chrome/Footer.tsx
│   │   │   ├── calculator/
│   │   │   ├── rater/
│   │   │   ├── brand/
│   │   │   ├── thread/
│   │   │   ├── primitives/           # buttons, inputs, cards, badges — the design system
│   │   │   └── charts/               # Recharts wrappers
│   │   ├── lib/
│   │   │   ├── api-client.ts         # typed client for FastAPI backend
│   │   │   ├── auth.ts               # Azure Entra integration
│   │   │   ├── format.ts             # currency, percent, money factor formatters
│   │   │   └── theme.ts              # dark/light mode handling
│   │   └── styles/
│   │       └── globals.css           # imports tokens.css and base styles
│
├── backend/                          # FastAPI service
│   ├── pyproject.toml                # uv-managed dependencies
│   ├── uv.lock
│   ├── Dockerfile
│   ├── alembic.ini                   # migrations config (when needed)
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry, mounts routers
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings, reads env vars
│   │   │   ├── auth.py               # JWT validation middleware
│   │   │   ├── logging.py
│   │   │   └── exceptions.py
│   │   ├── db/
│   │   │   ├── session.py            # SQLAlchemy async session factory
│   │   │   ├── base.py               # Base model
│   │   │   └── migrations/           # alembic versions
│   │   ├── models/                   # SQLAlchemy ORM models matching existing schema
│   │   │   ├── reference.py          # provinces, makes, models, trims
│   │   │   ├── dealer.py
│   │   │   ├── inventory.py
│   │   │   ├── program.py            # oem_programs, oem_incentives
│   │   │   ├── deal.py               # market_deals
│   │   │   ├── user.py
│   │   │   ├── campaign.py
│   │   │   └── leasehackr.py         # lh_crawl_log, lh_knowledge_chunks
│   │   ├── schemas/                  # Pydantic schemas (request/response models)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── calculator.py     # POST /api/v1/calculator/compute
│   │   │   │   ├── rater.py          # POST /api/v1/rater/score
│   │   │   │   ├── programs.py       # GET /api/v1/programs/{brand}
│   │   │   │   ├── deals.py          # GET /api/v1/deals (with filters)
│   │   │   │   ├── brands.py         # GET /api/v1/brands/{slug} → full brand page data
│   │   │   │   ├── sources.py        # GET /api/v1/sources
│   │   │   │   └── intel.py          # GET /api/v1/intel/* (market intel endpoints)
│   │   │   └── deps.py               # FastAPI dependencies (db session, current_user)
│   │   ├── lease_math/               # SINGLE SOURCE OF TRUTH for lease calculations
│   │   │   ├── __init__.py
│   │   │   ├── payment.py            # calculate_monthly_payment, calculate_residual
│   │   │   ├── tax.py                # provincial tax application (per-province)
│   │   │   ├── conversion.py         # mf_to_apr, apr_to_mf
│   │   │   ├── percentile.py         # score_against_distribution
│   │   │   └── bc_luxury.py          # BC luxury surtax handling (>$124,999)
│   │   ├── services/                 # business logic layer
│   │   │   ├── calculator_service.py
│   │   │   ├── rater_service.py
│   │   │   ├── extraction_service.py # parses dealer worksheets via Claude Haiku
│   │   │   ├── program_service.py
│   │   │   └── ai/
│   │   │       ├── claude_client.py  # thin wrapper around anthropic SDK
│   │   │       ├── prompts.py        # all prompts as Python constants
│   │   │       └── synthesis.py      # weekly LeaseHackr synthesis (Sonnet)
│   │   └── ingestion/                # background ingestion jobs (run as separate processes)
│   │       ├── leasehackr/           # ports the existing Azure Functions code
│   │       │   ├── crawl.py
│   │       │   └── synthesize.py
│   │       ├── marketcheck/          # inventory crawler
│   │       └── oem_programs/         # captive lender program scrapers (Phase 2)
│   └── tests/
│       ├── lease_math/               # test the math against known values
│       ├── api/
│       └── services/
│
├── infrastructure/
│   ├── nginx/
│   │   └── nginx.conf                # reverse proxy: /api/* → FastAPI, everything else → Next.js
│   ├── cloudflared/
│   │   └── config.yml                # Cloudflare Tunnel config
│   ├── postgres/
│   │   └── init.sql                  # bootstrap script (creates extensions)
│   └── azure/
│       └── README.md                 # VM provisioning notes
│
├── scripts/
│   ├── deploy.sh                     # rsync + docker compose pull + up
│   ├── seed_reference_data.py        # populates provinces, makes, models, trims
│   ├── apply_schema.sh               # applies the existing schema DDL to local/prod DB
│   └── run_local.sh                  # one-command local dev startup
│
└── docs/
    ├── ARCHITECTURE.md               # condensed version of the formal architecture doc
    ├── CALCULATOR_MATH.md            # the math, with worked examples per province
    ├── DEPLOYMENT.md                 # production deployment runbook
    └── design-phase/                 # original design phase outputs (reference, do not edit)
        ├── tokens.css
        ├── chrome.jsx                # the React patterns from the integrated app
        ├── calculator.jsx            # JS implementation of the math (reference)
        └── ...
```

---

## Coding conventions

### TypeScript (frontend)

- **Strict mode on.** No `any` types except where third-party APIs force it; in those cases use `unknown` and narrow.
- **Server Components by default.** Use `'use client'` only when needed (state, effects, browser APIs, event handlers).
- **No client-side fetching for initial render.** Server Components fetch from the FastAPI backend; pass data down as props.
- **API client is typed.** All calls to the backend go through `src/lib/api-client.ts`, which has typed request/response shapes matching the FastAPI Pydantic models.
- **File names**: kebab-case for routes (`/tools/deal-rater`), PascalCase for components (`Calculator.tsx`), camelCase for utilities (`formatCurrency.ts`).
- **No CSS-in-JS.** Use plain CSS modules or global CSS that references tokens from `tokens.css`. The design system is built around CSS custom properties, not styled-components.
- **No emoji** in user-facing copy. The brand isn't playful. (System logs may use emoji freely.)
- **All monetary values use the mono font.** Body copy is Inter; numbers — even mid-sentence — switch to JetBrains Mono. This is a brand rule.

### Python (backend)

- **Python 3.12+.** Use modern syntax (PEP 695 generics, match statements where they help readability).
- **Type hints everywhere.** Mypy strict mode in CI.
- **Pydantic v2 for all request/response models.** Don't mix dataclasses with Pydantic.
- **Async by default.** Every endpoint is `async def`. Database access via SQLAlchemy 2.0 async. HTTP calls via `httpx.AsyncClient`.
- **Snake_case file and module names.** Match Python conventions.
- **Database column names are snake_case.** SQLAlchemy models map them to Python attributes via column-name parameters. Pydantic response models can use either; pick one and stay consistent (default: keep snake_case end-to-end).
- **Settings via `pydantic_settings.BaseSettings`** in `app/core/config.py`. Read environment variables there once; everywhere else imports `settings`.
- **Every endpoint has a Pydantic response_model.** No untyped responses.
- **Errors raise typed exceptions** from `app/core/exceptions.py`. A global exception handler maps them to HTTP responses.

### SQL & database

- **The schema already exists.** It's at `docs/design-phase/lease_platform_schema.sql` (1,145 lines, 19 tables, 3 views) and `docs/design-phase/lh_schema_additions.sql`. Apply this via `scripts/apply_schema.sh`. Do not regenerate it.
- **Future schema changes go through Alembic migrations.** Generate with `alembic revision --autogenerate`, review the generated SQL, edit if needed, then commit.
- **Tenant scoping**: tables that are user-scoped have `tenant_id VARCHAR(50)` as the first column. Every query against these tables MUST filter by `tenant_id`. This is enforced via a request-scoped session that injects the tenant filter automatically — see `app/db/session.py`.
- **Generated columns persist key derived values** (`days_on_lot`, `discount_percent`, `payment_to_msrp_ratio`). Don't recompute these in application code; query the column.
- **No N+1 queries.** Use `selectinload()` or `joinedload()` for relationships. CI includes a query-count test for the calculator endpoint as a guard.

---

## Critical rules — always do these

1. **All lease math lives in `backend/app/lease_math/`.** Single source of truth. The frontend never recomputes provincial tax, money factor conversion, or percentile scoring — it calls the backend.

2. **Reference `tokens.css` for every visual choice.** Colours, type, spacing — all defined in tokens. Don't invent new values. If you need a new token, add it to `frontend/public/tokens.css` first, document it in `docs/ARCHITECTURE.md`, and reference it everywhere it's used.

3. **All AI calls go through `app/services/ai/claude_client.py`.** Don't import `anthropic` directly elsewhere. The wrapper handles retries, logging, and prompt versioning.

4. **All AI prompts live in `app/services/ai/prompts.py` as Python constants.** Don't inline prompts in business logic. Prompt changes are commits with diffs we can review.

5. **Every API endpoint has a corresponding test.** Minimum: a happy path and a validation-error path. The calculator endpoint additionally has math-correctness tests against known-good values.

6. **The calculator math has fixture-based tests.** Known input → known output, for at least 12 cases covering all 10 provinces + BC luxury threshold + Quebec QST. These tests are the contract — if you break them, you've broken the math, even if the code looks fine.

7. **Real Canadian data, always.** No "ABC Motors" fake dealers, no "$50,000 round number" fake MSRPs. Reference data uses real Canadian dealer names, real captive lender programs, real MSRPs (within $500 is fine; reject within-$5000). The product's credibility depends on this.

8. **Lime accent stays disciplined.** Maximum three uses per visible viewport. Never use lime as text on light backgrounds (it fails contrast). Lime is a fill colour for "current programs" and "good outcomes" — that's it.

9. **Every external API call has timeout, retry policy, and error logging.** No bare `httpx.get()`. Use the wrapped client in `app/core/http_client.py`.

10. **Keep the `data-theme` system honest.** Every text colour, background colour, and border colour references a CSS custom property (`var(--text)`, `var(--bg)`, etc.). Hardcoded `rgba(255,255,255, X)` values are forbidden — they were the bug that bit us in the design phase.

---

## Critical rules — never do these

1. **Never write OpenAI integration code.** This product uses Anthropic Claude. If you find yourself importing `openai`, stop and check.

2. **Never put fetch calls in client components for initial data.** Server Components fetch on the server. Client Components only fetch in response to user interaction (e.g., recalculating after input change).

3. **Never reimplement provincial tax math anywhere outside `app/lease_math/tax.py`.** Not in the frontend. Not in a service module. Not "just for this one display." If you need tax math, call the calculator service.

4. **Never store original LeaseHackr post text in the database.** The ingestion pipeline extracts structured facts and stores only those. The original text never persists. This is a copyright and ethics decision documented in the architecture doc — do not relax it.

5. **Never commit `.env`, `*.key`, `*.pem`, or anything in `secrets/`.** `.gitignore` covers these. Use `.env.example` for the canonical structure.

6. **Never auto-deploy without manual approval.** GitHub Actions builds and pushes containers; the deploy step (`scripts/deploy.sh` on the VM) requires Erik to run it manually. This is intentional for a side project — no rogue 2am deploys.

7. **Never add a new external dependency without confirming with Erik.** Every dependency is a future maintenance cost. Ask first; explain what it solves and what the alternative would be.

8. **Never modify the existing schema DDL files.** Schema changes happen through Alembic migrations. The DDL files in `docs/design-phase/` are the historical record of the initial schema; they're frozen.

9. **Never use `useEffect` to fetch data.** Server Components or React Query (if added later). `useEffect` for fetching is a code smell that creates loading flickers and race conditions.

10. **Never break the seven hard scoping promises.** These are also brand promises:
    - No newsletter sign-up modals interrupting tools
    - No "Sign up to see more" gates on data
    - No promotional banners for our own features inside tools
    - No urgency or scarcity language ("Only 3 dealers left!")
    - No social proof inflation
    - No dealer affiliate links
    - No selling user data

---

## Things to ASK Erik about before doing

When in doubt, lean toward asking. These specifically:

1. **Schema changes.** Adding a column, changing a type, dropping a table — confirm intent first.
2. **New external dependencies.** See "never" rule #7.
3. **Adding new pages or routes** beyond what's in the design phase output. The design is signed off; new pages need design review before code.
4. **Modifying the calculation engine math.** Tax logic, residual handling, percentile scoring — these have correctness implications. Confirm before changing.
5. **Anything involving the negotiation agent.** That's Phase 3, and it has agent-safety considerations beyond normal code review.
6. **Deleting files** that look like they might be from the design phase or old experiments. Move to `_attic/` first; don't `rm`.
7. **Changing the build, deploy, or auth flow.** These have production consequences.
8. **Production database migrations** — even ones that look reversible. Always confirm.

---

## Existing assets to use, not recreate

The design phase produced working code that should be ported, not redone. References:

- **`docs/design-phase/tokens.css`** — the design system token file. Copy verbatim to `frontend/public/tokens.css`. Single source of truth for colours, type, spacing, semantic mappings.

- **`docs/design-phase/calculator.jsx`** — the JavaScript implementation of the lease math. **Use this as the reference when implementing `backend/app/lease_math/`**. The math is correct: provincial tax handling, money factor conversion, BC luxury surtax, residual application. Port it to Python; don't redesign it.

- **`docs/design-phase/data.js`** — sample reference data (provinces, vehicles, dealers, programs). The shape of this data is what `seed_reference_data.py` should produce. The values are real and can be used as the initial seed.

- **`docs/design-phase/chrome.jsx`** — the header and footer pattern. Adapt to Next.js layout. Don't redesign.

- **`docs/design-phase/calculator.css`, `rater.css`, `brand.css`, `thread.css`, etc.** — the page-level CSS from the integrated app. Adapt to Next.js conventions (CSS modules, naming) but the visual design is signed off; copy the rules.

- **`docs/design-phase/lease_platform_schema.sql`** — the existing schema. Apply via `scripts/apply_schema.sh`. Don't regenerate.

- **`docs/design-phase/lh_function_app.py`** — the LeaseHackr ingestion code (originally written for Azure Functions). Port to `backend/app/ingestion/leasehackr/` — same logic, but as background jobs running in the FastAPI container rather than as Azure Functions.

---

## Local development setup

### One-time setup

```bash
# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Node 20+ via nvm if not already
nvm install 20
nvm use 20

# Install Docker Desktop (or colima on macOS)

# Clone and bootstrap
git clone <repo>
cd leasewise
cp .env.example .env
# Edit .env: ANTHROPIC_API_KEY, MARKETCHECK_API_KEY, MOCK_AUTH=true

# Apply schema to local Postgres (started by docker-compose)
./scripts/run_local.sh
```

### Daily workflow

```bash
# Start everything
docker compose up -d

# Frontend (http://localhost:3000)
cd frontend && npm run dev

# Backend (http://localhost:8000, docs at /docs)
cd backend && uv run uvicorn app.main:app --reload

# Run tests
cd backend && uv run pytest
cd frontend && npm test

# Apply pending migrations
cd backend && uv run alembic upgrade head
```

### Mock auth in development

When `MOCK_AUTH=true`, the FastAPI auth middleware bypasses Azure Entra and uses a fixed test user. This lets you develop without round-tripping through real auth flows. Never set `MOCK_AUTH=true` in production — there's a startup check that aborts if both `MOCK_AUTH=true` and `ENVIRONMENT=production`.

---

## Environment variables

See `.env.example` for the canonical list. Critical ones:

```
# General
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
POSTGRES_PASSWORD=<set>

# Backend — auth
AZURE_TENANT_ID=<from Azure portal>
AZURE_CLIENT_ID=<from Azure portal>
AZURE_CLIENT_SECRET=<from Azure portal>
JWT_AUDIENCE=<api://your-app-id>
MOCK_AUTH=false

# Backend — AI
ANTHROPIC_API_KEY=<sk-ant-...>
ANTHROPIC_HAIKU_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_SONNET_MODEL=claude-sonnet-4-6

# Backend — external APIs
MARKETCHECK_API_KEY=<from MarketCheck Canada>
LEASEHACKR_USER_AGENT=LeaseWise-Research/1.0 (canadian-lease-intelligence)

# Backend — Discourse SSO
DISCOURSE_SSO_SECRET=<set>
DISCOURSE_URL=http://localhost:4200

# Production only
CLOUDFLARE_TUNNEL_TOKEN=<from Cloudflare Zero Trust dashboard>
SENTRY_DSN=<from Sentry, optional>
```

**Never commit `.env`.** It's in `.gitignore`.

---

## First-task hints for Claude Code

If you're opening this repo for the first time and don't have a specific task, the natural starting points (in order):

1. **Read `docs/ARCHITECTURE.md`** for the condensed architecture overview.
2. **Read `docs/CALCULATOR_MATH.md`** for the math you'll be implementing.
3. **Read the existing schema** at `docs/design-phase/lease_platform_schema.sql` to understand the data model.
4. **Run `./scripts/run_local.sh`** to get the local environment up and verify it works.
5. **Check the GitHub issues** for the specific task assigned. If there isn't one, ask Erik what to work on.

For any non-trivial task, the workflow is:
- Read the relevant files first (use this CLAUDE.md to find them)
- Confirm scope with Erik before writing code that crosses module boundaries
- Write tests alongside the code, not after
- Run the linters and tests locally before committing
- Open a PR with a clear description of what changed and why

---

## When this file is wrong

This file gets out of date as the codebase evolves. If you notice an inconsistency between this file and the actual code (a path that no longer exists, a convention that drifted, a rule that's contradicted by the code), flag it to Erik. Don't silently work around it. Either the file needs updating or the code does, and we should know which.

The conventions and rules above are intentional. The paths and structure are best-effort and may drift. If in doubt about *intent*, ask. If in doubt about *structure*, the actual code wins.

---

*Last updated: May 2026. Maintained by Erik Brisson + Claude Code.*

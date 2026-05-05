# Phase 1.4b — BMW Brand Page + Homepage Chrome + MarketCheck Inventory

## Context

Phase 1.4a (LeaseHackr ingestion infrastructure) is complete and merged to main. Phase 1.4b adds:
- BMW brand page with real financial data
- MarketCheck inventory crawler for floorplan intelligence
- Homepage "chrome" elements (ticker, floorplan clock, community highlights, programs snapshot)

**Repo location:** `/var/www/leasewise` on workgraph-vm-02 Azure VM
**Branch strategy:** Create `claude/phase-1.4b-brand-pages` off main
**Reference docs:** 
- `/var/www/leasewise/CLAUDE.md` — operational manual (READ THIS FIRST)
- Architecture doc and design spec provided separately
- Existing scaffold in `/var/www/leasewise/leasewise_scaffold/`

## Exit Criteria

1. ✅ GET /api/v1/brands/bmw returns all 8 sections with real data
2. ✅ Frontend route /learn/bmw-deal-guide renders all 8 sections
3. ✅ MarketCheck inventory crawler runs and populates `inventory` table
4. ✅ Homepage shows live ticker, floorplan clock, community highlights, programs snapshot
5. ✅ All new endpoints have tests
6. ✅ Mobile-responsive verification on all new pages

## Architecture Constraints

**Stack (from Architecture Doc):**
- Backend: FastAPI 0.115+ (Python 3.12), SQLAlchemy 2.0 async
- Frontend: Next.js 16 App Router, React 18, TypeScript
- Database: PostgreSQL 14+ (Azure managed, shared with Workgraph)
- Database name: `leasewise`
- Database connection params in backend .env

**Tenant scoping:** Default tenant is `leasewise`. All user-scoped tables filter by tenant_id.

**Decimal arithmetic:** All currency/financial calculations use Python `Decimal`, never `float`.

**File structure:**
- Backend: `/var/www/leasewise/backend/`
- Frontend: `/var/www/leasewise/frontend/` (not created yet — to be scaffolded)
- Shared docs: `/var/www/leasewise/docs/`

## Part 1: Database Schema (Alembic Migration)

### New Tables

**`oem_programs`** — Manually-seeded OEM program data (rates, residuals, incentives)

```sql
CREATE TABLE oem_programs (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,                    -- 'bmw', 'mercedes', etc.
    program_month DATE NOT NULL,                   -- First day of the program month (2026-05-01)
    captive_lender VARCHAR(100) NOT NULL,          -- 'BMW Financial Services'
    model_line VARCHAR(100),                       -- 'X3', '3 Series', NULL for brand-wide
    trim_level VARCHAR(100),                       -- 'xDrive30i', 'M340i', NULL for all trims
    province VARCHAR(2),                           -- 'AB', 'ON', NULL for national
    term_months INT NOT NULL,                      -- 36, 39, 48
    annual_km INT NOT NULL,                        -- 16000, 20000
    rate_apr DECIMAL(5,2) NOT NULL,                -- 1.49, 2.99
    residual_percent DECIMAL(5,2) NOT NULL,        -- 54.00, 48.00
    incentive_type VARCHAR(50),                    -- 'conquest', 'loyalty', 'lease_cash'
    incentive_amount DECIMAL(10,2),                -- 1500.00
    incentive_description TEXT,                    -- 'Loyalty bonus for returning BMW customers'
    source_url TEXT,                               -- URL to BMW Financial bulletin
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Uniqueness: one program per brand/month/model/trim/province/term/km combo
    UNIQUE(brand, program_month, COALESCE(model_line, ''), COALESCE(trim_level, ''), 
           COALESCE(province, ''), term_months, annual_km)
);

CREATE INDEX idx_oem_programs_brand_month ON oem_programs(brand, program_month DESC);
CREATE INDEX idx_oem_programs_lookup ON oem_programs(brand, model_line, program_month DESC);
```

**`inventory`** — MarketCheck inventory data

```sql
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(17) NOT NULL UNIQUE,
    dealer_name VARCHAR(200) NOT NULL,
    dealer_city VARCHAR(100),
    dealer_province VARCHAR(2),
    year INT NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim VARCHAR(100),
    msrp DECIMAL(10,2),
    asking_price DECIMAL(10,2) NOT NULL,
    listing_date DATE NOT NULL,
    -- Generated column: days_on_lot computed from listing_date
    days_on_lot INT GENERATED ALWAYS AS (CURRENT_DATE - listing_date) STORED,
    -- Generated column: discount_percent computed from asking_price vs msrp
    discount_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN msrp > 0 THEN ((msrp - asking_price) / msrp * 100) ELSE NULL END
    ) STORED,
    source VARCHAR(50) DEFAULT 'marketcheck',      -- 'marketcheck', 'manual', 'dealer_api'
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_make_model ON inventory(make, model, listing_date DESC);
CREATE INDEX idx_inventory_dealer ON inventory(dealer_name, listing_date DESC);
CREATE INDEX idx_inventory_province ON inventory(dealer_province, listing_date DESC);
CREATE INDEX idx_inventory_days_on_lot ON inventory(days_on_lot DESC);
```

**`brand_metadata`** — Static brand-specific content (negotiation profiles, F&I notes)

```sql
CREATE TABLE brand_metadata (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL UNIQUE,             -- 'bmw', 'mercedes', etc.
    captive_lender_name VARCHAR(100) NOT NULL,     -- 'BMW Financial Services'
    captive_lender_description TEXT,               -- Overview paragraph
    negotiation_profile TEXT NOT NULL,             -- What works/doesn't with this brand's dealers
    fi_considerations TEXT,                        -- Brand-specific F&I product notes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Script

Create: `backend/alembic/versions/2026_05_05_xxxx-0002_phase_1_4b_brand_pages.py`

Include upgrade/downgrade paths. Follow existing migration structure from Phase 1.4a.

### SQLAlchemy Models

Create: `backend/app/models/oem_program.py`, `backend/app/models/inventory.py`, `backend/app/models/brand_metadata.py`

Follow existing model patterns from `backend/app/models/` (if any exist) or from Workgraph patterns.

## Part 2: Manual BMW Data Seed Script

Create: `backend/scripts/seed_bmw_programs.py`

**Purpose:** Manually seed current BMW Financial Services programs (May 2026) into `oem_programs` and BMW brand metadata into `brand_metadata`.

**BMW Financial Services — May 2026 Programs** (use these as seed data):

```python
# BMW X3 xDrive30i — National (all provinces except Quebec)
{
    'brand': 'bmw',
    'program_month': '2026-05-01',
    'captive_lender': 'BMW Financial Services',
    'model_line': 'X3',
    'trim_level': 'xDrive30i',
    'province': None,  # National
    'term_months': 39,
    'annual_km': 16000,
    'rate_apr': 1.49,
    'residual_percent': 54.00,
    'incentive_type': 'lease_cash',
    'incentive_amount': 2500.00,
    'incentive_description': 'Lease Cash May 2026',
    'source_url': 'https://www.bmw.ca/en/shopping-tools/offers.html'
}

# BMW X3 xDrive30i — Quebec (QST compounding)
{
    'brand': 'bmw',
    'program_month': '2026-05-01',
    'captive_lender': 'BMW Financial Services',
    'model_line': 'X3',
    'trim_level': 'xDrive30i',
    'province': 'QC',
    'term_months': 39,
    'annual_km': 16000,
    'rate_apr': 1.99,  # Slightly higher in QC
    'residual_percent': 52.00,
    'incentive_type': 'lease_cash',
    'incentive_amount': 2000.00,
    'incentive_description': 'Lease Cash May 2026 - Quebec',
    'source_url': 'https://www.bmw.ca/fr/shopping-tools/offers.html'
}

# BMW 330i xDrive — National
{
    'brand': 'bmw',
    'program_month': '2026-05-01',
    'captive_lender': 'BMW Financial Services',
    'model_line': '3 Series',
    'trim_level': '330i xDrive',
    'province': None,
    'term_months': 48,
    'annual_km': 16000,
    'rate_apr': 2.99,
    'residual_percent': 48.00,
    'incentive_type': None,
    'incentive_amount': None,
    'incentive_description': None,
    'source_url': 'https://www.bmw.ca/en/shopping-tools/offers.html'
}

# Add 3-4 more BMW programs for variety (X5, 5 Series, etc.)
```

**BMW Brand Metadata:**

```python
{
    'brand': 'bmw',
    'captive_lender_name': 'BMW Financial Services',
    'captive_lender_description': 'BMW Financial Services is the captive lender for BMW vehicles in Canada. They set residual values and money factors for all BMW leases. BMW FS programs typically run monthly with competitive rates on popular models like the X3, 3 Series, and X5.',
    'negotiation_profile': '''BMW dealers in Canada operate with moderate negotiation flexibility. National programs are consistent, but dealer cash and volume bonuses create variability. Best results come from:
    
- Month-end timing (last 5 days of the month)
- Focusing on cap cost reduction rather than payment
- Leveraging competing BMW dealer quotes (especially in Toronto/Vancouver/Calgary markets)
- Understanding that X3 and 3 Series have the most competitive pricing due to volume
- Being aware that M models and limited-production vehicles have minimal discount
- Asking explicitly about loyalty bonuses (usually $1000-$1500) if you currently lease a BMW

BMW dealers are generally professional but can be rigid on pricing for in-demand models. European Delivery programs (pre-COVID) offered additional savings but are currently suspended.''',
    'fi_considerations': '''BMW F&I offices typically push:

- BMW Extended Warranty (overpriced vs third-party; negotiate or decline)
- Tire & Rim Protection (reasonable at $400-600 for 4 years)
- Paint Protection / Ceramic Coating (decline; overpriced dealer install)
- GAP Insurance (check if your provincial auto insurance already covers this)
- Loyalty Maintenance Package (can be value if you service at the dealer)

BMW Financial Services contracts are generally clean with few gotchas. Watch for lease-end wear-and-tear charges — BMW is stricter than average on minor cosmetic damage.'''
}
```

Script should:
1. Check if data already exists (to prevent duplicates on re-run)
2. Use upsert logic (ON CONFLICT ... DO UPDATE)
3. Log what was inserted/updated
4. Be runnable via `python -m backend.scripts.seed_bmw_programs`

## Part 3: Backend API — BMW Brand Page Endpoint

Create: `backend/app/api/v1/brands.py`

### Endpoint: GET /api/v1/brands/bmw

**Response schema** (8 sections as defined in Design Spec):

```python
{
    "brand": "bmw",
    "captive_lender": {
        "name": "BMW Financial Services",
        "description": "..."
    },
    "current_month_programs": {
        "month": "2026-05",
        "programs": [
            {
                "model_line": "X3",
                "trim_level": "xDrive30i",
                "term_months": 39,
                "annual_km": 16000,
                "rate_apr": 1.49,
                "residual_percent": 54.00,
                "incentives": [
                    {
                        "type": "lease_cash",
                        "amount": 2500.00,
                        "description": "Lease Cash May 2026"
                    }
                ]
            },
            // ... more programs
        ]
    },
    "historical_programs": {
        "months": ["2025-06", "2025-07", ..., "2026-05"],  // Last 12 months
        "rate_trend": [
            {"month": "2025-06", "avg_rate": 2.49},
            {"month": "2025-07", "avg_rate": 2.49},
            // ...
            {"month": "2026-05", "avg_rate": 1.99}
        ],
        "residual_trend": [
            {"month": "2025-06", "avg_residual": 52.00},
            // ...
        ]
    },
    "negotiation_profile": "...",
    "deal_benchmarks": {
        "models": [
            {
                "model_line": "X3",
                "trim_level": "xDrive30i",
                "sample_size": 42,
                "percentiles": {
                    "p25": 698.50,
                    "p50": 748.00,
                    "p75": 798.25
                },
                "avg_discount_percent": 9.2
            },
            // ... more models
        ]
    },
    "fi_considerations": "...",
    "community_discussions": [
        {
            "topic_id": 750768,
            "title": "2025 BMW X3 xDrive30i - 39/16k - $698/mo - AB",
            "url": "https://forum.leasehackr.com/t/750768",
            "created_at": "2026-04-28T10:23:00Z",
            "reply_count": 12
        },
        // ... 5 most recent BMW-tagged threads from lh_crawl_log
    ],
    "programs_archive": [
        {
            "month": "2026-04",
            "programs": [/* same structure as current_month_programs */]
        },
        {
            "month": "2026-03",
            "programs": [/* ... */]
        },
        // ... last 12 months
    ]
}
```

**Data sources per section:**

1. **captive_lender:** Query `brand_metadata` table
2. **current_month_programs:** Query `oem_programs` WHERE brand='bmw' AND program_month='2026-05-01'
3. **historical_programs:** Query `oem_programs` for last 12 months, aggregate avg rate/residual by month
4. **negotiation_profile:** From `brand_metadata`
5. **deal_benchmarks:** Query `market_deals` WHERE make='BMW', compute percentiles per model/trim
6. **fi_considerations:** From `brand_metadata`
7. **community_discussions:** Query `lh_crawl_log` WHERE category='deals-and-tips' AND outcome='extracted_canadian' (or use knowledge chunks), filter for BMW mentions, LIMIT 5 ORDER BY crawled_at DESC
8. **programs_archive:** Query `oem_programs` for last 12 months grouped by month

**Implementation notes:**
- Use SQLAlchemy async queries
- Cache response for 1 hour (programs don't change intraday)
- Return 200 with data or 404 if brand not found
- All currency values as Decimal, serialized to string in JSON ("748.00" not 748.0)

### Tests

Create: `backend/tests/api/v1/test_brands.py`

Test cases:
1. GET /api/v1/brands/bmw returns 200 with all 8 sections
2. Each section has expected schema
3. 404 on unknown brand
4. Historical programs correctly aggregated
5. Deal benchmarks handle empty market_deals gracefully

## Part 4: MarketCheck Inventory Crawler

Create: `backend/app/ingestion/marketcheck/`

### Files:
- `__init__.py`
- `client.py` — MarketCheck API client wrapper
- `crawl.py` — Main crawler logic
- `models.py` — Pydantic models for MarketCheck API responses

### MarketCheck API Integration

**API:** https://api.marketcheck.com/v2/search/car/active
**Auth:** API key in `MARKETCHECK_API_KEY` env var

**Request params:**
```python
{
    "api_key": MARKETCHECK_API_KEY,
    "country": "CA",
    "make": "BMW",  # Start with BMW only
    "rows": 50,     # Max results per call
    "start": 0      # Pagination offset
}
```

**Response structure:**
```json
{
    "num_found": 234,
    "listings": [
        {
            "id": "marketcheck-listing-id",
            "vin": "WBA8E9C51HNU12345",
            "heading": "2024 BMW X3 xDrive30i",
            "price": 62400,
            "msrp": 68900,
            "miles": 0,
            "dom": 45,  // Days on market (MarketCheck's days-on-lot equivalent)
            "build": {
                "year": 2024,
                "make": "BMW",
                "model": "X3",
                "trim": "xDrive30i"
            },
            "dealer": {
                "name": "BMW Downtown Toronto",
                "city": "Toronto",
                "state": "ON"
            },
            "first_seen_at": 1234567890000  // Unix timestamp ms
        }
    ]
}
```

### Crawler Logic

**Scheduled job:** Nightly at 02:00 UTC (APScheduler)

**Process:**
1. Call MarketCheck API for BMW inventory (paginate through all results)
2. For each listing:
   - Upsert to `inventory` table on VIN
   - Update `last_seen` timestamp
   - `listing_date` computed from `first_seen_at` timestamp
3. Mark stale inventory: UPDATE inventory SET last_seen = <2 days ago> as "delisted"
4. Log outcome to `crawl_log` table (reuse lh_crawl_log pattern or create separate table)

**Error handling:**
- Retry on 5xx (max 3 retries)
- Log and skip on 4xx
- Rate limit: 1 request per second (MarketCheck free tier limit)

**Cost:** MarketCheck API free tier: 500 requests/month. BMW inventory across Canada ≈ 200-300 active listings. 1 crawl = 6-10 API calls. Nightly crawl = ~300 calls/month. Within free tier.

### CLI Interface

Support manual trigger:
```bash
python -m app.ingestion.marketcheck.crawl --once
```

### Tests

Create: `backend/tests/ingestion/marketcheck/test_crawl.py`

Mock MarketCheck API responses, verify:
1. Upsert logic handles duplicates
2. listing_date computed correctly
3. Stale inventory detection works
4. Error handling retries appropriately

## Part 5: Frontend — BMW Brand Page

Create: `frontend/app/learn/bmw-deal-guide/page.tsx`

**Layout structure** (from Design Spec Section 5.13):

```tsx
<div className="brand-page">
  {/* Hero */}
  <section className="hero">
    <h1>BMW</h1>
    <div className="current-programs-highlight">
      {/* Display current month's top 2-3 programs */}
    </div>
  </section>

  {/* Captive Lender Overview */}
  <section className="captive-lender">
    <h2>BMW Financial Services</h2>
    <p>{captiveLenderDescription}</p>
  </section>

  {/* Historical Program Tracker */}
  <section className="historical-tracker">
    <h2>12-Month Program History</h2>
    <LineChart data={historicalPrograms} />
  </section>

  {/* Negotiation Profile */}
  <section className="negotiation-profile">
    <h2>How to Negotiate BMW Deals</h2>
    <div dangerouslySetInnerHTML={{__html: negotiationProfile}} />
  </section>

  {/* Deal Benchmarks */}
  <section className="deal-benchmarks">
    <h2>Recent Deal Benchmarks</h2>
    <table>
      {/* Percentile distribution per model/trim */}
    </table>
  </section>

  {/* F&I Considerations */}
  <section className="fi-considerations">
    <h2>Finance & Insurance Office</h2>
    <div dangerouslySetInnerHTML={{__html: fiConsiderations}} />
  </section>

  {/* Community Discussions */}
  <section className="community-discussions">
    <h2>Recent BMW Discussions</h2>
    <ul>
      {discussions.map(d => <li><a href={d.url}>{d.title}</a></li>)}
    </ul>
  </section>

  {/* Programs Archive */}
  <section className="programs-archive">
    <h2>Historical Programs</h2>
    <details>
      <summary>Show last 12 months</summary>
      {/* Accordion or table of past programs */}
    </details>
  </section>
</div>
```

**Data fetching:**
- Server Component — fetch from `GET /api/v1/brands/bmw` at page render time
- Cache for 1 hour (revalidate: 3600)
- Handle loading/error states

**Styling:**
- Follow design system from Design Spec Section 3
- Use CSS variables from `--ink`, `--paper`, `--lime`, etc.
- Typography: Space Grotesk (headings), Inter (body), JetBrains Mono (numbers)
- Mobile-first responsive (320px → 768px → 1200px breakpoints)

**Chart library:** Use Recharts for historical program tracker (rate/residual line chart)

## Part 6: Homepage Chrome Elements

Create/Update: `frontend/app/page.tsx` (homepage)

Add 4 new sections (Design Spec Section 5.1):

### 1. Live Deal Ticker

**Data source:** GET /api/v1/homepage/recent-deals

**API endpoint to create:** Returns 10 most recent community deals from `market_deals` or `lh_crawl_log`

**Response:**
```json
{
    "deals": [
        {
            "vehicle": "2025 BMW X3 xDrive30i",
            "province": "AB",
            "monthly_payment": 698.50,
            "percentile": 88,
            "submitted_at": "2026-05-04T14:32:00Z"
        },
        // ... 9 more
    ]
}
```

**UI:** Horizontal auto-scrolling ticker (6 seconds per card, pausable on hover)

### 2. Floorplan Clock Widget

**Data source:** GET /api/v1/homepage/floorplan-clock

**API endpoint to create:** Returns 1 random high-days-on-lot inventory item from `inventory` table

**Response:**
```json
{
    "vin": "WBA8E9C51HNU12345",
    "vehicle": "2024 BMW X3 xDrive30i",
    "dealer_name": "BMW Downtown Toronto",
    "dealer_province": "ON",
    "days_on_lot": 67,
    "daily_floorplan_cost": 11.27,
    "accumulated_cost": 755.09
}
```

**UI:** 
- Display VIN, vehicle, days on lot (large mono number)
- Accumulated floorplan cost ticker (updates every second client-side)
- Tooltip explaining floorplan interest calculation

### 3. Community Highlights

**Data source:** GET /api/v1/homepage/community-highlights

**API endpoint to create:** Returns 3 most recent quality threads from `lh_crawl_log`

**Response:**
```json
{
    "threads": [
        {
            "topic_id": 750768,
            "title": "2025 BMW X3 xDrive30i - 39/16k - $698/mo - AB",
            "url": "https://forum.leasehackr.com/t/750768",
            "excerpt": "Took delivery over the weekend...",
            "created_at": "2026-04-28T10:23:00Z"
        },
        // ... 2 more
    ]
}
```

### 4. Monthly Programs Snapshot

**Data source:** GET /api/v1/homepage/programs-snapshot

**API endpoint to create:** Returns current month's top programs for top 5 brands (BMW, Mercedes, Audi, Lexus, Toyota)

**Response:**
```json
{
    "month": "2026-05",
    "brands": [
        {
            "brand": "BMW",
            "featured_program": {
                "model_line": "X3",
                "rate_apr": 1.49,
                "term_months": 39
            }
        },
        // ... 4 more brands
    ]
}
```

**UI:** 5-column grid showing brand name + featured program

## Part 7: API Endpoints Summary

Create all in `backend/app/api/v1/`:

1. **brands.py:**
   - GET /api/v1/brands/bmw (detailed spec above)

2. **homepage.py:**
   - GET /api/v1/homepage/recent-deals
   - GET /api/v1/homepage/floorplan-clock
   - GET /api/v1/homepage/community-highlights
   - GET /api/v1/homepage/programs-snapshot

All endpoints:
- Return JSON
- Use Pydantic response models
- Handle empty data gracefully (return empty arrays, not 404)
- Cache for 5-60 minutes depending on data freshness

## Part 8: Testing & Verification

### Backend Tests
- `test_brands.py` — BMW endpoint returns all 8 sections
- `test_homepage.py` — All 4 homepage endpoints return expected schemas
- `test_marketcheck_crawl.py` — Inventory crawler logic
- Integration test: Seed BMW data → call API → verify response

### Frontend Tests
- Render test: BMW brand page loads without errors
- Data fetching: Mocked API responses render correctly
- Responsive: Verify mobile/tablet/desktop layouts

### Manual Verification Checklist
1. Run migration: `alembic upgrade head`
2. Seed BMW data: `python -m backend.scripts.seed_bmw_programs`
3. Start backend: `uvicorn app.main:app --reload`
4. Call GET /api/v1/brands/bmw → verify all 8 sections present
5. Start frontend: `npm run dev` (in frontend/)
6. Visit http://localhost:3000/learn/bmw-deal-guide → verify all sections render
7. Visit http://localhost:3000 → verify ticker, floorplan clock, community highlights, programs snapshot
8. Trigger MarketCheck crawler manually: `python -m app.ingestion.marketcheck.crawl --once`
9. Verify inventory table populated
10. Mobile-responsive test on real device or Chrome DevTools

## Part 9: Deployment Notes

**DO NOT deploy to production yet.** This is Phase 1.4b development only.

When ready to deploy:
1. Push branch to GitHub
2. Create PR #4: "Phase 1.4b — BMW Brand Page + Homepage Chrome"
3. Erik will review and merge to main
4. Manual deployment follows Workgraph pattern (SSH to VM, git pull, restart services)

## Part 10: Open Questions for Erik

1. **MarketCheck API key:** Erik needs to provide `MARKETCHECK_API_KEY` for testing
2. **Frontend scaffold:** Should Claude Code create the Next.js frontend structure from scratch, or does one exist?
3. **Design system CSS:** Should CSS variables be defined in a global stylesheet now, or defer to Phase 1.5?
4. **Discourse integration:** Community highlights endpoint pulls from `lh_crawl_log` (LeaseHackr) for now; Discourse SSO is Phase 1.5
5. **BMW programs accuracy:** The manual seed data above is illustrative — Erik should provide actual May 2026 BMW Financial Services programs if available

## Part 11: Success Criteria

Phase 1.4b is complete when:
- ✅ `alembic upgrade head` creates 3 new tables (oem_programs, inventory, brand_metadata)
- ✅ `python -m backend.scripts.seed_bmw_programs` successfully seeds BMW data
- ✅ GET /api/v1/brands/bmw returns 200 with all 8 sections
- ✅ Frontend route /learn/bmw-deal-guide renders and displays all 8 sections
- ✅ MarketCheck crawler runs and populates inventory table with real data
- ✅ Homepage shows 4 new chrome elements with real data
- ✅ All tests pass
- ✅ Mobile-responsive verification complete
- ✅ PR #4 ready for review

## Implementation Order

**Recommended sequence:**

1. **Database first:** Migration → models → seed script
2. **Backend second:** brands.py endpoint → homepage.py endpoints → tests
3. **MarketCheck third:** client.py → crawl.py → tests
4. **Frontend last:** BMW brand page → homepage chrome → responsive verification

This ensures data layer is solid before building API, and API is solid before building UI.

## Resources for Claude Code

- **CLAUDE.md:** `/var/www/leasewise/CLAUDE.md` — READ THIS FIRST
- **Existing scaffold:** `/var/www/leasewise/leasewise_scaffold/` — contains calculator API, lease_math module, test fixtures
- **Workgraph patterns:** If uncertain about SQLAlchemy patterns, auth patterns, or FastAPI structure, check Workgraph repo at `/var/www/workgraph` for reference
- **Design mockups:** `/var/www/leasewise/docs/design-phase/` — contains JSX mockups for visual reference (brand.css, brand-system.html)

---

**Erik:** Review this spec, provide MarketCheck API key and actual BMW program data if available, then hand to Claude Code to implement.

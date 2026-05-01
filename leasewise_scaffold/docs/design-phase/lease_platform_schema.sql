-- ============================================================
-- CANADIAN LEASE INTELLIGENCE PLATFORM
-- Database Schema v1.0
-- PostgreSQL on Azure Database for PostgreSQL Flexible Server
--
-- Domain Organization:
--   1. Extensions & Conventions
--   2. Reference Data       (provinces, makes, models, trims, fees)
--   3. Dealer Data          (dealers, dealer contacts)
--   4. Inventory Pipeline   (VIN-level listings, price history)
--   5. OEM Program Pipeline (lease rates, residuals, incentives)
--   6. Market Intelligence  (aggregated closed deals, community listings)
--   7. Tenant & User Data   (tenants, users, alerts)
--   8. Negotiation Engine   (campaigns, email threads)
--   9. Operational          (pipeline run logs, scraper config)
--
-- Conventions:
--   - All tenant-scoped tables carry tenant_id as first column
--   - Timestamps use TIMESTAMPTZ (UTC stored, display in user TZ)
--   - Monetary values use DECIMAL(10,2) unless noted
--   - Rates/percentages use DECIMAL(6,4) — e.g. 0.0149 = 1.49%
--   - Generated columns used for commonly-derived values
--   - JSONB for semi-structured payloads (options, extracted data)
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";           -- dealer geo queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- fuzzy text search on makes/models


-- ============================================================
-- 2. REFERENCE DATA
--    Static or slowly-changing lookup tables.
--    No tenant scoping — shared globally across all tenants.
-- ============================================================

-- ----------------------------------------------------------
-- provinces
-- Canonical list of Canadian provinces and territories with
-- their lease-relevant tax configuration.
--
-- Tax notes:
--   AB: GST only (5%), applied to monthly payment
--   ON: HST (13%), applied to monthly payment
--   BC: GST (5%) + PST (7-20% based on vehicle value),
--       PST applied to monthly payment since 2018
--   QC: GST (5%) + QST (9.975%), applied to monthly payment
--   MB: GST (5%) + PST (7%), applied to monthly payment
--   SK: GST (5%) + PST (6%), applied to monthly payment
--   NS/NB/NL/PEI: HST rates vary, applied to monthly payment
-- ----------------------------------------------------------

CREATE TABLE provinces (

    province_code               CHAR(2)         NOT NULL,
    province_name               VARCHAR(100)    NOT NULL,

    -- Tax rates stored as decimals (0.05 = 5%)
    gst_rate                    DECIMAL(6,4)    NOT NULL    DEFAULT 0.0500,
    pst_rate                    DECIMAL(6,4)    NOT NULL    DEFAULT 0.0000,
    hst_rate                    DECIMAL(6,4)    NOT NULL    DEFAULT 0.0000,

    -- BC has a sliding PST scale based on vehicle value
    -- This flag triggers the BC-specific tax calculation logic
    has_variable_pst            BOOLEAN         NOT NULL    DEFAULT FALSE,

    -- Some provinces apply tax to the full payment,
    -- others to a net-of-trade amount — this matters for calculator
    tax_applied_to              VARCHAR(50)     NOT NULL    DEFAULT 'monthly_payment',

    -- Common provincial regulatory fee name and amount
    -- (AMVIC in AB, OMVIC in ON, etc.)
    regulatory_fee_name         VARCHAR(100),
    regulatory_fee_amount       DECIMAL(8,2),

    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,
    notes                       TEXT,

    CONSTRAINT pk_provinces PRIMARY KEY (province_code)

);

INSERT INTO provinces (province_code, province_name, gst_rate, pst_rate, hst_rate, has_variable_pst, regulatory_fee_name, regulatory_fee_amount) VALUES
    ('AB', 'Alberta',                       0.0500, 0.0000, 0.0000, FALSE, 'AMVIC Fee',    6.25),
    ('BC', 'British Columbia',              0.0500, 0.0700, 0.0000, TRUE,  NULL,           NULL),
    ('MB', 'Manitoba',                      0.0500, 0.0700, 0.0000, FALSE, NULL,           NULL),
    ('NB', 'New Brunswick',                 0.0000, 0.0000, 0.1500, FALSE, NULL,           NULL),
    ('NL', 'Newfoundland and Labrador',     0.0000, 0.0000, 0.1500, FALSE, NULL,           NULL),
    ('NS', 'Nova Scotia',                   0.0000, 0.0000, 0.1500, FALSE, NULL,           NULL),
    ('NT', 'Northwest Territories',         0.0500, 0.0000, 0.0000, FALSE, NULL,           NULL),
    ('NU', 'Nunavut',                       0.0500, 0.0000, 0.0000, FALSE, NULL,           NULL),
    ('ON', 'Ontario',                       0.0000, 0.0000, 0.1300, FALSE, 'OMVIC Fee',   12.50),
    ('PE', 'Prince Edward Island',          0.0000, 0.0000, 0.1500, FALSE, NULL,           NULL),
    ('QC', 'Quebec',                        0.0500, 0.0000, 0.0000, FALSE, NULL,           NULL),  -- QST handled separately
    ('SK', 'Saskatchewan',                  0.0500, 0.0600, 0.0000, FALSE, NULL,           NULL),
    ('YT', 'Yukon',                         0.0500, 0.0000, 0.0000, FALSE, NULL,           NULL);


-- ----------------------------------------------------------
-- provincial_fees
-- Standard dealer fees by province. Helps the calculator
-- show true drive-away cost and the negotiation agent know
-- which fees are legitimately negotiable vs. mandatory.
-- ----------------------------------------------------------

CREATE TABLE provincial_fees (

    fee_id                      SERIAL,
    province_code               CHAR(2)         NOT NULL,

    fee_name                    VARCHAR(100)    NOT NULL,
    fee_category                VARCHAR(50)     NOT NULL,   -- regulatory, environmental, admin, lender
    typical_amount              DECIMAL(8,2),
    is_negotiable               BOOLEAN         NOT NULL    DEFAULT FALSE,
    is_mandatory                BOOLEAN         NOT NULL    DEFAULT TRUE,
    applies_to_lease            BOOLEAN         NOT NULL    DEFAULT TRUE,
    applies_to_finance          BOOLEAN         NOT NULL    DEFAULT TRUE,
    notes                       VARCHAR(500),

    CONSTRAINT pk_provincial_fees   PRIMARY KEY (fee_id),
    CONSTRAINT fk_pf_province       FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);

INSERT INTO provincial_fees (province_code, fee_name, fee_category, typical_amount, is_negotiable, is_mandatory, notes) VALUES
    ('AB', 'AMVIC Fee',             'regulatory',   6.25,   FALSE, TRUE,  'Alberta Motor Vehicle Industry Council — mandatory'),
    ('AB', 'Air Conditioning Levy', 'environmental', 100.00, FALSE, TRUE,  'Federal AC levy on all new vehicles with AC'),
    ('AB', 'Tire Levy',             'environmental', 20.00,  FALSE, TRUE,  'Varies by tire size'),
    ('AB', 'Documentation Fee',     'admin',        499.00,  TRUE,  FALSE, 'Dealer admin fee — negotiable, often waived'),
    ('AB', 'PPSA Registration',     'lender',        22.76,  FALSE, TRUE,  'Personal Property Security Act registration'),
    ('ON', 'OMVIC Fee',             'regulatory',   12.50,   FALSE, TRUE,  'Ontario Motor Vehicle Industry Council'),
    ('ON', 'Air Conditioning Levy', 'environmental', 100.00, FALSE, TRUE,  'Federal AC levy'),
    ('ON', 'Tire Recycling Fee',    'environmental', 20.00,  FALSE, TRUE,  NULL),
    ('ON', 'Documentation Fee',     'admin',        595.00,  TRUE,  FALSE, 'Dealer admin fee — negotiable'),
    ('ON', 'PPSA Registration',     'lender',        56.95,  FALSE, TRUE,  'Includes third-party agent fee'),
    ('BC', 'Documentation Fee',     'admin',        395.00,  TRUE,  FALSE, 'Negotiable'),
    ('BC', 'Air Conditioning Levy', 'environmental', 100.00, FALSE, TRUE,  NULL),
    ('BC', 'Tire Recycling Fee',    'environmental', 20.00,  FALSE, TRUE,  NULL);


-- ----------------------------------------------------------
-- vehicle_makes
-- Canonical list of vehicle manufacturers sold in Canada.
-- Includes captive lender info — critical for program scraping.
-- ----------------------------------------------------------

CREATE TABLE vehicle_makes (

    make_id                     SERIAL,
    make_name                   VARCHAR(100)    NOT NULL,
    make_name_normalized        VARCHAR(100)    NOT NULL,   -- lowercase, no spaces, for matching
    country_of_origin           VARCHAR(100),
    is_luxury                   BOOLEAN         NOT NULL    DEFAULT FALSE,
    is_active_in_canada         BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Captive lender details — used by the OEM program scraper
    captive_lender_name         VARCHAR(200),
    captive_lender_canada_url   VARCHAR(1000),
    program_page_url            VARCHAR(1000),             -- where monthly programs are published
    program_page_scraper_key    VARCHAR(100),              -- references scraper config

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_vehicle_makes         PRIMARY KEY (make_id),
    CONSTRAINT uq_make_name_normalized  UNIQUE (make_name_normalized)

);

INSERT INTO vehicle_makes (make_name, make_name_normalized, country_of_origin, is_luxury, captive_lender_name, captive_lender_canada_url, program_page_url) VALUES
    ('BMW',         'bmw',          'Germany',  TRUE,  'BMW Financial Services Canada', 'https://www.bmw.ca',       'https://www.bmw.ca/en/ssl/SpecialOffers.html'),
    ('Mercedes-Benz','mercedes-benz','Germany', TRUE,  'Mercedes-Benz Financial Services Canada', 'https://www.mercedes-benz.ca', 'https://www.mercedes-benz.ca/en/offers'),
    ('Audi',        'audi',         'Germany',  TRUE,  'Audi Financial Services Canada','https://www.audi.ca',      'https://www.audi.ca/ca/web/en/offers.html'),
    ('Lexus',       'lexus',        'Japan',    TRUE,  'Toyota Financial Services',     'https://www.lexus.ca',     'https://www.lexus.ca/en/offers'),
    ('Toyota',      'toyota',       'Japan',    FALSE, 'Toyota Financial Services',     'https://www.toyota.ca',    'https://www.toyota.ca/en/offers'),
    ('Honda',       'honda',        'Japan',    FALSE, 'Honda Financial Services',      'https://www.honda.ca',     'https://www.honda.ca/offers'),
    ('Hyundai',     'hyundai',      'Korea',    FALSE, 'Hyundai Financial Services',   'https://www.hyundai.ca',   'https://www.hyundai.ca/en/offers'),
    ('Genesis',     'genesis',      'Korea',    TRUE,  'Hyundai Financial Services',   'https://www.genesis.com/ca','https://www.genesis.com/ca/en/offers.html'),
    ('Kia',         'kia',          'Korea',    FALSE, 'Kia Finance Canada',            'https://www.kia.ca',       'https://www.kia.ca/offers'),
    ('Volkswagen',  'volkswagen',   'Germany',  FALSE, 'VW Credit Canada',             'https://www.vw.ca',        'https://www.vw.ca/en/models/offers.html'),
    ('Volvo',       'volvo',        'Sweden',   TRUE,  'Volvo Financial Services',     'https://www.volvocars.com/ca', 'https://www.volvocars.com/ca/offers'),
    ('Ford',        'ford',         'USA',      FALSE, 'Ford Motor Company of Canada', 'https://www.ford.ca',      'https://www.ford.ca/offers'),
    ('Chevrolet',   'chevrolet',    'USA',      FALSE, 'GM Financial Canada',           'https://www.chevrolet.ca', 'https://www.chevrolet.ca/content/gmcanada/en_CA/chevrolet/home.html'),
    ('GMC',         'gmc',          'USA',      FALSE, 'GM Financial Canada',           'https://www.gmc.ca',       NULL),
    ('Cadillac',    'cadillac',     'USA',      TRUE,  'GM Financial Canada',           'https://www.cadillac.ca',  NULL),
    ('Acura',       'acura',        'Japan',    TRUE,  'Honda Financial Services',     'https://www.acura.ca',     'https://www.acura.ca/offers'),
    ('Infiniti',    'infiniti',     'Japan',    TRUE,  'Nissan Financial Services',    'https://www.infiniti.ca',  NULL),
    ('Nissan',      'nissan',       'Japan',    FALSE, 'Nissan Financial Services',    'https://www.nissan.ca',    'https://www.nissan.ca/offers'),
    ('Porsche',     'porsche',      'Germany',  TRUE,  'Porsche Financial Services',   'https://www.porsche.com/canada', NULL),
    ('Land Rover',  'land-rover',   'UK',       TRUE,  'Jaguar Land Rover Financial Services', 'https://www.landrover.ca', NULL),
    ('Jaguar',      'jaguar',       'UK',       TRUE,  'Jaguar Land Rover Financial Services', 'https://www.jaguar.ca', NULL),
    ('Mazda',       'mazda',        'Japan',    FALSE, 'Mazda Financial Services',     'https://www.mazda.ca',     'https://www.mazda.ca/en/offers'),
    ('Subaru',      'subaru',       'Japan',    FALSE, 'Subaru Motors Finance',        'https://www.subaru.ca',    NULL),
    ('Jeep',        'jeep',         'USA',      FALSE, 'Stellantis Financial Services','https://www.jeep.ca',      NULL),
    ('RAM',         'ram',          'USA',      FALSE, 'Stellantis Financial Services','https://www.ramtrucks.ca',  NULL);


-- ----------------------------------------------------------
-- vehicle_models
-- Model-level reference data. One row per make + model name.
-- Year-specific data lives in vehicle_trims.
-- ----------------------------------------------------------

CREATE TABLE vehicle_models (

    model_id                    SERIAL,
    make_id                     INT             NOT NULL,

    model_name                  VARCHAR(200)    NOT NULL,
    model_name_normalized       VARCHAR(200)    NOT NULL,
    body_style                  VARCHAR(50),               -- sedan, suv, coupe, hatchback, truck, wagon, convertible, minivan
    segment                     VARCHAR(100),              -- subcompact, compact, midsize, fullsize, luxury_compact, etc.
    drive_type                  VARCHAR(20),               -- fwd, rwd, awd, 4wd (most common config)
    is_discontinued             BOOLEAN         NOT NULL    DEFAULT FALSE,

    CONSTRAINT pk_vehicle_models        PRIMARY KEY (model_id),
    CONSTRAINT fk_vm_make               FOREIGN KEY (make_id) REFERENCES vehicle_makes (make_id),
    CONSTRAINT uq_model_make_name       UNIQUE (make_id, model_name_normalized)

);


-- ----------------------------------------------------------
-- vehicle_trims
-- Year + trim level detail. MSRP is captured here because it
-- changes annually. This is the anchor for all calculations.
-- ----------------------------------------------------------

CREATE TABLE vehicle_trims (

    trim_id                     SERIAL,
    model_id                    INT             NOT NULL,

    model_year                  SMALLINT        NOT NULL,
    trim_name                   VARCHAR(200)    NOT NULL,
    trim_name_normalized        VARCHAR(200)    NOT NULL,
    oem_model_code              VARCHAR(50),               -- e.g. BMW's "8D97" for 330i xDrive
    base_msrp                   DECIMAL(10,2),
    freight_pdi                 DECIMAL(8,2),              -- varies by brand and region
    total_msrp                  DECIMAL(10,2)
        GENERATED ALWAYS AS (base_msrp + COALESCE(freight_pdi, 0)) STORED,

    engine_description          VARCHAR(200),
    transmission                VARCHAR(50),
    fuel_type                   VARCHAR(50),               -- gas, diesel, hybrid, phev, bev
    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Residual benchmarks (populated from CBB data or community sourced)
    -- Stored for reference — actual program residuals live in oem_programs
    benchmark_residual_36mo     DECIMAL(6,4),
    benchmark_residual_48mo     DECIMAL(6,4),
    benchmark_residual_60mo     DECIMAL(6,4),

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_vehicle_trims     PRIMARY KEY (trim_id),
    CONSTRAINT fk_vt_model          FOREIGN KEY (model_id) REFERENCES vehicle_models (model_id),
    CONSTRAINT uq_trim_detail       UNIQUE (model_id, model_year, trim_name_normalized)

);


-- ============================================================
-- 3. DEALER DATA
-- ============================================================

-- ----------------------------------------------------------
-- dealers
-- One row per physical dealership location. A dealer group
-- with multiple locations gets multiple rows.
-- Geo coordinates enable radius-based inventory search.
-- ----------------------------------------------------------

CREATE TABLE dealers (

    dealer_id                   SERIAL,
    make_id                     INT             NOT NULL,   -- primary franchise

    dealer_name                 VARCHAR(300)    NOT NULL,
    dealer_group_name           VARCHAR(300),              -- e.g. "AutoCanada", "Dilawri Group"
    province_code               CHAR(2)         NOT NULL,
    city                        VARCHAR(100)    NOT NULL,
    postal_code                 VARCHAR(10),
    street_address              VARCHAR(500),
    latitude                    DECIMAL(10,7),
    longitude                   DECIMAL(10,7),

    -- Contact — internet sales dept is the target for the agent
    internet_sales_email        VARCHAR(300),
    general_phone               VARCHAR(20),
    website_url                 VARCHAR(1000),

    -- External IDs for cross-referencing with data providers
    marketcheck_dealer_id       VARCHAR(100),
    google_place_id             VARCHAR(200),

    -- Operational metadata
    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,
    last_inventory_scraped_at   TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_dealers           PRIMARY KEY (dealer_id),
    CONSTRAINT fk_dealer_make       FOREIGN KEY (make_id) REFERENCES vehicle_makes (make_id),
    CONSTRAINT fk_dealer_province   FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);

-- Spatial index for radius queries ("dealers within 500km of Edmonton")
CREATE INDEX idx_dealers_geo ON dealers USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

CREATE INDEX idx_dealers_province      ON dealers (province_code);
CREATE INDEX idx_dealers_make          ON dealers (make_id);


-- ============================================================
-- 4. INVENTORY PIPELINE
--    Updated nightly by fn-inventory-crawl.
--    Tracks every qualifying VIN in Canada with full history.
-- ============================================================

-- ----------------------------------------------------------
-- inventory_listings
-- One row per VIN. Upserted nightly by the scraper.
-- When a VIN disappears from dealer inventory it is marked
-- 'sold' — the sold record feeds market_deals via a trigger.
-- ----------------------------------------------------------

CREATE TABLE inventory_listings (

    listing_id                  BIGSERIAL,
    vin                         CHAR(17)        NOT NULL,
    dealer_id                   INT             NOT NULL,
    trim_id                     INT,                       -- NULL if trim not resolved yet

    -- Denormalized vehicle fields (from scrape — don't always match trim_id)
    model_year                  SMALLINT        NOT NULL,
    make_name                   VARCHAR(100)    NOT NULL,
    model_name                  VARCHAR(200)    NOT NULL,
    trim_name                   VARCHAR(200),
    oem_model_code              VARCHAR(50),

    -- Physical description
    exterior_color              VARCHAR(100),
    interior_color              VARCHAR(100),
    options_packages            JSONB,                     -- raw list of option codes and descriptions
    mileage_km                  INT             DEFAULT 0, -- should be 0 for new, non-zero if demo/loaner

    -- Pricing
    msrp                        DECIMAL(10,2),
    asking_price                DECIMAL(10,2),
    discount_from_msrp          DECIMAL(10,2)
        GENERATED ALWAYS AS (msrp - asking_price) STORED,

    -- Lot age tracking — the most important field for negotiation
    first_seen_at               TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    last_seen_at                TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    days_on_lot                 INT
        GENERATED ALWAYS AS (
            EXTRACT(DAY FROM (last_seen_at - first_seen_at))::INT
        ) STORED,

    -- Status lifecycle
    status                      VARCHAR(20)     NOT NULL    DEFAULT 'active',
                                                            -- active | sold | transferred | unknown
    sold_at                     TIMESTAMPTZ,

    -- Data provenance
    source                      VARCHAR(50)     NOT NULL,   -- marketcheck | dealer_scrape | manual
    source_listing_id           VARCHAR(300),              -- MarketCheck listing ID or dealer stock #
    source_last_updated_at      TIMESTAMPTZ,
    raw_payload                 JSONB,                     -- full API response for replay

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_inventory_listings    PRIMARY KEY (listing_id),
    CONSTRAINT uq_inventory_vin         UNIQUE (vin),
    CONSTRAINT fk_inv_dealer            FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id),
    CONSTRAINT fk_inv_trim              FOREIGN KEY (trim_id) REFERENCES vehicle_trims (trim_id)

);

CREATE INDEX idx_inv_dealer             ON inventory_listings (dealer_id);
CREATE INDEX idx_inv_status             ON inventory_listings (status);
CREATE INDEX idx_inv_make_model         ON inventory_listings (make_name, model_name);
CREATE INDEX idx_inv_days_on_lot        ON inventory_listings (days_on_lot DESC);
CREATE INDEX idx_inv_first_seen         ON inventory_listings (first_seen_at);


-- ----------------------------------------------------------
-- inventory_price_history
-- Appended whenever the scraper detects a price change on
-- an active listing. Powers the "already discounted once"
-- dealer ranking signal in the negotiation agent.
-- ----------------------------------------------------------

CREATE TABLE inventory_price_history (

    price_history_id            BIGSERIAL,
    listing_id                  BIGINT          NOT NULL,
    vin                         CHAR(17)        NOT NULL,

    previous_price              DECIMAL(10,2)   NOT NULL,
    new_price                   DECIMAL(10,2)   NOT NULL,
    change_amount               DECIMAL(10,2)
        GENERATED ALWAYS AS (new_price - previous_price) STORED,
    change_percent              DECIMAL(6,4)
        GENERATED ALWAYS AS ((new_price - previous_price) / previous_price) STORED,

    recorded_at                 TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    detected_by_run_id          BIGINT,                    -- pipeline_runs FK added later

    CONSTRAINT pk_inv_price_history     PRIMARY KEY (price_history_id),
    CONSTRAINT fk_iph_listing           FOREIGN KEY (listing_id) REFERENCES inventory_listings (listing_id)

);

CREATE INDEX idx_iph_listing    ON inventory_price_history (listing_id);
CREATE INDEX idx_iph_vin        ON inventory_price_history (vin);


-- ============================================================
-- 5. OEM PROGRAM PIPELINE
--    Updated on the 1st of each month by fn-program-scraper.
--    Versioned — old programs are retained for trend analysis.
-- ============================================================

-- ----------------------------------------------------------
-- oem_programs
-- One row per make + model + term + km combination per program
-- period. is_current = TRUE means this is the active program.
-- Historical rows retained for trend/forecast analysis.
-- ----------------------------------------------------------

CREATE TABLE oem_programs (

    program_id                  BIGSERIAL,
    make_id                     INT             NOT NULL,
    trim_id                     INT,                       -- NULL = applies to all trims of model

    -- Denormalized for query convenience
    make_name                   VARCHAR(100)    NOT NULL,
    model_name                  VARCHAR(200),
    model_year                  SMALLINT,
    trim_name                   VARCHAR(200),
    oem_model_code              VARCHAR(50),

    -- Geographic scope
    province_code               CHAR(2),                   -- NULL = national program
    region_description          VARCHAR(200),              -- e.g. "Western Canada"

    -- Program terms
    term_months                 SMALLINT        NOT NULL,
    km_allowance_annual         INT             NOT NULL,

    -- The two numbers that drive the calculator
    lease_rate_percent          DECIMAL(6,4)    NOT NULL,  -- e.g. 0.0149 = 1.49%
    residual_percent            DECIMAL(6,4),              -- e.g. 0.4400 = 44%
    residual_amount             DECIMAL(10,2),             -- absolute dollar — populated when published

    -- Stacked programs
    cash_incentive              DECIMAL(10,2)   DEFAULT 0,
    loyalty_rate_reduction      DECIMAL(6,4)    DEFAULT 0, -- additional reduction for existing customers
    loyalty_cash                DECIMAL(10,2)   DEFAULT 0,
    conquest_cash               DECIMAL(10,2)   DEFAULT 0, -- for switching from competitor
    pull_ahead_months           SMALLINT        DEFAULT 0, -- early termination waiver in months

    -- Program validity
    program_start_date          DATE            NOT NULL,
    program_end_date            DATE,
    is_current                  BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Source tracking
    source_url                  VARCHAR(1000),
    raw_footnote                TEXT,                      -- verbatim footnote text from OEM page
    captured_at                 TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    captured_by_run_id          BIGINT,

    CONSTRAINT pk_oem_programs      PRIMARY KEY (program_id),
    CONSTRAINT fk_prog_make         FOREIGN KEY (make_id) REFERENCES vehicle_makes (make_id),
    CONSTRAINT fk_prog_trim         FOREIGN KEY (trim_id) REFERENCES vehicle_trims (trim_id),
    CONSTRAINT fk_prog_province     FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);

CREATE INDEX idx_prog_make_model    ON oem_programs (make_name, model_name);
CREATE INDEX idx_prog_is_current    ON oem_programs (is_current) WHERE is_current = TRUE;
CREATE INDEX idx_prog_start_date    ON oem_programs (program_start_date);
CREATE INDEX idx_prog_term_km       ON oem_programs (term_months, km_allowance_annual);


-- ----------------------------------------------------------
-- oem_incentives
-- Separate from program rates — tracks unadvertised cash,
-- conquest, loyalty, and affinity programs. These don't
-- change the rate or residual but reduce cap cost directly.
-- ----------------------------------------------------------

CREATE TABLE oem_incentives (

    incentive_id                BIGSERIAL,
    make_id                     INT             NOT NULL,
    trim_id                     INT,

    make_name                   VARCHAR(100)    NOT NULL,
    model_name                  VARCHAR(200),
    model_year                  SMALLINT,
    province_code               CHAR(2),

    incentive_type              VARCHAR(100)    NOT NULL,
                                                            -- cash_back | conquest | loyalty |
                                                            -- dealer_cash | affinity | pull_ahead |
                                                            -- fleet | first_responder | graduate
    incentive_amount            DECIMAL(10,2)   NOT NULL,
    is_stackable_with_rate      BOOLEAN         NOT NULL    DEFAULT FALSE,
    is_advertised               BOOLEAN         NOT NULL    DEFAULT FALSE,
    eligibility_conditions      TEXT,

    program_start_date          DATE,
    program_end_date            DATE,
    is_current                  BOOLEAN         NOT NULL    DEFAULT TRUE,

    source_url                  VARCHAR(1000),
    source                      VARCHAR(50),               -- oem_page | carcostcanada | user_report | rfd
    captured_at                 TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_oem_incentives    PRIMARY KEY (incentive_id),
    CONSTRAINT fk_inc_make          FOREIGN KEY (make_id) REFERENCES vehicle_makes (make_id),
    CONSTRAINT fk_inc_trim          FOREIGN KEY (trim_id) REFERENCES vehicle_trims (trim_id),
    CONSTRAINT fk_inc_province      FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);


-- ============================================================
-- 6. MARKET INTELLIGENCE
--    The "what people actually paid" database.
--    Fed by: user submissions, LeaseCosts, LeaseBusters,
--    RedFlagDeals posts, and post-campaign closed deal records.
-- ============================================================

-- ----------------------------------------------------------
-- market_deals
-- Normalized closed deal records regardless of source.
-- payment_to_msrp_ratio is your "Canadian 1%" equivalent metric.
-- quality_score reflects data reliability (5 = verified worksheet).
-- ----------------------------------------------------------

CREATE TABLE market_deals (

    deal_id                     BIGSERIAL,

    -- Vehicle identification
    make_name                   VARCHAR(100)    NOT NULL,
    model_name                  VARCHAR(200)    NOT NULL,
    trim_name                   VARCHAR(200),
    model_year                  SMALLINT        NOT NULL,
    trim_id                     INT,                       -- resolved when possible

    -- Geography
    province_code               CHAR(2),
    city                        VARCHAR(100),

    -- Deal economics
    msrp                        DECIMAL(10,2),
    cap_cost                    DECIMAL(10,2),             -- negotiated selling price (pre-tax, pre-down)
    discount_amount             DECIMAL(10,2)
        GENERATED ALWAYS AS (msrp - cap_cost) STORED,
    discount_percent            DECIMAL(6,4)
        GENERATED ALWAYS AS (
            CASE WHEN msrp > 0 THEN (msrp - cap_cost) / msrp ELSE NULL END
        ) STORED,
    down_payment                DECIMAL(10,2)   DEFAULT 0,
    cash_incentives_applied     DECIMAL(10,2)   DEFAULT 0,

    -- Lease structure
    term_months                 SMALLINT,
    km_allowance_annual         INT,
    lease_rate_percent          DECIMAL(6,4),
    residual_percent            DECIMAL(6,4),
    residual_amount             DECIMAL(10,2),

    -- Payment outcome
    monthly_payment_pretax      DECIMAL(10,2),
    monthly_payment_total       DECIMAL(10,2),             -- all-in with tax
    payment_to_msrp_ratio       DECIMAL(6,4)
        GENERATED ALWAYS AS (
            CASE WHEN msrp > 0 THEN (monthly_payment_total / msrp) * 100 ELSE NULL END
        ) STORED,                                          -- the "Canadian 1%" metric

    -- Context signals
    deal_month                  DATE,                      -- stored as YYYY-MM-01 for aggregation
    days_on_lot_at_deal         INT,
    dealer_id                   INT,
    was_month_end               BOOLEAN,                   -- deal closed in last 5 days of month

    -- Data provenance
    source                      VARCHAR(50)     NOT NULL,
                                                            -- user_submission | leasebusters |
                                                            -- leasecosts | rfd_post | campaign_close | manual
    source_listing_id           VARCHAR(300),
    quality_score               SMALLINT        NOT NULL    DEFAULT 3,
                                                            -- 1=estimated 3=reported 5=verified worksheet
    notes                       TEXT,
    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_market_deals      PRIMARY KEY (deal_id),
    CONSTRAINT fk_md_trim           FOREIGN KEY (trim_id) REFERENCES vehicle_trims (trim_id),
    CONSTRAINT fk_md_province       FOREIGN KEY (province_code) REFERENCES provinces (province_code),
    CONSTRAINT fk_md_dealer         FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id),
    CONSTRAINT chk_quality_score    CHECK (quality_score BETWEEN 1 AND 5)

);

CREATE INDEX idx_md_make_model      ON market_deals (make_name, model_name, model_year);
CREATE INDEX idx_md_deal_month      ON market_deals (deal_month);
CREATE INDEX idx_md_province        ON market_deals (province_code);
CREATE INDEX idx_md_ratio           ON market_deals (payment_to_msrp_ratio);
CREATE INDEX idx_md_source          ON market_deals (source);


-- ----------------------------------------------------------
-- community_listing_snapshots
-- Raw indexed listings from LeaseBusters and LeaseCosts.
-- These are lease takeover listings — separate signal from
-- new deal market_deals. Used for the takeover ranker.
-- ----------------------------------------------------------

CREATE TABLE community_listing_snapshots (

    snapshot_id                 BIGSERIAL,
    source                      VARCHAR(50)     NOT NULL,   -- leasebusters | leasecosts
    source_listing_id           VARCHAR(200)    NOT NULL,

    -- Vehicle
    make_name                   VARCHAR(100),
    model_name                  VARCHAR(200),
    model_year                  SMALLINT,
    trim_name                   VARCHAR(200),
    exterior_color              VARCHAR(100),
    vin                         CHAR(17),

    -- Lease terms being transferred
    province_code               CHAR(2),
    months_remaining            SMALLINT,
    km_remaining                INT,
    monthly_payment             DECIMAL(10,2),
    cash_incentive_from_seller  DECIMAL(10,2)   DEFAULT 0,
    residual_amount             DECIMAL(10,2),

    -- Takeover value signals
    net_monthly_cost            DECIMAL(10,2)
        GENERATED ALWAYS AS (
            monthly_payment - (cash_incentive_from_seller / NULLIF(months_remaining, 0))
        ) STORED,

    -- Listing lifecycle
    first_indexed_at            TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    last_indexed_at             TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    taken_over_at               TIMESTAMPTZ,
    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,

    CONSTRAINT pk_cls               PRIMARY KEY (snapshot_id),
    CONSTRAINT uq_cls_source        UNIQUE (source, source_listing_id),
    CONSTRAINT fk_cls_province      FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);

CREATE INDEX idx_cls_make_model     ON community_listing_snapshots (make_name, model_name);
CREATE INDEX idx_cls_province       ON community_listing_snapshots (province_code);
CREATE INDEX idx_cls_active         ON community_listing_snapshots (is_active) WHERE is_active = TRUE;


-- ============================================================
-- 7. TENANT & USER DATA
--    Tenant-scoped. Every row in these tables belongs to
--    a tenant and includes tenant_id as first column.
-- ============================================================

-- ----------------------------------------------------------
-- tenants
-- Top-level org for white-label support (credit unions, etc.)
-- The platform itself runs as tenant_id = 'leasewise' or
-- whatever you name it. Future white-label partners each
-- get their own tenant_id.
-- ----------------------------------------------------------

CREATE TABLE tenants (

    tenant_id                   VARCHAR(50)     NOT NULL,
    tenant_name                 VARCHAR(200)    NOT NULL,
    subscription_tier           VARCHAR(50)     NOT NULL    DEFAULT 'standard',
                                                            -- standard | white_label | partner
    custom_domain               VARCHAR(300),
    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,
    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_tenants PRIMARY KEY (tenant_id)

);

INSERT INTO tenants (tenant_id, tenant_name, subscription_tier) VALUES
    ('leasewise', 'LeaseWise Canada', 'standard');


-- ----------------------------------------------------------
-- users
-- Platform users. Azure AD B2C handles authentication;
-- azure_ad_object_id links this record to the identity.
-- Membership tier controls access to tool suite features.
-- ----------------------------------------------------------

CREATE TABLE users (

    tenant_id                   VARCHAR(50)     NOT NULL,
    user_id                     UUID            NOT NULL    DEFAULT uuid_generate_v4(),

    email                       VARCHAR(300)    NOT NULL,
    display_name                VARCHAR(200),
    phone                       VARCHAR(20),

    -- Location — used for dealer radius filtering
    province_code               CHAR(2),
    postal_code                 VARCHAR(10),
    latitude                    DECIMAL(10,7),
    longitude                   DECIMAL(10,7),

    -- Membership
    membership_tier             VARCHAR(50)     NOT NULL    DEFAULT 'free',
                                                            -- free | lifetime | agent
    membership_purchased_at     TIMESTAMPTZ,
    membership_price_paid       DECIMAL(8,2),

    -- Identity
    azure_ad_object_id          VARCHAR(200),              -- Azure AD B2C object ID

    -- Preferences
    preferred_term_months       SMALLINT        DEFAULT 48,
    preferred_km_annual         INT             DEFAULT 20000,
    preferred_notification      VARCHAR(20)     DEFAULT 'email', -- email | sms | both

    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,
    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_users             PRIMARY KEY (tenant_id, user_id),
    CONSTRAINT fk_user_tenant       FOREIGN KEY (tenant_id) REFERENCES tenants (tenant_id),
    CONSTRAINT fk_user_province     FOREIGN KEY (province_code) REFERENCES provinces (province_code),
    CONSTRAINT uq_user_email        UNIQUE (tenant_id, email)

);

CREATE INDEX idx_users_azure_ad     ON users (azure_ad_object_id);


-- ----------------------------------------------------------
-- user_alerts
-- A user's vehicle search configuration. The inventory
-- pipeline checks active alerts nightly and fires
-- notifications when matching VINs appear or age past
-- threshold. One user can have multiple active alerts.
-- ----------------------------------------------------------

CREATE TABLE user_alerts (

    tenant_id                   VARCHAR(50)     NOT NULL,
    alert_id                    UUID            NOT NULL    DEFAULT uuid_generate_v4(),
    user_id                     UUID            NOT NULL,

    -- Vehicle target
    make_name                   VARCHAR(100),
    model_name                  VARCHAR(200),
    model_year_min              SMALLINT,
    model_year_max              SMALLINT,
    trim_preferences            JSONB,                     -- ["330i xDrive", "330i"]
    required_options            JSONB,                     -- ["xDrive", "Premium Package"]
    excluded_colors             JSONB,                     -- ["white", "yellow"]

    -- Geography
    province_code               CHAR(2)         NOT NULL,
    max_distance_km             INT             NOT NULL    DEFAULT 500,

    -- Payment targets
    target_monthly_payment      DECIMAL(10,2)   NOT NULL,  -- what we're aiming for
    floor_monthly_payment       DECIMAL(10,2)   NOT NULL,  -- walk-away number
    max_down_payment            DECIMAL(10,2)   NOT NULL    DEFAULT 0,

    -- Lease structure preferences
    preferred_term_months       SMALLINT        NOT NULL    DEFAULT 48,
    km_allowance_annual         INT             NOT NULL    DEFAULT 20000,

    -- Notification thresholds
    notify_on_new_inventory     BOOLEAN         NOT NULL    DEFAULT TRUE,
    notify_days_on_lot_min      INT             DEFAULT 60, -- alert when lot age exceeds this
    notify_on_program_change    BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Alert lifecycle
    status                      VARCHAR(20)     NOT NULL    DEFAULT 'active',
                                                            -- active | paused | fulfilled | expired
    fulfilled_by_campaign_id    UUID,
    expires_at                  TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_user_alerts       PRIMARY KEY (tenant_id, alert_id),
    CONSTRAINT fk_ua_user           FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, user_id),
    CONSTRAINT fk_ua_province       FOREIGN KEY (province_code) REFERENCES provinces (province_code)

);

CREATE INDEX idx_ua_user            ON user_alerts (tenant_id, user_id);
CREATE INDEX idx_ua_status          ON user_alerts (tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_ua_make_model      ON user_alerts (make_name, model_name);


-- ============================================================
-- 8. NEGOTIATION ENGINE
--    The campaign is the core stateful object.
--    Durable Functions manage the orchestration externally;
--    these tables are the system of record.
-- ============================================================

-- ----------------------------------------------------------
-- negotiation_campaigns
-- One row per dealer outreach attempt per user.
-- A user targeting 3 dealers for the same vehicle has 3
-- campaign rows. The pre-flight snapshot captures the
-- market conditions at campaign start for later analysis.
-- ----------------------------------------------------------

CREATE TABLE negotiation_campaigns (

    tenant_id                   VARCHAR(50)     NOT NULL,
    campaign_id                 UUID            NOT NULL    DEFAULT uuid_generate_v4(),
    user_id                     UUID            NOT NULL,
    alert_id                    UUID,

    -- Target
    listing_id                  BIGINT,
    dealer_id                   INT             NOT NULL,
    vin                         CHAR(17),
    trim_id                     INT,

    -- Pre-flight calculation snapshot (point-in-time)
    msrp_at_start               DECIMAL(10,2),
    program_rate_at_start       DECIMAL(6,4),
    program_residual_at_start   DECIMAL(6,4),
    days_on_lot_at_start        INT,
    target_cap_cost             DECIMAL(10,2),             -- required price to hit target payment
    required_discount_percent   DECIMAL(6,4),
    market_percentile           SMALLINT,                  -- where target sits in deal distribution

    -- User targets (copied from alert for immutability)
    target_monthly_payment      DECIMAL(10,2)   NOT NULL,
    floor_monthly_payment       DECIMAL(10,2)   NOT NULL,
    auto_approve_threshold      DECIMAL(10,2),             -- agent sends without asking if offer <= this

    -- Campaign state machine
    status                      VARCHAR(50)     NOT NULL    DEFAULT 'drafting',
                                                            -- drafting | pending_approval | active |
                                                            -- replied | countering | accepted |
                                                            -- abandoned | no_response | expired
    durable_function_instance_id VARCHAR(200),             -- Azure Durable Functions orchestration ID

    -- Timeline
    outreach_sent_at            TIMESTAMPTZ,
    first_reply_at              TIMESTAMPTZ,
    last_activity_at            TIMESTAMPTZ,
    closed_at                   TIMESTAMPTZ,

    -- Outcome (populated on close)
    outcome                     VARCHAR(50),               -- accepted | abandoned | no_response | price_not_met
    final_cap_cost              DECIMAL(10,2),
    final_monthly_payment       DECIMAL(10,2),
    savings_vs_msrp             DECIMAL(10,2)
        GENERATED ALWAYS AS (msrp_at_start - final_cap_cost) STORED,

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_campaigns         PRIMARY KEY (tenant_id, campaign_id),
    CONSTRAINT fk_camp_user         FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, user_id),
    CONSTRAINT fk_camp_listing      FOREIGN KEY (listing_id) REFERENCES inventory_listings (listing_id),
    CONSTRAINT fk_camp_dealer       FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id),
    CONSTRAINT fk_camp_trim         FOREIGN KEY (trim_id) REFERENCES vehicle_trims (trim_id)

);

CREATE INDEX idx_camp_user          ON negotiation_campaigns (tenant_id, user_id);
CREATE INDEX idx_camp_status        ON negotiation_campaigns (tenant_id, status);
CREATE INDEX idx_camp_dealer        ON negotiation_campaigns (dealer_id);
CREATE INDEX idx_camp_vin           ON negotiation_campaigns (vin);


-- ----------------------------------------------------------
-- campaign_emails
-- Every email in a negotiation thread — both directions.
-- This is the audit trail and the training data.
-- The AI draft sits here until user approves; approved_at
-- is NULL until the user taps approve in the app.
-- ----------------------------------------------------------

CREATE TABLE campaign_emails (

    tenant_id                   VARCHAR(50)     NOT NULL,
    email_id                    UUID            NOT NULL    DEFAULT uuid_generate_v4(),
    campaign_id                 UUID            NOT NULL,

    -- Direction and addressing
    direction                   VARCHAR(10)     NOT NULL,   -- outbound | inbound
    from_address                VARCHAR(300),
    to_address                  VARCHAR(300),
    cc_addresses                JSONB,
    subject                     VARCHAR(500),
    reply_to_email_id           UUID,                      -- thread linking

    -- Content
    body_text                   TEXT,
    body_html                   TEXT,

    -- AI processing layer
    classification              VARCHAR(100),
                                                            -- opening | counter_offer | stall |
                                                            -- info_request | accepted | rejected |
                                                            -- unknown
    extracted_offer             JSONB,                     -- structured: {cap_cost, payment, term, ...}
    extraction_confidence       DECIMAL(4,3),              -- 0.0 to 1.0
    ai_draft_response           TEXT,                      -- Claude's suggested reply
    ai_draft_model              VARCHAR(100),              -- which model generated the draft
    ai_draft_created_at         TIMESTAMPTZ,

    -- Approval workflow (outbound only)
    requires_approval           BOOLEAN         NOT NULL    DEFAULT TRUE,
    approved_at                 TIMESTAMPTZ,
    approved_by_user_id         UUID,
    user_edited_before_send     BOOLEAN         DEFAULT FALSE,

    -- Send/receive tracking
    sent_at                     TIMESTAMPTZ,
    received_at                 TIMESTAMPTZ,
    external_message_id         VARCHAR(500),              -- ACS or Postmark message ID
    delivery_status             VARCHAR(50),               -- delivered | bounced | failed

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_campaign_emails   PRIMARY KEY (tenant_id, email_id),
    CONSTRAINT fk_ce_campaign       FOREIGN KEY (tenant_id, campaign_id) REFERENCES negotiation_campaigns (tenant_id, campaign_id)

);

CREATE INDEX idx_ce_campaign        ON campaign_emails (tenant_id, campaign_id);
CREATE INDEX idx_ce_direction       ON campaign_emails (direction);
CREATE INDEX idx_ce_sent_at         ON campaign_emails (sent_at);
CREATE INDEX idx_ce_classification  ON campaign_emails (classification);


-- ============================================================
-- 9. OPERATIONAL TABLES
--    Pipeline health, scraper configuration, audit logs.
-- ============================================================

-- ----------------------------------------------------------
-- pipeline_runs
-- Every execution of every Azure Function pipeline is logged.
-- App Insights handles the telemetry side; this table gives
-- you queryable history for debugging and trend analysis.
-- ----------------------------------------------------------

CREATE TABLE pipeline_runs (

    run_id                      BIGSERIAL,
    pipeline_name               VARCHAR(200)    NOT NULL,
                                                            -- fn-inventory-crawl | fn-program-scraper-bmw |
                                                            -- fn-listing-indexer | fn-rfd-listener | etc.
    trigger_type                VARCHAR(50),               -- timer | manual | event | test
    status                      VARCHAR(20)     NOT NULL    DEFAULT 'running',
                                                            -- running | completed | failed | partial

    -- Execution metrics
    records_fetched             INT             DEFAULT 0,
    records_inserted            INT             DEFAULT 0,
    records_updated             INT             DEFAULT 0,
    records_skipped             INT             DEFAULT 0,
    records_failed              INT             DEFAULT 0,

    -- Timing
    started_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    completed_at                TIMESTAMPTZ,
    duration_seconds            INT
        GENERATED ALWAYS AS (
            EXTRACT(EPOCH FROM (completed_at - started_at))::INT
        ) STORED,

    -- Error capture
    error_message               TEXT,
    error_detail                JSONB,

    -- App Insights correlation
    app_insights_operation_id   VARCHAR(200),

    CONSTRAINT pk_pipeline_runs PRIMARY KEY (run_id)

);

CREATE INDEX idx_pr_pipeline_name   ON pipeline_runs (pipeline_name);
CREATE INDEX idx_pr_status          ON pipeline_runs (status);
CREATE INDEX idx_pr_started_at      ON pipeline_runs (started_at DESC);


-- ----------------------------------------------------------
-- scraper_config
-- Per-target configuration for the OEM program scrapers.
-- Allows updating scrape rules without redeploying Functions.
-- Stored in DB so the Function reads config at runtime.
-- ----------------------------------------------------------

CREATE TABLE scraper_config (

    config_id                   SERIAL,
    scraper_key                 VARCHAR(100)    NOT NULL,   -- matches vehicle_makes.program_page_scraper_key
    make_id                     INT,

    target_url                  VARCHAR(1000)   NOT NULL,
    scrape_strategy             VARCHAR(50)     NOT NULL,   -- css_selector | xpath | api | playwright
    extraction_rules            JSONB           NOT NULL,   -- selectors/rules for parsing
    request_headers             JSONB,
    rate_limit_ms               INT             DEFAULT 2000,

    -- Schedule
    cron_expression             VARCHAR(100),              -- Azure Functions timer expression
    is_active                   BOOLEAN         NOT NULL    DEFAULT TRUE,

    last_successful_scrape_at   TIMESTAMPTZ,
    last_run_id                 BIGINT,
    consecutive_failures        INT             DEFAULT 0,
    failure_alert_threshold     INT             DEFAULT 3,

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_scraper_config    PRIMARY KEY (config_id),
    CONSTRAINT uq_scraper_key       UNIQUE (scraper_key),
    CONSTRAINT fk_sc_make           FOREIGN KEY (make_id) REFERENCES vehicle_makes (make_id)

);


-- ============================================================
-- VIEWS
--    Pre-built query surfaces for the application layer.
-- ============================================================

-- Active inventory with full context for the deal finder
CREATE VIEW vw_active_inventory AS
    SELECT
        il.listing_id,
        il.vin,
        il.model_year,
        il.make_name,
        il.model_name,
        il.trim_name,
        il.exterior_color,
        il.interior_color,
        il.options_packages,
        il.msrp,
        il.asking_price,
        il.discount_from_msrp,
        il.days_on_lot,
        il.first_seen_at,
        d.dealer_name,
        d.city,
        d.province_code,
        d.latitude,
        d.longitude,
        d.internet_sales_email,
        d.latitude                          AS dealer_lat,
        d.longitude                         AS dealer_lng,
        vt.benchmark_residual_48mo,
        vm.captive_lender_name
    FROM        inventory_listings          il
    JOIN        dealers                     d   ON  d.dealer_id     = il.dealer_id
    JOIN        vehicle_makes               vm  ON  vm.make_id      = d.make_id
    LEFT JOIN   vehicle_trims               vt  ON  vt.trim_id      = il.trim_id
    WHERE       il.status = 'active';


-- Current OEM programs — most common join needed by the calculator
CREATE VIEW vw_current_programs AS
    SELECT
        op.program_id,
        op.make_name,
        op.model_name,
        op.model_year,
        op.trim_name,
        op.province_code,
        op.term_months,
        op.km_allowance_annual,
        op.lease_rate_percent,
        op.residual_percent,
        op.residual_amount,
        op.cash_incentive,
        op.loyalty_rate_reduction,
        op.conquest_cash,
        op.pull_ahead_months,
        op.program_start_date,
        op.program_end_date,
        vm.captive_lender_name,
        vm.is_luxury
    FROM        oem_programs                op
    JOIN        vehicle_makes               vm  ON  vm.make_id = op.make_id
    WHERE       op.is_current = TRUE;


-- Deal distribution summary — drives the percentile calculator
CREATE VIEW vw_deal_benchmarks AS
    SELECT
        make_name,
        model_name,
        model_year,
        province_code,
        term_months,
        COUNT(*)                            AS deal_count,
        AVG(discount_percent)               AS avg_discount_percent,
        PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY discount_percent)  AS p25_discount,
        PERCENTILE_CONT(0.50)
            WITHIN GROUP (ORDER BY discount_percent)  AS median_discount,
        PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY discount_percent)  AS p75_discount,
        AVG(payment_to_msrp_ratio)          AS avg_payment_ratio,
        PERCENTILE_CONT(0.50)
            WITHIN GROUP (ORDER BY payment_to_msrp_ratio) AS median_payment_ratio,
        MAX(deal_month)                     AS most_recent_deal
    FROM        market_deals
    WHERE       quality_score >= 3
    GROUP BY    make_name, model_name, model_year, province_code, term_months;

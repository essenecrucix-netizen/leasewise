-- ============================================================
-- LeaseWise Canada — LeaseHackr Pipeline Supporting Tables
-- Run these additions against the existing schema
--
-- lh_crawl_log        : tracks every topic ever seen so we
--                        never re-process the same post twice
-- lh_knowledge_chunks : extracted insights from Q&A and Wiki
--                        posts — feeds the weekly synthesis job
-- ============================================================


-- ----------------------------------------------------------
-- lh_crawl_log
-- Idempotency table. Every topic we touch gets logged here.
-- The nightly crawl skips any topic_id already present.
-- This means we naturally process newest-first and never
-- re-extract facts from the same post twice.
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS lh_crawl_log (

    topic_id            BIGINT          NOT NULL,
    category            VARCHAR(100)    NOT NULL,

    outcome             VARCHAR(50)     NOT NULL,
                                        -- deal_stored | knowledge_stored |
                                        -- not_a_deal | no_knowledge |
                                        -- skipped_pinned | skipped_short |
                                        -- fetch_failed | db_error

    crawled_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_lh_crawl_log      PRIMARY KEY (topic_id)

);

CREATE INDEX IF NOT EXISTS idx_lh_crawl_outcome  ON lh_crawl_log (outcome);
CREATE INDEX IF NOT EXISTS idx_lh_crawl_at       ON lh_crawl_log (crawled_at DESC);


-- ----------------------------------------------------------
-- lh_knowledge_chunks
-- Extracted insights from Ask the Hackrs and Wiki posts.
-- No post text is stored here — only synthesized facts
-- that Claude extracted in its own words.
-- The weekly synthesis job aggregates these by make into
-- full knowledge documents stored in Blob Storage.
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS lh_knowledge_chunks (

    chunk_id            BIGSERIAL,
    source_topic_id     BIGINT          NOT NULL,
    source_topic_title  VARCHAR(500),
    source_created_at   TIMESTAMPTZ,

    -- Extracted structure
    makes_mentioned     TEXT[]          NOT NULL    DEFAULT '{}',
    topics              TEXT[]          NOT NULL    DEFAULT '{}',
                                        -- negotiation | residual | money_factor |
                                        -- timing | fi_office | dealer_tactics |
                                        -- program | transfer | ev | luxury
    key_insights        TEXT[]          NOT NULL    DEFAULT '{}',
    applies_to_canada   BOOLEAN,
    confidence          VARCHAR(20),    -- high | medium | low
    source_tags         TEXT[]          NOT NULL    DEFAULT '{}',

    -- Lifecycle
    synthesized_at      TIMESTAMPTZ,   -- NULL until the weekly synthesis job runs
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    CONSTRAINT pk_lh_knowledge_chunks   PRIMARY KEY (chunk_id),
    CONSTRAINT uq_lh_topic_id          UNIQUE (source_topic_id)

);

CREATE INDEX IF NOT EXISTS idx_lhkc_makes       ON lh_knowledge_chunks USING GIN (makes_mentioned);
CREATE INDEX IF NOT EXISTS idx_lhkc_topics      ON lh_knowledge_chunks USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_lhkc_synthesized ON lh_knowledge_chunks (synthesized_at) WHERE synthesized_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lhkc_confidence  ON lh_knowledge_chunks (confidence);


-- ----------------------------------------------------------
-- Pipeline run stats view — quick health check
-- ----------------------------------------------------------

CREATE OR REPLACE VIEW vw_lh_pipeline_stats AS
    SELECT
        outcome,
        COUNT(*)                                AS topic_count,
        MAX(crawled_at)                         AS last_seen,
        MIN(crawled_at)                         AS first_seen
    FROM        lh_crawl_log
    GROUP BY    outcome
    ORDER BY    topic_count DESC;


-- ----------------------------------------------------------
-- Deal coverage view — what's in the market_deals table
-- from LeaseHackr specifically
-- ----------------------------------------------------------

CREATE OR REPLACE VIEW vw_lh_deal_coverage AS
    SELECT
        make_name,
        model_name,
        model_year,
        COUNT(*)                                AS deal_count,
        ROUND(AVG(discount_percent)::numeric * 100, 2)  AS avg_discount_pct,
        ROUND(AVG(lease_rate_percent)::numeric * 100, 4) AS avg_rate_pct,
        ROUND(AVG(residual_percent)::numeric * 100, 2)   AS avg_residual_pct,
        MIN(deal_month)                         AS earliest_deal,
        MAX(deal_month)                         AS latest_deal
    FROM        market_deals
    WHERE       source = 'leasehackr'
    GROUP BY    make_name, model_name, model_year
    ORDER BY    deal_count DESC;

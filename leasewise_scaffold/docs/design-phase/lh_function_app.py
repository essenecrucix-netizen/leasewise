"""
LeaseWise Canada — LeaseHackr Knowledge Ingestion Pipeline
Azure Function App

Two functions:
  1. fn_leasehackr_crawl     — Timer trigger, runs nightly
                               Crawls Signed Deals + Ask the Hackrs + Wiki
                               Extracts structured facts via Claude Haiku
                               Stores facts in market_deals table
                               Queues topics for synthesis

  2. fn_leasehackr_synthesize — Queue trigger
                                Receives batches of related topics (by make/model)
                                Generates synthesis knowledge documents via Claude Sonnet
                                Stores documents in Blob Storage + Azure AI Search index

Design principles:
  - No post text is ever stored — only extracted structured facts
  - Rate limiting: 3-second delay between API calls, respects Discourse limits
  - Idempotent: topic_id tracked in lh_crawl_log, never re-processed
  - Cost-aware: Haiku for extraction ($0.0008/1K tokens), Sonnet for synthesis only
"""

import azure.functions as func
import logging
import asyncio
import aiohttp
import json
import time
import re
import os
from datetime import datetime, timezone
from typing import Optional
import psycopg2
from psycopg2.extras import execute_values
import anthropic

app = func.FunctionApp()

# ── Config ──────────────────────────────────────────────────────────────────
LH_BASE          = "https://forum.leasehackr.com"
LH_USER_AGENT    = "LeaseWise-Research/1.0 (canadian-lease-intelligence; contact@leasewise.ca)"
CRAWL_DELAY_SEC  = 3.0          # be a polite crawler
MAX_TOPICS_PER_RUN = 200        # safety cap per nightly run

# Categories to crawl and their priority
CATEGORIES = [
    {"id": 6,  "slug": "deals-and-tips",  "name": "Signed Deals",    "mode": "deals"},
    {"id": 5,  "slug": "ask-the-hackrs",  "name": "Ask the Hackrs",  "mode": "knowledge"},
    {"id": 10, "slug": "faq",             "name": "Wiki",            "mode": "knowledge"},
]

# ── Database ─────────────────────────────────────────────────────────────────
def get_db():
    return psycopg2.connect(os.environ["POSTGRES_CONNECTION_STRING"])


def get_anthropic():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


# ── Extraction prompt (Haiku — cheap, fast, structured) ──────────────────────
DEAL_EXTRACTION_PROMPT = """
You are extracting structured lease deal facts from a forum post.
Extract ONLY factual numeric and categorical data present in the text.
Do NOT infer, estimate, or fill in missing values.
Return ONLY valid JSON with exactly these fields (use null for missing):

{
  "is_deal_post": true/false,
  "vehicle_year": integer or null,
  "make": "string or null",
  "model": "string or null",
  "trim": "string or null",
  "msrp_usd": number or null,
  "selling_price_usd": number or null,
  "discount_percent": number or null,
  "money_factor": number or null,
  "lease_rate_percent": number or null,
  "residual_percent": number or null,
  "term_months": integer or null,
  "km_or_miles_annual": number or null,
  "is_miles": true/false,
  "monthly_payment_usd": number or null,
  "down_payment_usd": number or null,
  "cash_incentives_usd": number or null,
  "region_state": "2-letter US state or null",
  "region_description": "string or null",
  "deal_date": "YYYY-MM or null",
  "lender": "string or null",
  "was_month_end": true/false/null,
  "key_tactics": ["array of negotiation tactics mentioned, max 5 strings, or empty array"]
}

Return ONLY the JSON object. No explanation, no markdown, no preamble.
"""

KNOWLEDGE_EXTRACTION_PROMPT = """
You are extracting lease negotiation knowledge from a forum post or wiki article.
Extract the key insights, tactics, and facts that would help a Canadian car leaser.

Return ONLY valid JSON:
{
  "has_useful_knowledge": true/false,
  "makes_mentioned": ["array of car makes"],
  "topics": ["array of topics: negotiation, residual, money_factor, timing, fi_office, dealer_tactics, program, etc"],
  "key_insights": ["array of specific actionable insights, max 8, in your own words summarizing the facts"],
  "applies_to_canada": true/false/null,
  "confidence": "high/medium/low"
}

Return ONLY the JSON object. No explanation, no markdown.
"""


# ── Discourse API client ──────────────────────────────────────────────────────
class DiscourseClient:

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.headers = {
            "Accept": "application/json",
            "User-Agent": LH_USER_AGENT,
        }

    async def get_topic_list(self, category_id: int, page: int = 0) -> dict:
        url = f"{LH_BASE}/c/{category_id}.json?page={page}"
        async with self.session.get(url, headers=self.headers) as resp:
            if resp.status == 200:
                return await resp.json()
            logging.warning(f"Topic list {category_id} page {page}: HTTP {resp.status}")
            return {}

    async def get_topic(self, topic_id: int) -> dict:
        url = f"{LH_BASE}/t/{topic_id}.json"
        async with self.session.get(url, headers=self.headers) as resp:
            if resp.status == 200:
                return await resp.json()
            logging.warning(f"Topic {topic_id}: HTTP {resp.status}")
            return {}

    async def get_wiki_topics(self) -> list:
        """Wiki posts are high-value — get all of them."""
        data = await self.get_topic_list(10, 0)
        return data.get("topic_list", {}).get("topics", [])


def strip_html(html: str) -> str:
    """Remove HTML tags and clean up whitespace."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_first_post_text(topic_data: dict) -> str:
    """Extract clean text from the first post of a topic."""
    posts = topic_data.get("post_stream", {}).get("posts", [])
    if not posts:
        return ""
    first_post = posts[0]
    cooked = first_post.get("cooked", "")
    return strip_html(cooked)[:3000]     # cap at 3000 chars — enough for extraction


# ── Claude extraction ─────────────────────────────────────────────────────────
def extract_deal_facts(client: anthropic.Anthropic, post_text: str, topic: dict) -> Optional[dict]:
    """
    Send post text to Claude Haiku for structured fact extraction.
    Returns None if the post is not a deal post or extraction fails.
    Note: post text is sent to Claude but never stored.
    """
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"{DEAL_EXTRACTION_PROMPT}\n\nPost title: {topic.get('title', '')}\n\nPost text:\n{post_text}"
            }]
        )
        raw = msg.content[0].text.strip()
        # Strip any accidental markdown fences
        raw = re.sub(r"^```json\s*|```\s*$", "", raw, flags=re.MULTILINE).strip()
        facts = json.loads(raw)

        if not facts.get("is_deal_post"):
            return None

        # Attach metadata that doesn't come from the post text
        facts["source_topic_id"]   = topic.get("id")
        facts["source_topic_title"] = topic.get("title", "")
        facts["source_category"]   = "signed_deals"
        facts["source_tags"]       = [t["name"] for t in topic.get("tags", [])]
        facts["source_created_at"] = topic.get("created_at", "")

        return facts

    except (json.JSONDecodeError, Exception) as e:
        logging.warning(f"Deal extraction failed for topic {topic.get('id')}: {e}")
        return None


def extract_knowledge(client: anthropic.Anthropic, post_text: str, topic: dict) -> Optional[dict]:
    """Extract knowledge insights from a Q&A or Wiki post."""
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"{KNOWLEDGE_EXTRACTION_PROMPT}\n\nTitle: {topic.get('title', '')}\n\nText:\n{post_text}"
            }]
        )
        raw = msg.content[0].text.strip()
        raw = re.sub(r"^```json\s*|```\s*$", "", raw, flags=re.MULTILINE).strip()
        knowledge = json.loads(raw)

        if not knowledge.get("has_useful_knowledge"):
            return None

        knowledge["source_topic_id"]    = topic.get("id")
        knowledge["source_topic_title"] = topic.get("title", "")
        knowledge["source_created_at"]  = topic.get("created_at", "")
        knowledge["source_tags"]        = [t["name"] for t in topic.get("tags", [])]

        return knowledge

    except (json.JSONDecodeError, Exception) as e:
        logging.warning(f"Knowledge extraction failed for topic {topic.get('id')}: {e}")
        return None


# ── Database writes ───────────────────────────────────────────────────────────
def store_deal_facts(conn, facts: dict):
    """
    Write extracted deal facts to market_deals.
    Only structured facts are stored — no original post text.
    """
    # Convert money factor to lease rate percent if needed
    lease_rate = facts.get("lease_rate_percent")
    mf = facts.get("money_factor")
    if lease_rate is None and mf is not None:
        lease_rate = round(mf * 2400, 4)

    # Convert miles to km if US deal
    km_annual = facts.get("km_or_miles_annual")
    if km_annual and facts.get("is_miles"):
        km_annual = round(km_annual * 1.60934)

    # Deal month from created_at
    deal_month = None
    created = facts.get("source_created_at", "")
    if created:
        try:
            deal_month = datetime.fromisoformat(created.replace("Z", "+00:00")).strftime("%Y-%m-01")
        except ValueError:
            pass

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO market_deals (
                make_name, model_name, trim_name, model_year,
                province_code, msrp, cap_cost,
                term_months, km_allowance_annual,
                lease_rate_percent, residual_percent,
                monthly_payment_total, down_payment,
                cash_incentives_applied, deal_month,
                source, source_listing_id, quality_score, notes
            ) VALUES (
                %s, %s, %s, %s,
                NULL, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                'leasehackr', %s, 3, %s
            )
            ON CONFLICT DO NOTHING
        """, (
            facts.get("make"),
            facts.get("model"),
            facts.get("trim"),
            facts.get("vehicle_year"),
            facts.get("msrp_usd"),           # USD — flagged by source='leasehackr'
            facts.get("selling_price_usd"),
            facts.get("term_months"),
            km_annual,
            lease_rate,
            facts.get("residual_percent"),
            facts.get("monthly_payment_usd"),
            facts.get("down_payment_usd", 0),
            facts.get("cash_incentives_usd", 0),
            deal_month,
            str(facts.get("source_topic_id")),
            json.dumps({
                "region":      facts.get("region_state"),
                "lender":      facts.get("lender"),
                "tactics":     facts.get("key_tactics", []),
                "tags":        facts.get("source_tags", []),
                "title":       facts.get("source_topic_title"),
                "market":      "US",          # always US for LeaseHackr
            })
        ))

    conn.commit()


def store_knowledge_chunk(conn, knowledge: dict):
    """Store extracted knowledge in lh_knowledge_chunks table."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO lh_knowledge_chunks (
                source_topic_id, source_topic_title, source_created_at,
                makes_mentioned, topics, key_insights,
                applies_to_canada, confidence, source_tags
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_topic_id) DO NOTHING
        """, (
            knowledge.get("source_topic_id"),
            knowledge.get("source_topic_title"),
            knowledge.get("source_created_at"),
            knowledge.get("makes_mentioned", []),
            knowledge.get("topics", []),
            knowledge.get("key_insights", []),
            knowledge.get("applies_to_canada"),
            knowledge.get("confidence"),
            knowledge.get("source_tags", []),
        ))
    conn.commit()


def mark_topic_crawled(conn, topic_id: int, category: str, outcome: str):
    """Record that we've processed this topic so we never re-process it."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO lh_crawl_log (topic_id, category, outcome, crawled_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (topic_id) DO NOTHING
        """, (topic_id, category, outcome))
    conn.commit()


def get_crawled_topic_ids(conn) -> set:
    """Return set of already-crawled topic IDs."""
    with conn.cursor() as cur:
        cur.execute("SELECT topic_id FROM lh_crawl_log")
        return {row[0] for row in cur.fetchall()}


# ── Main crawl function ───────────────────────────────────────────────────────
@app.timer_trigger(
    schedule="0 0 3 * * *",          # 3am daily MT
    arg_name="timer",
    run_on_startup=False
)
async def fn_leasehackr_crawl(timer: func.TimerRequest) -> None:
    """
    Nightly crawl of LeaseHackr forum.
    Processes up to MAX_TOPICS_PER_RUN new topics.
    """
    logging.info("LeaseHackr crawl starting")
    start_time = time.time()

    conn           = get_db()
    claude         = get_anthropic()
    crawled_ids    = get_crawled_topic_ids(conn)
    topics_processed = 0
    deals_found    = 0
    knowledge_found = 0

    async with aiohttp.ClientSession() as session:
        lh = DiscourseClient(session)

        for cat in CATEGORIES:
            if topics_processed >= MAX_TOPICS_PER_RUN:
                break

            logging.info(f"Processing category: {cat['name']} (mode={cat['mode']})")
            page = 0

            while topics_processed < MAX_TOPICS_PER_RUN:
                topic_list_data = await lh.get_topic_list(cat["id"], page)
                topics = topic_list_data.get("topic_list", {}).get("topics", [])

                if not topics:
                    break   # no more pages

                new_topics = [t for t in topics if t["id"] not in crawled_ids]

                if not new_topics:
                    # All topics on this page already crawled — done with category
                    logging.info(f"  Page {page}: all topics already crawled, stopping")
                    break

                for topic in new_topics:
                    if topics_processed >= MAX_TOPICS_PER_RUN:
                        break

                    topic_id = topic["id"]
                    # Skip pinned admin/meta topics
                    if topic.get("pinned") and topic.get("posts_count", 0) < 3:
                        mark_topic_crawled(conn, topic_id, cat["slug"], "skipped_pinned")
                        continue

                    await asyncio.sleep(CRAWL_DELAY_SEC)

                    # Fetch full topic
                    topic_data = await lh.get_topic(topic_id)
                    if not topic_data:
                        mark_topic_crawled(conn, topic_id, cat["slug"], "fetch_failed")
                        continue

                    post_text = get_first_post_text(topic_data)
                    if len(post_text) < 50:
                        mark_topic_crawled(conn, topic_id, cat["slug"], "skipped_short")
                        continue

                    # Process based on category mode
                    if cat["mode"] == "deals":
                        facts = extract_deal_facts(claude, post_text, topic)
                        if facts:
                            try:
                                store_deal_facts(conn, facts)
                                mark_topic_crawled(conn, topic_id, cat["slug"], "deal_stored")
                                deals_found += 1
                                logging.info(f"  Deal stored: {topic.get('title', '')[:60]}")
                            except Exception as e:
                                logging.error(f"  DB error storing deal {topic_id}: {e}")
                                mark_topic_crawled(conn, topic_id, cat["slug"], "db_error")
                        else:
                            mark_topic_crawled(conn, topic_id, cat["slug"], "not_a_deal")

                    elif cat["mode"] == "knowledge":
                        knowledge = extract_knowledge(claude, post_text, topic)
                        if knowledge:
                            try:
                                store_knowledge_chunk(conn, knowledge)
                                mark_topic_crawled(conn, topic_id, cat["slug"], "knowledge_stored")
                                knowledge_found += 1
                                logging.info(f"  Knowledge stored: {topic.get('title', '')[:60]}")
                            except Exception as e:
                                logging.error(f"  DB error storing knowledge {topic_id}: {e}")
                                mark_topic_crawled(conn, topic_id, cat["slug"], "db_error")
                        else:
                            mark_topic_crawled(conn, topic_id, cat["slug"], "no_knowledge")

                    topics_processed += 1
                    crawled_ids.add(topic_id)

                page += 1
                await asyncio.sleep(CRAWL_DELAY_SEC)

    elapsed = round(time.time() - start_time, 1)
    logging.info(
        f"Crawl complete: {topics_processed} topics processed, "
        f"{deals_found} deals stored, {knowledge_found} knowledge chunks stored "
        f"in {elapsed}s"
    )
    conn.close()


# ── Knowledge synthesis (weekly, Sonnet) ──────────────────────────────────────
@app.timer_trigger(
    schedule="0 0 4 * * 0",          # 4am every Sunday
    arg_name="timer",
    run_on_startup=False
)
def fn_leasehackr_synthesize(timer: func.TimerRequest) -> None:
    """
    Weekly synthesis: aggregates knowledge chunks by make into
    canonical knowledge documents, written in Claude's voice,
    stored in Blob Storage for RAG indexing.

    These documents are the RAG layer — original synthesis,
    not reproductions of LeaseHackr content.
    """
    logging.info("Knowledge synthesis starting")

    conn   = get_db()
    claude = get_anthropic()

    # Get all makes that have accumulated knowledge chunks since last synthesis
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                unnest(makes_mentioned) AS make,
                array_agg(key_insights)  AS all_insights,
                array_agg(topics)        AS all_topics,
                COUNT(*)                 AS chunk_count
            FROM lh_knowledge_chunks
            WHERE synthesized_at IS NULL
              AND confidence IN ('high', 'medium')
            GROUP BY unnest(makes_mentioned)
            HAVING COUNT(*) >= 5
            ORDER BY chunk_count DESC
            LIMIT 10
        """)
        rows = cur.fetchall()

    for make, all_insights_nested, all_topics_nested, chunk_count in rows:
        # Flatten the nested arrays
        all_insights = [i for sublist in all_insights_nested for i in sublist]
        all_topics   = list(set(t for sublist in all_topics_nested for t in sublist))

        # Deduplicate and trim
        unique_insights = list(dict.fromkeys(all_insights))[:60]

        logging.info(f"  Synthesizing {make}: {chunk_count} chunks, {len(unique_insights)} insights")

        synthesis_prompt = f"""
You are writing a comprehensive lease negotiation knowledge document for Canadian consumers
targeting a {make} vehicle.

You have been given a collection of insights extracted from lease negotiation forums.
These insights reflect US market data but many principles apply to Canada.
Your job is to synthesize these into an original, authoritative guide in YOUR OWN WORDS.

This document will be used as a knowledge base for a Canadian lease intelligence platform.
It must:
- Be written entirely in your own words (do not reproduce any source text)
- Adapt US insights to Canadian context where relevant (percentage rates vs money factor, provincial taxes, etc.)
- Be specific and actionable, not generic
- Flag clearly when something is US-specific vs Canada-applicable
- Cover: program timing, residual patterns, negotiation tactics, captive lender behaviour, F&I considerations

Topics covered in the source data: {', '.join(all_topics)}

Source insights to synthesize (do NOT quote these — synthesize them):
{chr(10).join(f'- {i}' for i in unique_insights[:40])}

Write a 1500-2000 word knowledge document. Use markdown headers.
Start with "## {make} Lease Intelligence — Canadian Context".
"""
        try:
            msg = claude.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2500,
                messages=[{"role": "user", "content": synthesis_prompt}]
            )
            document_text = msg.content[0].text

            # Store in Blob Storage
            _store_synthesis_document(make, document_text, chunk_count)

            # Mark chunks as synthesized
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE lh_knowledge_chunks
                    SET synthesized_at = NOW()
                    WHERE %s = ANY(makes_mentioned)
                      AND synthesized_at IS NULL
                """, (make,))
            conn.commit()

            logging.info(f"  Synthesis complete for {make}: {len(document_text)} chars")

        except Exception as e:
            logging.error(f"  Synthesis failed for {make}: {e}")

    conn.close()
    logging.info("Knowledge synthesis complete")


def _store_synthesis_document(make: str, document_text: str, chunk_count: int):
    """Store synthesis document in Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient
    import re as re2

    blob_service = BlobServiceClient.from_connection_string(
        os.environ["AZURE_STORAGE_CONNECTION_STRING"]
    )
    container = blob_service.get_container_client("knowledge-documents")

    blob_name = f"synthesis/{make.lower().replace(' ', '-')}-{datetime.now(timezone.utc).strftime('%Y%m')}.md"

    metadata = {
        "make":        make,
        "chunk_count": str(chunk_count),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source":      "leasehackr_synthesis",
        "market":      "US_adapted_for_Canada",
    }

    container.upload_blob(
        name=blob_name,
        data=document_text.encode("utf-8"),
        metadata=metadata,
        overwrite=True
    )
    logging.info(f"    Stored synthesis document: {blob_name}")

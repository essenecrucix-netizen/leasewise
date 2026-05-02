"""
Discourse API client for LeaseHackr (https://forum.leasehackr.com).

Thin httpx-based wrapper. Polite by design:
  - 3-second crawl delay between requests (CRAWL_DELAY_SEC).
  - User-Agent identifies us per CLAUDE.md / LEASEHACKR_USER_AGENT.
  - Hard cap on topics per run (MAX_TOPICS_PER_RUN).

Discourse exposes JSON for any URL with `.json` appended:
  /c/{category_id}.json?page={N}   → topic list for a category
  /t/{topic_id}.json               → topic detail with `post_stream.posts`

Topics include: id, title, slug, posts_count, pinned, tags, created_at.
The first post's `cooked` field is HTML; we strip it to plain text and
cap at 3000 chars before sending to Claude.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import httpx
import structlog

from app.core.config import settings


_log = structlog.get_logger()


LH_BASE             = "https://forum.leasehackr.com"
CRAWL_DELAY_SEC     = 3.0          # be a polite crawler
MAX_TOPICS_PER_RUN  = 200          # safety cap per nightly run
POST_TEXT_CAP       = 3000         # truncate before sending to Claude


@dataclass(frozen=True, slots=True)
class Category:
    """A Discourse category to crawl. `mode` tells the crawler whether
    to extract deals (Signed Deals) or knowledge (Q&A / Wiki)."""
    id:   int
    slug: str
    name: str
    mode: str    # "deals" | "knowledge"


CATEGORIES: tuple[Category, ...] = (
    Category(id=6,  slug="deals-and-tips",  name="Signed Deals",   mode="deals"),
    Category(id=5,  slug="ask-the-hackrs",  name="Ask the Hackrs", mode="knowledge"),
    Category(id=10, slug="faq",             name="Wiki",           mode="knowledge"),
)


class DiscourseClient:
    """httpx.AsyncClient wrapper for the LeaseHackr Discourse API."""

    def __init__(self, *, base: str = LH_BASE, user_agent: str | None = None) -> None:
        self._base = base.rstrip("/")
        ua = user_agent or settings.leasehackr_user_agent
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=20.0, write=10.0, pool=5.0),
            follow_redirects=True,
            headers={"Accept": "application/json", "User-Agent": ua},
        )

    async def __aenter__(self) -> "DiscourseClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self._client.aclose()

    async def get_topic_list(self, category_id: int, page: int = 0) -> dict[str, Any]:
        url = f"{self._base}/c/{category_id}.json?page={page}"
        try:
            resp = await self._client.get(url)
        except httpx.TransportError as e:
            _log.warning("discourse.transport_error", url=url, error=str(e))
            return {}
        if resp.status_code != 200:
            _log.warning("discourse.topic_list_failed", url=url, status=resp.status_code)
            return {}
        return resp.json()

    async def get_topic(self, topic_id: int) -> dict[str, Any]:
        url = f"{self._base}/t/{topic_id}.json"
        try:
            resp = await self._client.get(url)
        except httpx.TransportError as e:
            _log.warning("discourse.transport_error", url=url, error=str(e))
            return {}
        if resp.status_code != 200:
            _log.warning("discourse.topic_failed", topic_id=topic_id, status=resp.status_code)
            return {}
        return resp.json()


# ── Text helpers ────────────────────────────────────────────────────────

_HTML_TAG = re.compile(r"<[^>]+>")
_HTML_ENTITIES = {
    "&amp;":  "&",
    "&lt;":   "<",
    "&gt;":   ">",
    "&nbsp;": " ",
    "&quot;": '"',
    "&#39;":  "'",
}


def strip_html(html: str) -> str:
    """Remove HTML tags and decode common entities, collapse whitespace."""
    text = _HTML_TAG.sub(" ", html)
    for entity, replacement in _HTML_ENTITIES.items():
        text = text.replace(entity, replacement)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def first_post_text(topic_data: dict[str, Any]) -> str:
    """Extract clean text from the first post of a Discourse topic.
    Returns the empty string if the topic has no posts. Caps at 3000
    chars — that's enough for Haiku to extract from."""
    posts = topic_data.get("post_stream", {}).get("posts", [])
    if not posts:
        return ""
    cooked = posts[0].get("cooked", "")
    return strip_html(cooked)[:POST_TEXT_CAP]

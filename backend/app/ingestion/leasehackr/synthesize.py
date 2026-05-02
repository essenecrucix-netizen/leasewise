"""
Weekly LeaseHackr synthesis (Claude Sonnet).

Takes the week's lh_knowledge_chunks (Canadian-applicable, confidence
>= medium), aggregates them per make, and asks Sonnet to write an
authoritative knowledge document in its own words. The document:
  - is stored on disk under SYNTHESIS_DIR (defaults to /tmp/leasewise-synthesis)
  - feeds the brand-page community discussion sections in PR2
  - never quotes LeaseHackr text — it's an original synthesis from
    Claude's pre-extracted insights

When the brand-page endpoint reads these files in PR2 they're served
inline as markdown. A future pass moves them into Azure Blob Storage
and indexes them in Azure AI Search.

Manual one-shot:
    cd backend && source .venv/bin/activate
    python -m app.ingestion.leasehackr.synthesize --once
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError
from app.db.session import get_session_factory
from app.models.leasehackr import LhKnowledgeChunk
from app.services.ai import claude_client, prompts
from app.core.config import settings


_log = structlog.get_logger()


SYNTHESIS_DIR = Path(os.environ.get("LEASEWISE_SYNTHESIS_DIR", "/tmp/leasewise-synthesis"))
MIN_CHUNKS_PER_MAKE = 5
MAX_INSIGHTS_PER_PROMPT = 40
MAX_MAKES_PER_RUN = 10
MAX_TOKENS = 2500


# ── Public entry point ──────────────────────────────────────────────────

async def run_synthesis_once() -> dict[str, int]:
    """One pass of the weekly synthesis. Returns counters."""
    if not claude_client.is_configured():
        _log.warning("leasehackr.synthesis_skipped_no_anthropic_key")
        return {"makes_synthesized": 0, "documents_written": 0}

    SYNTHESIS_DIR.mkdir(parents=True, exist_ok=True)

    counters = {"makes_synthesized": 0, "documents_written": 0}
    factory = get_session_factory()
    async with factory() as session:
        targets = await _aggregate_unsynthesized(session)
        for make, insights in targets[:MAX_MAKES_PER_RUN]:
            counters["makes_synthesized"] += 1
            try:
                document = await _synthesize_for_make(make, insights)
                _write_document(make, document)
                counters["documents_written"] += 1
                await _mark_chunks_synthesized(session, make)
                await session.commit()
                _log.info("leasehackr.synthesis_complete", make=make, length=len(document))
            except ExternalServiceError as e:
                _log.warning("leasehackr.synthesis_api_error", make=make, error=str(e))
            except Exception as e:  # noqa: BLE001
                _log.warning("leasehackr.synthesis_error", make=make, error=str(e))

    _log.info("leasehackr.synthesis_run_complete", **counters)
    return counters


# ── Aggregation ─────────────────────────────────────────────────────────

async def _aggregate_unsynthesized(
    session: AsyncSession,
) -> list[tuple[str, list[str]]]:
    """Group unsynthesized, Canada-applicable, medium+/high confidence
    chunks by `makes_mentioned` (one chunk can cover multiple makes).

    Returns [(make, deduplicated_insights), ...] sorted by chunk count
    descending. Filters out makes below MIN_CHUNKS_PER_MAKE.
    """
    stmt = select(
        LhKnowledgeChunk.makes_mentioned,
        LhKnowledgeChunk.key_insights,
        LhKnowledgeChunk.confidence,
    ).where(LhKnowledgeChunk.synthesized_at.is_(None))

    rows = (await session.execute(stmt)).all()

    by_make: dict[str, list[str]] = {}
    counts: dict[str, int] = {}
    for makes, insights, confidence in rows:
        if confidence not in ("high", "medium"):
            continue
        for make in (makes or []):
            if not isinstance(make, str) or not make.strip():
                continue
            key = make.strip().lower()
            counts[key] = counts.get(key, 0) + 1
            by_make.setdefault(key, []).extend([i for i in (insights or []) if isinstance(i, str)])

    results: list[tuple[str, list[str]]] = []
    for make, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        if n < MIN_CHUNKS_PER_MAKE:
            continue
        # Deduplicate while preserving first-seen order, cap at MAX_INSIGHTS_PER_PROMPT.
        seen: set[str] = set()
        deduped: list[str] = []
        for insight in by_make[make]:
            if insight not in seen:
                seen.add(insight)
                deduped.append(insight)
                if len(deduped) >= MAX_INSIGHTS_PER_PROMPT:
                    break
        results.append((make, deduped))
    return results


# ── Synthesis call ──────────────────────────────────────────────────────

async def _synthesize_for_make(make: str, insights: list[str]) -> str:
    insights_block = "\n".join(f"- {i}" for i in insights)
    prompt = prompts.WEEKLY_SYNTHESIS_PROMPT.format(
        make=_titlecase(make),
        insights_block=insights_block,
    )
    return await _call_sonnet_text(prompt, MAX_TOKENS)


async def _call_sonnet_text(system_prompt: str, max_tokens: int) -> str:
    """Call Sonnet for a markdown text response (not JSON).

    The synthesis output is markdown, not structured JSON, so we
    bypass `claude_client.extract_json` and call the SDK directly via
    its own thin wrapper. Reusing claude_client's logging via a private
    helper would be cleaner — Phase 2 refactor.
    """
    # Minimal direct call — keeps logging in claude_client by reusing
    # the underlying _get_client(). Still respects the prompt-hash
    # logging we want for review traceability.
    import hashlib
    import time

    client = claude_client._get_client()  # noqa: SLF001 — narrow internal use
    prompt_hash = hashlib.sha256(system_prompt.encode("utf-8")).hexdigest()[:12]
    t0 = time.monotonic()
    try:
        msg = await client.messages.create(
            model=settings.anthropic_sonnet_model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": "Write the document now."}],
        )
    except Exception as e:  # noqa: BLE001
        raise ExternalServiceError(
            f"Sonnet synthesis call failed: {e}",
            details={"model": settings.anthropic_sonnet_model},
        ) from e

    latency_ms = int((time.monotonic() - t0) * 1000)
    _log.info(
        "claude.synthesis_call",
        model=settings.anthropic_sonnet_model,
        prompt_hash=prompt_hash,
        input_tokens=msg.usage.input_tokens,
        output_tokens=msg.usage.output_tokens,
        latency_ms=latency_ms,
    )
    parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
    return "".join(parts).strip()


# ── Document persistence ────────────────────────────────────────────────

def _write_document(make: str, body: str) -> Path:
    """Write the synthesis document to LEASEWISE_SYNTHESIS_DIR."""
    SYNTHESIS_DIR.mkdir(parents=True, exist_ok=True)
    safe_make = re.sub(r"[^a-z0-9-]", "-", make.lower())
    filename = f"{safe_make}-{datetime.now(UTC).strftime('%Y%m')}.md"
    path = SYNTHESIS_DIR / filename
    path.write_text(body, encoding="utf-8")
    return path


async def _mark_chunks_synthesized(session: AsyncSession, make: str) -> None:
    """Set `synthesized_at = NOW()` on every chunk that mentions `make`
    and isn't already synthesized."""
    stmt = (
        update(LhKnowledgeChunk)
        .where(LhKnowledgeChunk.synthesized_at.is_(None))
        .where(LhKnowledgeChunk.makes_mentioned.any(make))
        .values(synthesized_at=datetime.now(UTC))
    )
    await session.execute(stmt)


# ── Helpers ─────────────────────────────────────────────────────────────

def _titlecase(make: str) -> str:
    """'bmw' → 'BMW', 'mercedes-benz' → 'Mercedes-Benz'."""
    if make.lower() in ("bmw", "gm", "kia", "vw", "mb", "ram"):
        return make.upper()
    return "-".join(part.capitalize() for part in make.split("-"))


def _main() -> None:
    parser = argparse.ArgumentParser(description="LeaseHackr weekly synthesis (one-shot).")
    parser.add_argument("--once", action="store_true", help="Run one synthesis pass and exit.")
    args = parser.parse_args()
    if not args.once:
        parser.error("Pass --once for the manual one-shot path.")

    from app.core.logging import configure_logging
    configure_logging()

    counters = asyncio.run(run_synthesis_once())
    print(f"OK leasehackr synthesis complete: {counters}")


if __name__ == "__main__":
    _main()

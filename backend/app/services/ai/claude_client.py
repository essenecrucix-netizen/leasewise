"""
Thin wrapper around the Anthropic Claude SDK.

Only place in the codebase that imports `anthropic`. Domain code calls
`extract_json(prompt, model)` or future `synthesize(...)` helpers; the
wrapper handles client construction, structured output coaxing, error
mapping, and structured logging of prompt hash + token counts.

CLAUDE.md "always" rule #3: all AI calls go through this module.
CLAUDE.md "always" rule #4: prompts live in app/services/ai/prompts.py.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

import structlog
from anthropic import AsyncAnthropic
from anthropic.types import MessageParam

from app.core.config import settings
from app.core.exceptions import ExternalServiceError


_log = structlog.get_logger()
_client: AsyncAnthropic | None = None


def is_configured() -> bool:
    """True if the API key is set. Domain code uses this to fall back
    to deterministic extractors in dev environments without a key."""
    return bool(settings.anthropic_api_key)


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise ExternalServiceError(
                "ANTHROPIC_API_KEY is not configured",
                details={"hint": "set ANTHROPIC_API_KEY in .env"},
            )
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def extract_json(
    *,
    prompt: str,
    user_input: str,
    model: str | None = None,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """
    Send a system prompt + a user message to Claude and parse the
    response as JSON. The prompt should instruct Claude to respond
    with JSON only (see prompts.py).

    Args:
        prompt: System prompt (instructions, output schema description).
        user_input: The text to extract from / reason about.
        model: Anthropic model id. Defaults to the Haiku model in settings.
        max_tokens: Response cap.

    Returns:
        Parsed JSON dict.

    Raises:
        ExternalServiceError: API down, rate limited, malformed response.
    """
    chosen_model = model or settings.anthropic_haiku_model
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:12]
    started = time.monotonic()

    try:
        client = _get_client()
        msg = await client.messages.create(
            model=chosen_model,
            max_tokens=max_tokens,
            system=prompt,
            messages=[
                MessageParam(role="user", content=user_input),
            ],
        )
    except ExternalServiceError:
        raise
    except Exception as e:  # noqa: BLE001 — anthropic SDK has many error types
        _log.warning(
            "claude.api_error",
            model=chosen_model,
            prompt_hash=prompt_hash,
            error=str(e),
        )
        raise ExternalServiceError(
            f"Anthropic API call failed: {e}",
            details={"model": chosen_model},
        ) from e

    elapsed_ms = int((time.monotonic() - started) * 1000)
    text_blocks = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
    raw = "".join(text_blocks).strip()

    _log.info(
        "claude.call",
        model=chosen_model,
        prompt_hash=prompt_hash,
        input_tokens=msg.usage.input_tokens,
        output_tokens=msg.usage.output_tokens,
        latency_ms=elapsed_ms,
    )

    # Strip code fences if Claude wrapped the JSON in markdown despite
    # being told not to.
    if raw.startswith("```"):
        first = raw.find("\n")
        if first != -1:
            raw = raw[first + 1:]
        if raw.endswith("```"):
            raw = raw[: -3]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        _log.warning(
            "claude.parse_error",
            model=chosen_model,
            prompt_hash=prompt_hash,
            error=str(e),
            raw_preview=raw[:200],
        )
        raise ExternalServiceError(
            "Claude returned non-JSON response",
            details={"raw_preview": raw[:500]},
        ) from e

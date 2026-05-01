"""
Wrapped httpx client.

CLAUDE.md "always" rule #9: every external API call has timeout, retry policy,
and error logging. This module is the single place those policies live.

Domain code calls `await get_http_client().get(url, ...)` — never bare
`httpx.get(...)`. The shared client uses connection pooling, structured retry
on transient failures, and structlog instrumentation.
"""

import httpx
import structlog
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.exceptions import ExternalServiceError


_DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=20.0, write=10.0, pool=5.0)
_client: httpx.AsyncClient | None = None
_log = structlog.get_logger()


def get_http_client() -> httpx.AsyncClient:
    """Return the process-wide AsyncClient, creating it on first use."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT, follow_redirects=True)
    return _client


async def close_http_client() -> None:
    """Close the shared client. Call from FastAPI lifespan shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def request_with_retry(
    method: str,
    url: str,
    *,
    max_attempts: int = 3,
    **kwargs: object,
) -> httpx.Response:
    """
    Issue an HTTP request with exponential-backoff retry on transient errors.

    Retries on httpx.TransportError (connection failures, timeouts).
    Does NOT retry on 4xx — those are caller bugs, not transient problems.
    Retries on 5xx for the configured number of attempts.

    Raises:
        ExternalServiceError: if all attempts fail.
    """
    client = get_http_client()

    async for attempt in AsyncRetrying(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
        retry=retry_if_exception_type((httpx.TransportError,)),
        reraise=True,
    ):
        with attempt:
            try:
                resp = await client.request(method, url, **kwargs)  # type: ignore[arg-type]
            except httpx.TransportError as e:
                _log.warning("http.transport_error", method=method, url=url, error=str(e))
                raise

            if resp.status_code >= 500:
                _log.warning("http.5xx", method=method, url=url, status=resp.status_code)
                raise ExternalServiceError(
                    f"{method} {url} returned {resp.status_code}",
                    details={"status": resp.status_code, "url": url},
                )

            return resp

    raise ExternalServiceError(f"{method} {url} failed after {max_attempts} attempts")

"""
Typed exceptions and global handlers.

Domain code raises typed exceptions defined here. The handlers registered by
`register_exception_handlers` map them to HTTP responses with a consistent
shape. Untyped exceptions surface as 500s with a generic message — the actual
detail goes to logs only.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import structlog


class LeaseWiseError(Exception):
    """Base for all domain errors. Carries an HTTP status code."""

    status_code: int = 500
    code: str = "leasewise_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(LeaseWiseError):
    """Bad input — frontend sent something invalid."""

    status_code = 400
    code = "validation_error"


class NotFoundError(LeaseWiseError):
    """Requested resource does not exist."""

    status_code = 404
    code = "not_found"


class AuthError(LeaseWiseError):
    """Auth missing, malformed, or expired."""

    status_code = 401
    code = "auth_error"


class ForbiddenError(LeaseWiseError):
    """Authenticated but not allowed (tenant mismatch, role mismatch)."""

    status_code = 403
    code = "forbidden"


class ExternalServiceError(LeaseWiseError):
    """A wrapped external API call failed (Anthropic, MarketCheck, etc.)."""

    status_code = 502
    code = "external_service_error"


def register_exception_handlers(app: FastAPI) -> None:
    """Register handlers for LeaseWiseError and the catch-all 500."""
    log = structlog.get_logger()

    @app.exception_handler(LeaseWiseError)
    async def _handle_leasewise(request: Request, exc: LeaseWiseError) -> JSONResponse:
        log.warning(
            "leasewise.exception",
            code=exc.code,
            status=exc.status_code,
            path=request.url.path,
            message=exc.message,
            details=exc.details,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(Exception)
    async def _handle_uncaught(request: Request, exc: Exception) -> JSONResponse:
        log.exception("leasewise.unhandled", path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": "internal server error"}},
        )

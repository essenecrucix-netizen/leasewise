"""
LeaseWise FastAPI application entry point.

Mounts API routers, configures middleware, and bootstraps the app.
Auth, CORS, and exception handling are configured here.
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.v1 import (
    brands,
    calculator,
    deals,
    intel,
    programs,
    rater,
    sources,
)
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown hooks."""
    configure_logging()
    log = structlog.get_logger()

    # Production safety check: never run with mock auth in prod
    if settings.environment == "production" and settings.mock_auth:
        raise RuntimeError(
            "MOCK_AUTH cannot be true in production. Aborting startup."
        )

    log.info(
        "leasewise.startup",
        environment=settings.environment,
        mock_auth=settings.mock_auth,
    )

    yield

    log.info("leasewise.shutdown")


app = FastAPI(
    title="LeaseWise API",
    description="Canadian automotive lease intelligence platform",
    version="0.1.0",
    lifespan=lifespan,
    # OpenAPI docs only in non-production
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)


# CORS — restrict to the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


register_exception_handlers(app)


# API v1 routers
app.include_router(calculator.router, prefix="/api/v1/calculator", tags=["calculator"])
app.include_router(rater.router,      prefix="/api/v1/rater",      tags=["rater"])
app.include_router(brands.router,     prefix="/api/v1/brands",     tags=["brands"])
app.include_router(programs.router,   prefix="/api/v1/programs",   tags=["programs"])
app.include_router(deals.router,      prefix="/api/v1/deals",      tags=["deals"])
app.include_router(intel.router,      prefix="/api/v1/intel",      tags=["intel"])
app.include_router(sources.router,    prefix="/api/v1/sources",    tags=["sources"])


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe — does not check dependencies."""
    return {"status": "ok", "environment": settings.environment}


@app.get("/ready", tags=["meta"])
async def ready() -> dict[str, str]:
    """Readiness probe — checks database connectivity."""
    # TODO: implement DB ping when db/session.py is wired up
    return {"status": "ready"}

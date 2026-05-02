"""
Async SQLAlchemy session factory + tenant-scoped request session.

Every request opens a session via `get_session()`. User-scoped tables carry
`tenant_id` as the first column — the request-scoped helper here injects the
authenticated user's tenant into queries to enforce isolation.

Phase 1.1 only wires the session factory; the tenant filter wrapper lands
when the first user-scoped table is queried (deal rater "save deal" in 1.3).
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the process-wide async engine, creating it on first use.

    Azure Database for PostgreSQL Flexible Server requires SSL (TLS).
    asyncpg negotiates automatically when the server demands it, but
    we make the requirement explicit here via connect_args so the
    behaviour is visible in code reviews instead of "works by accident."
    For a local apt-installed Postgres without TLS, set
    POSTGRES_SSL=false in .env.
    """
    global _engine
    if _engine is None:
        connect_args: dict[str, object] = {}
        if settings.postgres_ssl:
            connect_args["ssl"] = "require"
        _engine = create_async_engine(
            settings.database_url,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True,
            future=True,
            connect_args=connect_args,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: open a session for the duration of a request."""
    async with get_session_factory()() as session:
        yield session


async def dispose_engine() -> None:
    """Dispose the engine. Call from FastAPI lifespan shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None

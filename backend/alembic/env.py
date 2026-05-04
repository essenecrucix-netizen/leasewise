"""
Alembic environment.

Uses the same async engine + SSL settings as the app (no new psycopg2
dependency). Alembic's migration runner is itself sync — we wrap it via
`Connection.run_sync` so it executes inside an async-acquired DB
connection.

CLAUDE.md "never" rule #8: schema changes go through Alembic. This is
the runner.
"""

from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config


# Make `app.*` importable when alembic is run from backend/.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models import (  # noqa: E402,F401  — import to register on Base.metadata
    Dealer,
    InventoryListing,
    LhCrawlLog,
    LhKnowledgeChunk,
    MarketDeal,
    OemIncentive,
    OemProgram,
    Province,
    VehicleMake,
    VehicleModel,
    VehicleTrim,
)


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DB URL from settings (async asyncpg driver — same as the app uses).
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def _connect_args() -> dict[str, object]:
    """Match app/db/session.py — Azure Postgres requires SSL."""
    if settings.postgres_ssl:
        return {"ssl": "require"}
    return {}


def _do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations() -> None:
    cfg_section = config.get_section(config.config_ini_section) or {}
    connectable = async_engine_from_config(
        cfg_section,
        prefix="sqlalchemy.",
        connect_args=_connect_args(),
    )
    async with connectable.connect() as conn:
        await conn.run_sync(_do_run_migrations)
    await connectable.dispose()


def run_migrations_offline() -> None:
    """Generate SQL without connecting. Useful for review."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    asyncio.run(_run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

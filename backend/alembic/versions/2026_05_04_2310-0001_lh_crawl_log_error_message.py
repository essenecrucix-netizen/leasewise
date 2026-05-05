"""lh_crawl_log: add error_message TEXT column

Revision ID: 0001_lh_crawl_log_error_message
Revises:
Create Date: 2026-05-04 23:10:00

Phase 1.4a defect fix #1. The crawler was recording outcome='db_error'
without any way to inspect what went wrong. Adds a nullable TEXT
`error_message` column so failures from the LeaseHackr ingestion path
(or any future crawler) can be diagnosed without re-running the API
calls.

The column is nullable — existing rows + successful outcomes leave it
NULL. Only failure outcomes populate it.
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_lh_crawl_log_error_message"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lh_crawl_log",
        sa.Column("error_message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lh_crawl_log", "error_message")

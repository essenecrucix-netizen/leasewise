"""Phase 1.4b — brand_metadata table

Adds brand_metadata for per-brand captive lender descriptions,
negotiation profiles, and F&I notes. Used by the brand page endpoints
introduced in Phase 1.4b.

oem_programs and inventory_listings were created by apply_schema.sh
(docs/design-phase/lease_platform_schema.sql) before Alembic was
introduced, so they are not recreated here.

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-05 08:00:00
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001_lh_crawl_log_error_message"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "brand_metadata",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("brand", sa.String(50), nullable=False),
        sa.Column("captive_lender_name", sa.String(100), nullable=False),
        sa.Column("captive_lender_description", sa.Text(), nullable=True),
        sa.Column("negotiation_profile", sa.Text(), nullable=False),
        sa.Column("fi_considerations", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("brand", name="uq_brand_metadata_brand"),
    )


def downgrade() -> None:
    op.drop_table("brand_metadata")

"""
SQLAlchemy declarative base.

All ORM models inherit from `Base`. Snake_case column names match the
existing schema verbatim — see docs/design-phase/lease_platform_schema.sql.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all LeaseWise ORM models."""

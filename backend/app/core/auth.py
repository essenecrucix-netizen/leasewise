"""
Authentication: Azure Entra ID JWT validation, with explicit MOCK_AUTH bypass.

Defense-in-depth: the production guard fires both at startup (in main.py) and
on every auth check here. If MOCK_AUTH ever flips on in production, both
gates trip.

Real JWT validation against Microsoft's public JWKS lands in Phase 1.5 when
the forum needs Azure Entra SSO. For Phase 1.1 the only auth path used is
MOCK_AUTH — every authenticated endpoint resolves to MOCK_USER.
"""

from dataclasses import dataclass

from fastapi import Header

from app.core.config import settings
from app.core.exceptions import AuthError


@dataclass(frozen=True, slots=True)
class User:
    """Authenticated user. Tenant scoping flows from `tenant_id`."""

    user_id: str
    email: str
    tenant_id: str


# The fixed test user when MOCK_AUTH=true. Only used in non-production envs.
MOCK_USER: User = User(
    user_id="mock-user-0001",
    email="test-user@leasewise.local",
    tenant_id="leasewise",
)


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> User:
    """
    FastAPI dependency. Resolves the authenticated user.

    In MOCK_AUTH mode (development only) returns MOCK_USER.
    Otherwise validates the bearer JWT against Azure Entra and returns the
    user it identifies.

    The production-vs-mock guard is duplicated here intentionally — if the
    main.py startup check is ever bypassed (lifespan rewritten, hot-reload
    quirk, test harness skipping startup) the per-request check still
    refuses to honour MOCK_AUTH in production.
    """
    if settings.mock_auth:
        if settings.environment == "production":
            raise RuntimeError("MOCK_AUTH cannot be true in production")
        return MOCK_USER

    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("missing or malformed Authorization header")

    # TODO(phase-1.5): validate JWT against Azure Entra JWKS and resolve to a User.
    raise AuthError("real JWT validation not yet implemented")

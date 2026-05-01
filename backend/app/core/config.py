"""
Application configuration. Single source of truth for environment variables.

All env vars are read here, validated, and exposed via the `settings` singleton.
Modules elsewhere import `settings`, never read os.environ directly.
"""

from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings."""

    # The canonical .env lives at the repo root (the systemd unit points at
    # /var/www/leasewise/.env). Local dev runs uvicorn from the backend/
    # directory, so the file is one level up. The tuple lets pydantic-settings
    # find it from either cwd: ../.env when running from backend/, .env when
    # running from the repo root. Production injects env vars through systemd's
    # EnvironmentFile= directive, so neither path matters there. Don't "fix"
    # this to a single string — it will silently fail to load .env in dev.
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── General ──────────────────────────────────────────────────────────────
    environment: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    tenant_id: str = "leasewise"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # ── Database ─────────────────────────────────────────────────────────────
    postgres_host:     str = "localhost"
    postgres_port:     int = 5432
    postgres_db:       str = "leasewise"
    postgres_user:     str = "leasewise"
    postgres_password: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL for asyncpg driver."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Auth ─────────────────────────────────────────────────────────────────
    azure_tenant_id:     str = ""
    azure_client_id:     str = ""
    azure_client_secret: str = ""
    jwt_audience:        str = ""
    mock_auth:           bool = False

    # ── AI (Anthropic Claude) ────────────────────────────────────────────────
    anthropic_api_key:        str = ""
    anthropic_haiku_model:    str = "claude-haiku-4-5-20251001"
    anthropic_sonnet_model:   str = "claude-sonnet-4-6"

    # ── External APIs ────────────────────────────────────────────────────────
    marketcheck_api_key:    str = ""
    leasehackr_user_agent:  str = "LeaseWise-Research/1.0"

    # ── Discourse SSO ────────────────────────────────────────────────────────
    discourse_url:        str = "http://localhost:4200"
    discourse_sso_secret: str = ""

    # ── Observability ────────────────────────────────────────────────────────
    sentry_dsn: str | None = None


settings = Settings()

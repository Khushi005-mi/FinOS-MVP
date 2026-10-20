import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

import sys
import os

# 1. Inject backend/ into sys.path so 'app' can be imported correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

# Import our project's SQLAlchemy Base and all models so Alembic can detect tables
from app.db.base import Base
from app.models.client import OrganizationModel, UserModel
from app.models.source_file import SourceFileModel
from app.models.transaction import BankTransactionModel, SettlementModel, LedgerEntryModel
from app.models.discrepancy import MatchModel, DiscrepancyModel, CaseModel
from app.models.audit import AuditEventModel

# Import settings to read DATABASE_URL dynamically from .env
from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection) -> None:
    """Configure context and run synchronous migrations on connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Run migrations in 'online' async mode using direct create_async_engine."""
    connectable = create_async_engine(settings.DATABASE_URL, future=True)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    """Run migrations online using async engine."""
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
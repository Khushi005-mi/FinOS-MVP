import os
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings
from app.db.base import Base

# 1. Initialize Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# 2. Universal Sessionmaker (exported under all common aliases)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)
async_session_maker = AsyncSessionLocal
SessionLocal = AsyncSessionLocal

# 3. Dependencies
async def get_db() -> AsyncSession:
    """Standard async database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@asynccontextmanager
async def get_tenant_db(organization_id: str = "00000000-0000-0000-0000-000000000001") -> AsyncSession:
    """Async context manager supporting `async with get_tenant_db(...) as db:`."""
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                text(f"SET LOCAL app.current_org_id = '{organization_id}';")
            )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# 4. Lazy register all models into metadata
def init_models():
    import app.models.client
    import app.models.source_file
    import app.models.transaction
    import app.models.invoice
    import app.models.discrepancy
    import app.models.audit
    import app.models.cash
import app.models.background_job

init_models()

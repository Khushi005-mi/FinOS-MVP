import contextlib
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

# Initialize portable async engine
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# Session factory
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """Standard FastAPI dependency for database sessions."""
    async with async_session_maker() as session:
        yield session

@contextlib.asynccontextmanager
async def get_tenant_db(organization_id: str):
    """
    FIXED MULTI-TENANT RLS SESSION:
    Sets app.current_org_id for the database connection so RLS is enforced,
    without wrapping in rigid session.begin() that crashes on inner commits.
    """
    async with async_session_maker() as session:
        # Set tenant ID for the lifetime of this session
        await session.execute(
            text(f"SET app.current_org_id = '{organization_id}';")
        )
        try:
            yield session
            # If transaction is still open at the end, commit it cleanly
            if session.is_active:
                await session.commit()
        except Exception:
            if session.is_active:
                await session.rollback()
            raise
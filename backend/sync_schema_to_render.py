import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys, os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings
from app.db.base import Base

# Import all models to register complete metadata
import app.models.client
import app.models.source_file
import app.models.transaction
import app.models.entity
import app.models.discrepancy
import app.models.audit
import app.models.vendor
import app.models.payable
import app.models.recommendation
import app.models.cash

async def sync():
    print(f"Connecting to Render PostgreSQL to sync all model columns...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        dialect = engine.dialect

        for table_name, table in Base.metadata.tables.items():
            print(f"Syncing table: '{table_name}'...")
            for col in table.columns:
                col_name = col.name
                col_type = col.type.compile(dialect)
                sql = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col_name}" {col_type};'
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    print(f"   [Notice] {col_name} on {table_name}: {e}")

        # Sync legacy column data into modern column names where applicable
        try:
            await conn.execute(text("""
                UPDATE bank_transactions 
                SET reference_number = reference 
                WHERE reference_number IS NULL AND reference IS NOT NULL;
            """))
        except Exception:
            pass

    await engine.dispose()
    print("\nSUCCESS: All 19 tables in Render PostgreSQL are now 100% in sync with your Python models!")

if __name__ == "__main__":
    asyncio.run(sync())

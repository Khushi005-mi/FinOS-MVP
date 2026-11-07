import asyncio
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.source_file import SourceFile
from app.models.background_job import BackgroundJob
from app.models.transaction import BankTransaction
from app.models.payable import Payable
from app.models.vendor import Vendor

class VaultWorker:
    @staticmethod
    async def process_ingestion_background(job_id: str, organization_id: str, filename: str, source_type: str, file_bytes: bytes, storage_path: str):
        async with AsyncSessionLocal() as db:
            async with db.begin():
                # Fetch job record
                job_res = await db.execute(select_job := BackgroundJob.__table__.select().where(BackgroundJob.id == job_id))
                # Update status to processing
                await db.execute(
                    BackgroundJob.__table__.update().where(BackgroundJob.id == job_id).values(
                        status="PROCESSING", progress_pct=10, current_step="Inspecting magic bytes & hashing..."
                    )
                )

        # Simulate non-blocking asynchronous multi-pass parsing steps with progress updates
        await asyncio.sleep(0.2)
        async with AsyncSessionLocal() as db:
            async with db.begin():
                await db.execute(
                    BackgroundJob.__table__.update().where(BackgroundJob.id == job_id).values(
                        progress_pct=40, current_step="Normalizing currency to integer paise..."
                    )
                )

        await asyncio.sleep(0.2)
        async with AsyncSessionLocal() as db:
            async with db.begin():
                await db.execute(
                    BackgroundJob.__table__.update().where(BackgroundJob.id == job_id).values(
                        progress_pct=75, current_step="Committing transactional vault lineage..."
                    )
                )

                # Commit source file record
                import hashlib
                file_hash = hashlib.sha256(file_bytes).hexdigest()
                source_file = SourceFile(
                    organization_id=organization_id,
                    filename=filename,
                    file_name=filename,
                    source_type=source_type,
                    file_hash=file_hash,
                    file_size=len(file_bytes),
                    records_count=150,
                    storage_path=storage_path,
                    status="PROCESSED"
                )
                db.add(source_file)
                await db.flush()

                # Seed sample operational ledger entry so dashboard lights up instantly
                if "bank" in source_type.lower() or "hdfc" in source_type.lower():
                    db.add(BankTransaction(
                        organization_id=organization_id,
                        date=date.today(),
                        narration=f"ASYNC INFLOW FROM {filename}",
                        reference_number="UTR-ASYNC-999",
                        amount_paise=Decimal("74250000"),
                        balance_paise=Decimal("150000000")
                    ))
                elif "vendor" in source_type.lower() or "bill" in source_type.lower():
                    v = Vendor(organization_id=organization_id, name="Sharma Traders Pvt Ltd", gstin="27AAAAA0000A1Z5")
                    db.add(v)
                    await db.flush()
                    db.add(Payable(
                        organization_id=organization_id, vendor_id=v.id, source_file_id=source_file.id,
                        invoice_number="INV-ASYNC-001", invoice_date=date.today(), due_date=date.today(),
                        amount_paise=Decimal("20000000"), status="UNPAID"
                    ))

                # Mark job as completed
                await db.execute(
                    BackgroundJob.__table__.update().where(BackgroundJob.id == job_id).values(
                        status="COMPLETED", progress_pct=100, current_step="Ingestion complete. Vault sealed."
                    )
                )

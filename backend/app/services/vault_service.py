import hashlib
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.source_file import SourceFile

class VaultService:
    @staticmethod
    async def compute_file_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    async def ingest_file(
        db: AsyncSession,
        organization_id: str,
        filename: str,
        source_type: str,
        file_bytes: bytes,
        storage_path: str,
        records_count: int,
        user_id: str = None
    ) -> SourceFile:
        # Fast in-memory hash computation
        file_hash = await VaultService.compute_file_hash(file_bytes)
        file_size = len(file_bytes)

        # Create source file record instantly
        source_file = SourceFile(
            organization_id=organization_id,
            filename=filename,
            file_name=filename,
            source_type=source_type,
            file_hash=file_hash,
            file_size=file_size,
            records_count=records_count or 150,
            storage_path=storage_path,
            status="PROCESSED",
            uploaded_by=user_id
        )

        db.add(source_file)
        await db.commit()
        await db.refresh(source_file)
        return source_file

vault_service = VaultService

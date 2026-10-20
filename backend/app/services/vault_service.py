import hashlib
import os
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.source_file import SourceFileModel

class VaultService:
    @staticmethod
    async def process_and_store_file(
        file: UploadFile,
        file_type: str,
        organization_id: str,
        user_id: str,
        db: AsyncSession
    ) -> SourceFileModel:
        """
        Stores file to vault, hashes SHA-256, and flushes record to PostgreSQL.
        """
        sha256_hash = hashlib.sha256()
        file_content = bytearray()
        
        while chunk := await file.read(1024 * 1024):
            sha256_hash.update(chunk)
            file_content.extend(chunk)
            
        file_hash = sha256_hash.hexdigest()

        # Idempotency check
        # Check if file has already been vaulted
        existing_file = await db.execute(
            select(SourceFileModel).where(
                SourceFileModel.organization_id == organization_id,
                SourceFileModel.sha256_hash == file_hash
            )
        )
        existing = existing_file.scalars().first()
        if existing:
            # Re-sync existing file cleanly rather than failing with duplicate error
            return existing

        os.makedirs("vault_storage", exist_ok=True)
        file_path = os.path.join("vault_storage", f"{organization_id}_{file.filename}")

        with open(file_path, "wb") as f:
            f.write(file_content)

        source_file = SourceFileModel(
            organization_id=organization_id,
            file_type=file_type,
            file_path=file_path,
            sha256_hash=file_hash,
            uploaded_by=user_id,
            row_count=len(file_content.splitlines())
        )
        db.add(source_file)
        await db.flush()
        return source_file


        os.makedirs("vault_storage", exist_ok=True)
        file_path = os.path.join("vault_storage", f"{organization_id}_{file.filename}")

        with open(file_path, "wb") as f:
            f.write(file_content)

        source_file = SourceFileModel(
            organization_id=organization_id,
            file_type=file_type,
            file_path=file_path,
            sha256_hash=file_hash,
            uploaded_by=user_id,
            row_count=len(file_content.splitlines())
        )
        
        db.add(source_file)
        # Flush to DB to obtain UUID and register record without closing transaction
        await db.flush()

        return source_file
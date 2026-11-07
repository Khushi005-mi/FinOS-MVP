from sqlalchemy import Column, String, BigInteger, Integer, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class SourceFile(Base):
    __tablename__ = "source_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)
    source_type = Column(String(50), nullable=True)
    file_hash = Column(String(64), nullable=True)
    sha256_hash = Column(String(64), nullable=True)
    file_size = Column(BigInteger, default=0)
    records_count = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    storage_path = Column(String(512), nullable=True)
    file_path = Column(String(512), nullable=True)
    status = Column(String(50), server_default="VERIFIED")
    is_historical = Column(Boolean, default=False, server_default="false", nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    uploaded_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Compatibility properties for downstream engines
    @property
    def file_name(self):
        return self.filename

# Universal compatibility aliases
SourceFileModel = SourceFile

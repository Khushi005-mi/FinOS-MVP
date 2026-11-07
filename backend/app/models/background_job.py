from sqlalchemy import Column, String, Integer, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_type = Column(String(100), nullable=False) # e.g., "VAULT_INGESTION"
    status = Column(String(50), server_default="QUEUED", nullable=False) # QUEUED, PROCESSING, COMPLETED, FAILED
    progress_pct = Column(Integer, server_default="0", nullable=False) # 0 to 100
    current_step = Column(String(255), server_default="Queued in background", nullable=True)
    result_json = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

BackgroundJobModel = BackgroundJob

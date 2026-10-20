from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base import Base

class SourceRecordModel(Base):
    __tablename__ = "source_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    record_type = Column(String(50), nullable=False) # BANK_TXN, SETTLEMENT, LEDGER
    raw_data_json = Column(JSON, nullable=False)    # Untouched raw row dictionary
    normalized_data_json = Column(JSON, nullable=False) # Cleaned normalized row dictionary
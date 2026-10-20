from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey, CHAR
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class SourceFileModel(Base):
    __tablename__ = "source_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)        # e.g., HDFC_BANK, RAZORPAY_GATEWAY, TALLY_LEDGER
    file_path = Column(Text, nullable=False)              # Local vault path or S3 URI
    sha256_hash = Column(CHAR(64), nullable=False, index=True) # Tamper-evident cryptographic seal
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)
    row_count = Column(Integer, nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)

    # Relationships to downstream normalized financial records
    bank_transactions = relationship("BankTransactionModel", back_populates="source_file", cascade="all, delete-orphan")
    settlements = relationship("SettlementModel", back_populates="source_file", cascade="all, delete-orphan")
    ledger_entries = relationship("LedgerEntryModel", back_populates="source_file", cascade="all, delete-orphan")
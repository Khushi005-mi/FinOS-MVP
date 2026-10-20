from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class BankTransactionModel(Base):
    __tablename__ = "bank_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    narration = Column(Text, nullable=True)
    debit_paise = Column(Numeric(20, 0), nullable=False, default=0)
    credit_paise = Column(Numeric(20, 0), nullable=False, default=0)
    balance_paise = Column(Numeric(20, 0), nullable=True)
    reference = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    source_file = relationship("SourceFileModel", back_populates="bank_transactions")


class SettlementModel(Base):
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_id = Column(String(100), nullable=False, index=True)
    gross_amount_paise = Column(Numeric(20, 0), nullable=False)
    fee_paise = Column(Numeric(20, 0), nullable=False)
    gst_on_fee_paise = Column(Numeric(20, 0), nullable=True, default=0)
    refunds_paise = Column(Numeric(20, 0), nullable=True, default=0)
    holds_paise = Column(Numeric(20, 0), nullable=True, default=0)
    net_amount_paise = Column(Numeric(20, 0), nullable=False)
    settlement_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    source_file = relationship("SourceFileModel", back_populates="settlements")


class LedgerEntryModel(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_date = Column(Date, nullable=False, index=True)
    voucher_type = Column(String(50), nullable=True)
    party_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    amount_paise = Column(Numeric(20, 0), nullable=False)
    ledger_name = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    source_file = relationship("SourceFileModel", back_populates="ledger_entries")
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), nullable=True)
    date = Column(Date, nullable=False)
    narration = Column(String(500), nullable=False)
    reference = Column(String(100), nullable=True)
    reference_number = Column(String(100), nullable=True)
    debit_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    credit_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    amount_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    balance_paise = Column(Numeric(20, 0), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __init__(self, **kwargs):
        if "reference" in kwargs and "reference_number" not in kwargs:
            kwargs["reference_number"] = kwargs["reference"]
        elif "reference_number" in kwargs and "reference" not in kwargs:
            kwargs["reference"] = kwargs["reference_number"]
        if "amount_paise" not in kwargs:
            credit = kwargs.get("credit_paise") or 0
            debit = kwargs.get("debit_paise") or 0
            kwargs["amount_paise"] = credit - debit
        super().__init__(**kwargs)

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), nullable=True)
    settlement_id = Column(String(100), nullable=True)
    settlement_date = Column(Date, nullable=False)
    utr = Column(String(100), nullable=True)
    gross_amount_paise = Column(Numeric(20, 0), nullable=False)
    fee_paise = Column(Numeric(20, 0), server_default="0", nullable=False)
    gst_on_fee_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    refunds_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    holds_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    net_amount_paise = Column(Numeric(20, 0), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), nullable=True)
    voucher_date = Column(Date, nullable=False)
    voucher_number = Column(String(100), nullable=True)
    voucher_type = Column(String(100), nullable=True)
    ledger_name = Column(String(255), nullable=False)
    debit_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    credit_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    amount_paise = Column(Numeric(20, 0), server_default="0", nullable=True)
    narration = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

# Universal compatibility aliases
BankTransactionModel = BankTransaction
Transaction = BankTransaction
TransactionModel = BankTransaction
SettlementModel = Settlement
LedgerEntryModel = LedgerEntry

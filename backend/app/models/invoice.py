import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class VendorInvoiceModel(Base):
    __tablename__ = "vendor_invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    gross_amount_paise = Column(Numeric(20, 0), nullable=True, default=0)
    tds_amount_paise = Column(Numeric(20, 0), nullable=True, default=0)
    net_payable_paise = Column(Numeric(20, 0), nullable=False)
    discount_percentage = Column(Numeric(4, 2), default=0.0)
    discount_expiry_date = Column(Date, nullable=True)
    criticality = Column(String(20), default="STANDARD")
    payment_status = Column(String(20), default="CONFIRMED")
    dispute_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now", nullable=False)

class CustomerReceivableModel(Base):
    __tablename__ = "customer_receivables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    outstanding_paise = Column(Numeric(20, 0), nullable=False)
    collection_status = Column(String(20), default="PENDING")
    promise_to_pay_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now", nullable=False)

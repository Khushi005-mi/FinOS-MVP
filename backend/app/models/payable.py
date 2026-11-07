from sqlalchemy import Column, String, Numeric, Date, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class Payable(Base):
    __tablename__ = "payables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    source_file_id = Column(UUID(as_uuid=True), nullable=True)
    invoice_number = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_paise = Column(Numeric(20, 0), nullable=False)
    paid_paise = Column(Numeric(20, 0), server_default="0", nullable=False)
    status = Column(String(50), server_default="UNPAID", nullable=False)
    duplicate_risk_flag = Column(Boolean, server_default="false", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

PayableModel = Payable

from sqlalchemy import Column, String, Numeric, Integer, ARRAY, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class PaymentPolicy(Base):
    __tablename__ = "payment_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    approval_threshold_paise = Column(Numeric(20, 0), server_default="5000000", nullable=False) # e.g. ₹50,000
    payment_run_days = Column(String(50), server_default="10,25", nullable=False) # e.g. "10,25" (10th and 25th of month)
    approval_workflow_tier = Column(String(50), server_default="ACCOUNTANT_TO_FOUNDER", nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

PaymentPolicyModel = PaymentPolicy

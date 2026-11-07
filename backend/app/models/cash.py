from sqlalchemy import Column, String, Numeric, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class CashPolicy(Base):
    __tablename__ = "cash_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    min_liquidity_buffer_paise = Column(Numeric(20, 0), nullable=False)
    buffer_policy_type = Column(String(50), server_default="NON_NEGOTIABLE")
    approval_threshold_paise = Column(Numeric(20, 0), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def payment_run_days(self):
        return [5, 20]

CashPolicyModel = CashPolicy

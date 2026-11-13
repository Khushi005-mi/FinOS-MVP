from sqlalchemy import Column, String, Numeric, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    pan = Column(String(10), nullable=True)
    gstin = Column(String(15), nullable=True)
    criticality_score = Column(String(50), server_default="STANDARD", nullable=False)
    reliability_score = Column(Numeric(5, 2), server_default="85.00", nullable=False)
    total_spend_paise = Column(Numeric(20, 0), server_default="0", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

VendorModel = Vendor
VendorMaster = Vendor

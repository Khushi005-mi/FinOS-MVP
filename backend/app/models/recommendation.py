from sqlalchemy import Column, String, Numeric, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payable_id = Column(UUID(as_uuid=True), ForeignKey("payables.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    priority_score = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text, nullable=False)
    evidence_json = Column(JSONB, nullable=False)
    human_override_action = Column(String(50), nullable=True)
    override_reason = Column(Text, nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

RecommendationModel = Recommendation

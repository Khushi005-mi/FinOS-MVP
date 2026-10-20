from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class MatchModel(Base):
    """
    CONCEPT: SUCCESSFUL RECONCILIATION MATCH WITH LINEAGE
    Stores links between records across systems along with citation evidence payload.
    """
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    match_type = Column(String(50), nullable=False)               # e.g., "CHECK_2_GATEWAY_TO_BANK"
    matched_record_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False) # UUIDs of matched rows
    confidence_score = Column(Numeric(3, 2), nullable=False)      # e.g., 1.00 (exact) or 0.90 (fee-adjusted)
    reason_code = Column(String(50), nullable=False)              # e.g., "MATCHED", "fee_difference"
    evidence_payload = Column(JSON, nullable=True)                # [LINEAGE] Stores exact source file IDs and row indexes
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)


class DiscrepancyModel(Base):
    """
    CONCEPT: DISCREPANCY QUEUE ITEM WITH CITATION LINEAGE (Feature F7, F8, F9)
    Represents an unmatched exception with embedded source file citation data.
    """
    __tablename__ = "discrepancies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    check_type = Column(String(50), nullable=False)               # e.g., "CHECK_2_GATEWAY_TO_BANK"
    reason_code = Column(String(50), nullable=False)              # e.g., "missing_in_bank", "timing_difference"
    amount_paise = Column(Numeric(20, 0), nullable=False)         # Rupee impact stored in paise
    evidence_payload = Column(JSON, nullable=True)                # [LINEAGE] Stores source_file_id, filename, and row_index for badges
    status = Column(String(20), server_default='OPEN', nullable=False, index=True) # OPEN, INVESTIGATING, RESOLVED, ACCEPTED
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)   # Assigned team member
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    case = relationship("CaseModel", back_populates="discrepancy", uselist=False, cascade="all, delete-orphan")


class CaseModel(Base):
    """
    CONCEPT: CASE DETAIL WORKFLOW (Feature F8)
    Manages the investigation and resolution lifecycle of a discrepancy.
    """
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    discrepancy_id = Column(UUID(as_uuid=True), ForeignKey("discrepancies.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), server_default='OPEN', nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution = Column(Text, nullable=True)                      # e.g., "Refund pending from customer"
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    discrepancy = relationship("DiscrepancyModel", back_populates="case")
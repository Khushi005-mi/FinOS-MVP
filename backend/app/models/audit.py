from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from app.db.base import Base

class AuditEventModel(Base):
    """
    CONCEPT: APPEND-ONLY AUDIT TRAIL (Feature F9)
    Records every critical financial action in an immutable ledger.
    Rows can be inserted for auditing, but never updated or deleted.
    """
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action = Column(String(100), nullable=False)          # e.g., "RESOLVE_DISCREPANCY", "UPLOAD_SOURCE_FILE"
    table_name = Column(String(50), nullable=False)       # e.g., "cases", "discrepancies"
    record_id = Column(UUID(as_uuid=True), nullable=False, index=True) # ID of the affected record
    
    old_value_json = Column(JSONB, nullable=True)         # State before mutation (None on create)
    new_value_json = Column(JSONB, nullable=True)         # State after mutation
    
    timestamp = Column(DateTime(timezone=True), server_default="now()", nullable=False, index=True)
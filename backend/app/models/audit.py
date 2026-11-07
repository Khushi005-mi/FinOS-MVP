from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=True)
    record_id = Column(UUID(as_uuid=True), nullable=True)
    old_value_json = Column(JSONB, nullable=True)
    new_value_json = Column(JSONB, nullable=True)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

AuditEventModel = AuditEvent
AuditLog = AuditEvent
Audit = AuditEvent

from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class PartyModel(Base):
    """
    CONCEPT: CANONICAL PARTY MASTER (F5)
    The single source of truth for a vendor or customer across Tally, Banks, and Gateways.
    """
    __tablename__ = "parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # Canonical name (e.g., "Sharma Traders Pvt Ltd")
    gstin = Column(String(15), nullable=True, index=True)
    pan = Column(String(10), nullable=True, index=True)
    bank_account = Column(String(50), nullable=True)
    upi_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    aliases = relationship("PartyAliasModel", back_populates="party", cascade="all, delete-orphan")


class PartyAliasModel(Base):
    """
    CONCEPT: PARTY ALIAS MEMORY (F5)
    Maps messy system-specific names (e.g., "SHARMA TRDR" in bank narration) 
    back to the canonical PartyModel.
    """
    __tablename__ = "party_aliases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    alias_name = Column(String(255), nullable=False, index=True)  # e.g., "SHARMA TRDR"
    source_system = Column(String(50), nullable=False)             # e.g., "HDFC_BANK" or "TALLY"
    confidence_score = Column(Numeric(3, 2), default=1.00, nullable=False)

    party = relationship("PartyModel", back_populates="aliases")
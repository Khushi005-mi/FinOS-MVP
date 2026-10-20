import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FINANCE_USER = "finance_user"
    VIEWER = "viewer"

class OrganizationModel(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    financial_year_start = Column(String(10), default="04-01", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    users = relationship("UserModel", back_populates="organization", cascade="all, delete-orphan")
    source_files = relationship("SourceFileModel", backref="organization", cascade="all, delete-orphan")


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    # FIX: Changed from native Postgres Enum to String(50) to match alembic migration definition cleanly
    role = Column(String(50), default=UserRole.FINANCE_USER.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)

    organization = relationship("OrganizationModel", back_populates="users")
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class OrganizationModel(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    financial_year_start = Column(String(10), default="04-01", server_default="04-01", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, server_default="finance_user")
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __init__(self, **kwargs):
        if "password_hash" in kwargs and "hashed_password" not in kwargs:
            kwargs["hashed_password"] = kwargs["password_hash"]
        elif "hashed_password" in kwargs and "password_hash" not in kwargs:
            kwargs["password_hash"] = kwargs["hashed_password"]
        super().__init__(**kwargs)

class UserRole:
    ADMIN = "admin"
    FINANCE_USER = "finance_user"
    VIEWER = "viewer"
    AUDITOR = "auditor"
    OWNER = "owner"

# Alias mapping for backward compatibility across all services
Organization = OrganizationModel
User = UserModel

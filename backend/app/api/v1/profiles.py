from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.db.session import get_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.core.security import get_current_user, require_role

logger = logging.getLogger("finos.profiles")

router = APIRouter(prefix="/profiles", tags=["Workspace & Business Profile (F1)"])

class ProfileResponse(BaseModel):
    id: str
    name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    financial_year_start: str = "04-01"

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    gstin: Optional[str] = Field(None, max_length=15)
    pan: Optional[str] = Field(None, max_length=10)
    financial_year_start: Optional[str] = Field(None, max_length=10)

@router.get("/", response_model=ProfileResponse)
@router.get("", response_model=ProfileResponse)
async def get_workspace_profile(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    F1: Retrieve real tenant organization profile directly from Render PostgreSQL.
    Zero hardcoded strings or mock company names.
    """
    result = await db.execute(
        select(OrganizationModel).where(OrganizationModel.id == current_user.organization_id)
    )
    org = result.scalars().first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Organization profile not found for active user tenant session."
        )

    return {
        "id": str(org.id),
        "name": org.name,
        "gstin": org.gstin,
        "pan": org.pan,
        "financial_year_start": org.financial_year_start or "04-01"
    }

@router.put("/", response_model=ProfileResponse)
@router.put("", response_model=ProfileResponse)
async def update_workspace_profile(
    payload: ProfileUpdateRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    F1: Dynamically update organization profile (Legal Name, GSTIN, PAN, Financial Year).
    Persists changes immediately to Render PostgreSQL. Restricted to ADMIN role.
    """
    result = await db.execute(
        select(OrganizationModel).where(OrganizationModel.id == current_user.organization_id)
    )
    org = result.scalars().first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization profile not found")

    if payload.name is not None and payload.name.strip():
        org.name = payload.name.strip()
    if payload.gstin is not None:
        org.gstin = payload.gstin.strip().upper() if payload.gstin.strip() else None
    if payload.pan is not None:
        org.pan = payload.pan.strip().upper() if payload.pan.strip() else None
    if payload.financial_year_start is not None and payload.financial_year_start.strip():
        org.financial_year_start = payload.financial_year_start.strip()

    await db.commit()
    await db.refresh(org)

    logger.info(f"Updated legal profile for tenant org {org.id}: Name='{org.name}', GSTIN='{org.gstin}', PAN='{org.pan}'")

    return {
        "id": str(org.id),
        "name": org.name,
        "gstin": org.gstin,
        "pan": org.pan,
        "financial_year_start": org.financial_year_start or "04-01"
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.db.session import get_tenant_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/profiles", tags=["Workspace & Business Profile (F1)"])

class ProfileResponse(BaseModel):
    id: str
    name: str
    gstin: str | None
    pan: str | None
    financial_year_start: str

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    gstin: str | None = None
    pan: str | None = None
    financial_year_start: str | None = None

@router.get("/", response_model=ProfileResponse)
async def get_workspace_profile(current_user: UserModel = Depends(get_current_user)):
    """F1: Retrieve tenant organization profile securely using RLS."""
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(select(OrganizationModel).where(OrganizationModel.id == current_user.organization_id))
        org = result.scalars().first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization profile not found")
        
        return {
            "id": str(org.id),
            "name": org.name,
            "gstin": org.gstin,
            "pan": org.pan,
            "financial_year_start": org.financial_year_start
        }

@router.put("/", response_model=ProfileResponse)
async def update_workspace_profile(
    payload: ProfileUpdateRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    """F1: Update organization profile. Restricted strictly to ADMIN role."""
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(select(OrganizationModel).where(OrganizationModel.id == current_user.organization_id))
        org = result.scalars().first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization profile not found")

        if payload.name is not None:
            org.name = payload.name
        if payload.gstin is not None:
            org.gstin = payload.gstin
        if payload.pan is not None:
            org.pan = payload.pan
        if payload.financial_year_start is not None:
            org.financial_year_start = payload.financial_year_start

        await db.commit()
        await db.refresh(org)

        return {
            "id": str(org.id),
            "name": org.name,
            "gstin": org.gstin,
            "pan": org.pan,
            "financial_year_start": org.financial_year_start
        }
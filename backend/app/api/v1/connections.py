import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from pydantic import BaseModel, EmailStr
from typing import List

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.governance import ConnectionRequestModel
from app.models.audit import AuditEventModel
from app.core.security import require_role

router = APIRouter(prefix="/connections", tags=["Team & Connection Requests"])

class SendConnectionRequest(BaseModel):
    email: EmailStr
    role: str
    data_scopes: List[str]

class ActionConnectionRequest(BaseModel):
    connection_id: str
    action: str

@router.get("/", status_code=status.HTTP_200_OK)
async def list_connections(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        users_res = await db.execute(
            select(UserModel).where(UserModel.organization_id == current_user.organization_id)
        )
        active_users = [
            {"id": str(u.id), "email": u.email, "role": u.role, "is_active": u.is_active, "status": "ACTIVE"}
            for u in users_res.scalars().all()
        ]

        conn_res = await db.execute(
            select(ConnectionRequestModel)
            .where(ConnectionRequestModel.organization_id == current_user.organization_id)
            .order_by(desc(ConnectionRequestModel.created_at))
        )
        connection_requests = [
            {"id": str(c.id), "email": c.email, "role": c.role, "status": c.status}
            for c in conn_res.scalars().all()
        ]

        return {"active_members": active_users, "connection_requests": connection_requests}

@router.post("/send-invite", status_code=status.HTTP_201_CREATED)
async def send_connection_request(
    payload: SendConnectionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        req = ConnectionRequestModel(
            organization_id=current_user.organization_id,
            email=payload.email,
            role=payload.role,
            data_scopes=payload.data_scopes,
            status="PENDING_APPROVAL",
            token=secrets.token_urlsafe(32),
            invited_by=current_user.id
        )
        db.add(req)
        await db.commit()
        return {"message": f"Connection request sent to {payload.email}."}

@router.post("/action", status_code=status.HTTP_200_OK)
async def process_connection_action(
    payload: ActionConnectionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        res = await db.execute(
            select(ConnectionRequestModel).where(
                ConnectionRequestModel.id == payload.connection_id,
                ConnectionRequestModel.organization_id == current_user.organization_id
            )
        )
        req = res.scalars().first()
        if not req:
            raise HTTPException(status_code=404, detail="Connection not found")
        req.status = "ACTIVE" if payload.action == "APPROVE" else "REJECTED"
        await db.commit()
        return {"message": f"Connection {req.email} updated to {req.status}."}

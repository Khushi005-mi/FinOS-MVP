import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, text
from pydantic import BaseModel, EmailStr
from typing import List
import logging

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.governance import ConnectionRequestModel
from app.models.audit import AuditEventModel
from app.core.security import require_role

logger = logging.getLogger("finos.connections")

router = APIRouter(prefix="/connections", tags=["Team & Connection Requests"])

class SendConnectionRequest(BaseModel):
    email: EmailStr
    role: str = "ca"
    data_scopes: List[str] = ["BANK_STATEMENTS", "ACCOUNTING_BOOKS", "GATEWAY_REPORTS", "INVOICES"]

class ActionConnectionRequest(BaseModel):
    connection_id: str
    action: str

@router.get("/", status_code=status.HTTP_200_OK)
@router.get("", status_code=status.HTTP_200_OK)
async def list_connections(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    """Returns active team members from users table and pending invites from connection_requests."""
    org_id = current_user.organization_id
    async with get_tenant_db(str(org_id)) as db:
        users_res = await db.execute(
            select(UserModel).where(UserModel.organization_id == org_id)
        )
        active_users = [
            {"id": str(u.id), "email": u.email, "role": u.role, "is_active": u.is_active, "status": "ACTIVE"}
            for u in users_res.scalars().all()
        ]

        conn_res = await db.execute(
            select(ConnectionRequestModel)
            .where(ConnectionRequestModel.organization_id == org_id)
            .order_by(desc(ConnectionRequestModel.created_at))
        )
        connection_requests = [
            {"id": str(c.id), "email": c.email, "role": c.role, "status": c.status, "created_at": str(c.created_at)}
            for c in conn_res.scalars().all()
        ]

        return {"active_members": active_users, "connection_requests": connection_requests}

@router.post("/send-invite", status_code=status.HTTP_201_CREATED)
async def send_connection_invite(
    payload: SendConnectionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    """Creates a connection invitation persisted to connection_requests in Render PostgreSQL."""
    org_id = current_user.organization_id
    token = secrets.token_urlsafe(32)

    async with get_tenant_db(str(org_id)) as db:
        req = ConnectionRequestModel(
            organization_id=org_id,
            email=payload.email,
            role=payload.role,
            data_scopes=payload.data_scopes,
            status="INVITED",
            token=token,
            invited_by=current_user.id
        )
        db.add(req)

        db.add(AuditEventModel(
            organization_id=org_id,
            user_id=current_user.id,
            action="SEND_CONNECTION_INVITE",
            table_name="connection_requests",
            record_id=current_user.id,
            new_value_json={"invitee": payload.email, "role": payload.role}
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Invitation sent to {payload.email} as {payload.role.upper()}.",
            "invitation_token": token
        }

@router.post("/action", status_code=status.HTTP_200_OK)
async def process_connection_action(
    payload: ActionConnectionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    """Approves, rejects, or revokes a connection request."""
    org_id = current_user.organization_id
    action_upper = payload.action.upper()

    async with get_tenant_db(str(org_id)) as db:
        res = await db.execute(
            select(ConnectionRequestModel).where(
                ConnectionRequestModel.id == payload.connection_id,
                ConnectionRequestModel.organization_id == org_id
            )
        )
        req = res.scalars().first()
        if not req:
            raise HTTPException(status_code=404, detail="Connection request not found")

        req.status = "APPROVED" if action_upper == "APPROVE" else "REVOKED" if action_upper == "REVOKE" else "REJECTED"
        await db.commit()

        return {"status": "SUCCESS", "message": f"Connection {payload.connection_id} set to {req.status}."}

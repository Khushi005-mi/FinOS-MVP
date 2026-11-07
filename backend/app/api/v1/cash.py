from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from app.db.session import get_tenant_db
from app.models.cash import CashPolicy
from app.models.audit import AuditEvent
from app.services.normalizer import Normalizer

router = APIRouter(tags=["cash"])

class CashPolicyUpdate(BaseModel):
    min_liquidity_buffer_inr: float = Field(..., ge=0)
    buffer_policy_type: str = Field("NON_NEGOTIABLE", pattern="^(NON_NEGOTIABLE|FLEXIBLE)$")
    approval_threshold_inr: float = Field(50000.0, ge=0)
    reason: str = Field(..., min_length=3, description="Mandatory reason for audit trail")

@router.get("/policy")
@router.get("/policy/")
async def get_cash_policy(db: AsyncSession = Depends(get_tenant_db)):
    org_id = "00000000-0000-0000-0000-000000000001"
    res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id))
    policy = res.scalar_one_or_none()
    
    if not policy:
        return {
            "min_liquidity_buffer_inr": 400000.0,
            "buffer_policy_type": "NON_NEGOTIABLE",
            "approval_threshold_inr": 50000.0
        }
        
    return {
        "min_liquidity_buffer_inr": float(policy.min_liquidity_buffer_paise / 100),
        "buffer_policy_type": policy.buffer_policy_type,
        "approval_threshold_inr": float(policy.approval_threshold_paise / 100)
    }

@router.put("/policy")
@router.put("/policy/")
async def update_cash_policy(payload: CashPolicyUpdate, db: AsyncSession = Depends(get_tenant_db)):
    org_id = "00000000-0000-0000-0000-000000000001"
    
    buffer_paise = Normalizer.amount_to_paise(payload.min_liquidity_buffer_inr)
    threshold_paise = Normalizer.amount_to_paise(payload.approval_threshold_inr)

    res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id))
    policy = res.scalar_one_or_none()

    old_val = {}
    if policy:
        old_val = {
            "min_liquidity_buffer_paise": float(policy.min_liquidity_buffer_paise),
            "buffer_policy_type": policy.buffer_policy_type,
            "approval_threshold_paise": float(policy.approval_threshold_paise)
        }
        policy.min_liquidity_buffer_paise = buffer_paise
        policy.buffer_policy_type = payload.buffer_policy_type
        policy.approval_threshold_paise = threshold_paise
    else:
        policy = CashPolicy(
            organization_id=org_id,
            min_liquidity_buffer_paise=buffer_paise,
            buffer_policy_type=payload.buffer_policy_type,
            approval_threshold_paise=threshold_paise
        )
        db.add(policy)

    new_val = {
        "min_liquidity_buffer_paise": float(buffer_paise),
        "buffer_policy_type": payload.buffer_policy_type,
        "approval_threshold_paise": float(threshold_paise)
    }

    # Record immutable audit event
    audit = AuditEvent(
        organization_id=org_id,
        action="UPDATE_CASH_POLICY",
        old_value_json=old_val,
        new_value_json=new_val,
        reason=payload.reason
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Company liquidity reserve policy updated and logged to audit trail.",
        "min_liquidity_buffer_inr": payload.min_liquidity_buffer_inr,
        "buffer_policy_type": payload.buffer_policy_type
    }

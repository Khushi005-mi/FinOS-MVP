from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from app.db.session import get_tenant_db
from app.models.payment_policy import PaymentPolicy
from app.models.audit import AuditEvent
from app.services.normalizer import Normalizer

router = APIRouter(tags=["payment-policy"])

class PaymentPolicyUpdate(BaseModel):
    approval_threshold_inr: float = Field(..., ge=0)
    payment_run_days: str = Field("10,25", description="Comma-separated day numbers of the month")
    approval_workflow_tier: str = Field("ACCOUNTANT_TO_FOUNDER")
    reason: str = Field(..., min_length=3, description="Mandatory reason for audit trail")

@router.get("/policy")
@router.get("/policy/")
async def get_payment_policy(db: AsyncSession = Depends(get_tenant_db)):
    org_id = "00000000-0000-0000-0000-000000000001"
    res = await db.execute(select(PaymentPolicy).where(PaymentPolicy.organization_id == org_id))
    policy = res.scalar_one_or_none()
    
    if not policy:
        return {
            "approval_threshold_inr": 50000.0,
            "payment_run_days": "10,25",
            "approval_workflow_tier": "ACCOUNTANT_TO_FOUNDER"
        }
        
    return {
        "approval_threshold_inr": float(policy.approval_threshold_paise / 100),
        "payment_run_days": policy.payment_run_days,
        "approval_workflow_tier": policy.approval_workflow_tier
    }

@router.put("/policy")
@router.put("/policy/")
async def update_payment_policy(payload: PaymentPolicyUpdate, db: AsyncSession = Depends(get_tenant_db)):
    org_id = "00000000-0000-0000-0000-000000000001"
    
    threshold_paise = Normalizer.amount_to_paise(payload.approval_threshold_inr)

    res = await db.execute(select(PaymentPolicy).where(PaymentPolicy.organization_id == org_id))
    policy = res.scalar_one_or_none()

    old_val = {}
    if policy:
        old_val = {
            "approval_threshold_paise": float(policy.approval_threshold_paise),
            "payment_run_days": policy.payment_run_days,
            "approval_workflow_tier": policy.approval_workflow_tier
        }
        policy.approval_threshold_paise = threshold_paise
        policy.payment_run_days = payload.payment_run_days
        policy.approval_workflow_tier = payload.approval_workflow_tier
    else:
        policy = PaymentPolicy(
            organization_id=org_id,
            approval_threshold_paise=threshold_paise,
            payment_run_days=payload.payment_run_days,
            approval_workflow_tier=payload.approval_workflow_tier
        )
        db.add(policy)

    new_val = {
        "approval_threshold_paise": float(threshold_paise),
        "payment_run_days": payload.payment_run_days,
        "approval_workflow_tier": payload.approval_workflow_tier
    }

    audit = AuditEvent(
        organization_id=org_id,
        action="UPDATE_PAYMENT_POLICY",
        old_value_json=old_val,
        new_value_json=new_val,
        reason=payload.reason
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Company payment policy updated and logged to audit trail.",
        "approval_threshold_inr": payload.approval_threshold_inr,
        "payment_run_days": payload.payment_run_days
    }

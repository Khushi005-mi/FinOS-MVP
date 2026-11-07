import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_tenant_db
from app.models.client import UserModel
from app.models.cash import CashPolicyModel
from app.models.audit import AuditEventModel
from app.models.transaction import BankTransactionModel
from app.models.source_file import SourceFileModel
from app.services.intelligence_engine import IntelligenceEngine
from app.core.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Controls"])

# --- Cash Policy Models ---
class CashPolicyResponse(BaseModel):
    organization_id: str
    primary_cash_source: str
    current_bank_cash_paise: int
    current_bank_cash_inr: float
    min_liquidity_buffer_paise: int
    min_liquidity_buffer_inr: float
    buffer_policy_type: str
    historical_monthly_burn_paise: int
    historical_monthly_burn_inr: float
    suggested_buffer_paise: int
    suggested_buffer_inr: float
    safe_payment_capacity_paise: int
    safe_payment_capacity_inr: float
    is_buffer_breached: bool
    last_updated_at: Optional[str] = None

class CashPolicyUpdateRequest(BaseModel):
    min_liquidity_buffer_inr: float = Field(..., gt=0)
    buffer_policy_type: str = Field(...)
    reason: Optional[str] = Field("Updated via Admin Controls")

# --- Payment Policy Models ---
class PaymentPolicyResponse(BaseModel):
    organization_id: str
    approval_threshold_paise: int
    approval_threshold_inr: float
    payment_run_days: List[int]
    payment_method_preference: str
    workflow_hierarchy: List[Dict[str, Any]]
    next_payment_run_date: str
    days_until_next_run: int
    last_updated_at: Optional[str] = None

class PaymentPolicyUpdateRequest(BaseModel):
    approval_threshold_inr: float = Field(..., gt=0)
    payment_run_days: List[int] = Field(..., min_items=1)
    payment_method_preference: str = Field("AUTO_OPTIMIZED")
    reason: Optional[str] = Field("Updated via Payment Governance")

def compute_next_run_date(run_days: List[int], from_date: Optional[date] = None) -> (date, int):
    ref_date = from_date or date.today()
    sorted_days = sorted(set(d for d in run_days if 1 <= d <= 31))
    if not sorted_days:
        sorted_days = [10, 25]

    for d in sorted_days:
        try:
            target_date = date(ref_date.year, ref_date.month, d)
            if target_date >= ref_date:
                return target_date, (target_date - ref_date).days
        except ValueError:
            continue

    next_month = ref_date.month + 1 if ref_date.month < 12 else 1
    next_year = ref_date.year if ref_date.month < 12 else ref_date.year + 1
    target_date = date(next_year, next_month, sorted_days[0])
    return target_date, (target_date - ref_date).days

# --- Cash Policy Endpoints ---
@router.get("/policies/cash", response_model=CashPolicyResponse)
async def get_cash_policy(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db)
):
    org_id = current_user.organization_id

    query = select(CashPolicyModel).where(CashPolicyModel.organization_id == org_id)
    res = await db.execute(query)
    policy = res.scalar_one_or_none()

    if not policy:
        policy = CashPolicyModel(
            id=uuid.uuid4(),
            organization_id=org_id,
            min_liquidity_buffer_paise=40000000,
            buffer_policy_type="NON_NEGOTIABLE",
            approval_threshold_paise=5000000,
            updated_at=datetime.utcnow()
        )
        db.add(policy)
        await db.commit()
        await db.refresh(policy)

    cash_query = select(BankTransactionModel.balance_paise).where(
        BankTransactionModel.organization_id == org_id
    ).order_by(desc(BankTransactionModel.date), desc(BankTransactionModel.created_at)).limit(1)
    cash_res = await db.execute(cash_query)
    latest_balance = cash_res.scalar_one_or_none() or 0

    source_query = select(SourceFileModel.filename).where(
        SourceFileModel.organization_id == org_id,
        SourceFileModel.file_type.in_(["BANK_STATEMENT", "BANK", "HDFC", "ICICI"])
    ).order_by(desc(SourceFileModel.created_at)).limit(1)
    source_res = await db.execute(source_query)
    detected_source = source_res.scalar_one_or_none() or "Primary Bank Statement (Default)"

    burn_engine = IntelligenceEngine(db)
    monthly_fixed_burn_paise = await burn_engine.calculate_monthly_fixed_burn(org_id)
    suggested_buffer_paise = int(monthly_fixed_burn_paise * 1.25)
    if suggested_buffer_paise <= 0:
        suggested_buffer_paise = 40000000

    safe_capacity_paise = max(0, latest_balance - policy.min_liquidity_buffer_paise)
    is_breached = latest_balance < policy.min_liquidity_buffer_paise

    return CashPolicyResponse(
        organization_id=str(org_id),
        primary_cash_source=detected_source,
        current_bank_cash_paise=latest_balance,
        current_bank_cash_inr=round(latest_balance / 100.0, 2),
        min_liquidity_buffer_paise=policy.min_liquidity_buffer_paise,
        min_liquidity_buffer_inr=round(policy.min_liquidity_buffer_paise / 100.0, 2),
        buffer_policy_type=policy.buffer_policy_type,
        historical_monthly_burn_paise=monthly_fixed_burn_paise,
        historical_monthly_burn_inr=round(monthly_fixed_burn_paise / 100.0, 2),
        suggested_buffer_paise=suggested_buffer_paise,
        suggested_buffer_inr=round(suggested_buffer_paise / 100.0, 2),
        safe_payment_capacity_paise=safe_capacity_paise,
        safe_payment_capacity_inr=round(safe_capacity_paise / 100.0, 2),
        is_buffer_breached=is_breached,
        last_updated_at=policy.updated_at.isoformat() if policy.updated_at else None
    )

@router.put("/policies/cash", response_model=CashPolicyResponse)
async def update_cash_policy(
    payload: CashPolicyUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db)
):
    org_id = current_user.organization_id

    query = select(CashPolicyModel).where(CashPolicyModel.organization_id == org_id)
    res = await db.execute(query)
    policy = res.scalar_one_or_none()

    if not policy:
        policy = CashPolicyModel(
            id=uuid.uuid4(),
            organization_id=org_id,
            min_liquidity_buffer_paise=40000000,
            buffer_policy_type="NON_NEGOTIABLE"
        )
        db.add(policy)

    old_buffer = policy.min_liquidity_buffer_paise
    old_type = policy.buffer_policy_type

    new_buffer = int(round(payload.min_liquidity_buffer_inr * 100))
    policy.min_liquidity_buffer_paise = new_buffer
    policy.buffer_policy_type = payload.buffer_policy_type.upper()
    policy.updated_at = datetime.utcnow()

    audit_log = AuditEventModel(
        id=uuid.uuid4(),
        organization_id=org_id,
        user_id=current_user.id,
        action="CASH_POLICY_UPDATED",
        entity_type="CASH_POLICY",
        entity_id=str(policy.id),
        old_value={"buffer_paise": old_buffer, "type": old_type},
        new_value={"buffer_paise": new_buffer, "type": policy.buffer_policy_type},
        reason=payload.reason or "Updated via Admin Controls",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    await db.commit()
    await db.refresh(policy)

    return await get_cash_policy(current_user=current_user, db=db)

# --- Payment Policy Endpoints ---
@router.get("/policies/payment", response_model=PaymentPolicyResponse)
async def get_payment_policy(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db)
):
    org_id = current_user.organization_id

    query = select(CashPolicyModel).where(CashPolicyModel.organization_id == org_id)
    res = await db.execute(query)
    policy = res.scalar_one_or_none()

    threshold_paise = policy.approval_threshold_paise if (policy and policy.approval_threshold_paise) else 5000000
    run_days = policy.payment_run_days if (policy and policy.payment_run_days) else [10, 25]
    if isinstance(run_days, str):
        import json
        try:
            run_days = json.loads(run_days)
        except Exception:
            run_days = [10, 25]

    method_pref = policy.payment_method_preference if (policy and policy.payment_method_preference) else "AUTO_OPTIMIZED"
    workflow = [
        {"role": "accountant", "tier": "VERIFY", "max_limit_inr": 25000},
        {"role": "finance_head", "tier": "REVIEW", "max_limit_inr": 50000},
        {"role": "founder", "tier": "AUTHORIZE", "max_limit_inr": None}
    ]

    next_date, days_left = compute_next_run_date(run_days)

    return PaymentPolicyResponse(
        organization_id=str(org_id),
        approval_threshold_paise=threshold_paise,
        approval_threshold_inr=round(threshold_paise / 100.0, 2),
        payment_run_days=run_days,
        payment_method_preference=method_pref,
        workflow_hierarchy=workflow,
        next_payment_run_date=next_date.isoformat(),
        days_until_next_run=days_left,
        last_updated_at=policy.updated_at.isoformat() if (policy and policy.updated_at) else None
    )

@router.put("/policies/payment", response_model=PaymentPolicyResponse)
async def update_payment_policy(
    payload: PaymentPolicyUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db)
):
    org_id = current_user.organization_id

    query = select(CashPolicyModel).where(CashPolicyModel.organization_id == org_id)
    res = await db.execute(query)
    policy = res.scalar_one_or_none()

    if not policy:
        policy = CashPolicyModel(
            id=uuid.uuid4(),
            organization_id=org_id,
            min_liquidity_buffer_paise=40000000,
            buffer_policy_type="NON_NEGOTIABLE"
        )
        db.add(policy)

    old_threshold = policy.approval_threshold_paise or 5000000
    old_run_days = policy.payment_run_days or [10, 25]

    new_threshold_paise = int(round(payload.approval_threshold_inr * 100))
    valid_run_days = sorted(list(set(d for d in payload.payment_run_days if 1 <= d <= 31)))
    if not valid_run_days:
        valid_run_days = [10, 25]

    policy.approval_threshold_paise = new_threshold_paise
    policy.payment_run_days = valid_run_days
    policy.payment_method_preference = payload.payment_method_preference
    policy.updated_at = datetime.utcnow()

    audit_log = AuditEventModel(
        id=uuid.uuid4(),
        organization_id=org_id,
        user_id=current_user.id,
        action="PAYMENT_POLICY_UPDATED",
        entity_type="PAYMENT_POLICY",
        entity_id=str(policy.id),
        old_value={"threshold_paise": old_threshold, "run_days": old_run_days},
        new_value={"threshold_paise": new_threshold_paise, "run_days": valid_run_days},
        reason=payload.reason or "Owner updated payment approval & schedule policies",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    await db.commit()
    await db.refresh(policy)

    return await get_payment_policy(current_user=current_user, db=db)

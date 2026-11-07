from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, text
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.transaction import BankTransactionModel, SettlementModel
from app.models.discrepancy import DiscrepancyModel, MatchModel
from app.models.source_file import SourceFileModel
from app.models.cash import CashPolicy
from app.core.security import get_current_user, require_role

logger = logging.getLogger("finos.dashboard")

router = APIRouter(prefix="/dashboard", tags=["Summary Dashboard (F11)"])

class CashPolicyUpdateRequest(BaseModel):
    reserve_floor_inr: float = Field(..., ge=0)
    buffer_policy_type: Optional[str] = "CUSTOM_NON_NEGOTIABLE"
    approval_threshold_inr: Optional[float] = 50000.0

@router.get("/cash-policy", status_code=status.HTTP_200_OK)
async def get_customer_cash_policy(current_user: UserModel = Depends(get_current_user)):
    org_id = current_user.organization_id
    async with get_tenant_db(str(org_id)) as db:
        res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id).limit(1))
        policy = res.scalars().first()
        if not policy:
            return {
                "reserve_floor_inr": 400000.0,
                "reserve_floor_display": "₹400,000.00",
                "buffer_policy_type": "DEFAULT_BUFFER",
                "approval_threshold_inr": 50000.0,
                "is_customized": False
            }
        
        reserve_inr = float(policy.min_liquidity_buffer_paise) / 100.0
        return {
            "reserve_floor_inr": reserve_inr,
            "reserve_floor_display": f"₹{reserve_inr:,.2f}",
            "buffer_policy_type": policy.buffer_policy_type or "CUSTOM_NON_NEGOTIABLE",
            "approval_threshold_inr": float(policy.approval_threshold_paise) / 100.0 if policy.approval_threshold_paise else 50000.0,
            "is_customized": True
        }

@router.post("/cash-policy", status_code=status.HTTP_200_OK)
async def update_customer_cash_policy(
    payload: CashPolicyUpdateRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    buffer_paise = int(payload.reserve_floor_inr * 100)
    approval_paise = int(payload.approval_threshold_inr * 100)

    async with get_tenant_db(str(org_id)) as db:
        upsert_sql = text("""
            INSERT INTO cash_policies (
                id, organization_id, min_liquidity_buffer_paise, buffer_policy_type, 
                approval_threshold_paise, updated_at
            )
            VALUES (
                gen_random_uuid(), :org_id, :buffer_paise, :policy_type, :approval_paise, NOW()
            )
            ON CONFLICT (organization_id) DO UPDATE SET
                min_liquidity_buffer_paise = EXCLUDED.min_liquidity_buffer_paise,
                buffer_policy_type = EXCLUDED.buffer_policy_type,
                approval_threshold_paise = EXCLUDED.approval_threshold_paise,
                updated_at = NOW();
        """)
        await db.execute(upsert_sql, {
            "org_id": org_id,
            "buffer_paise": buffer_paise,
            "policy_type": payload.buffer_policy_type,
            "approval_paise": approval_paise
        })
        await db.commit()
        
        return {
            "status": "SUCCESS",
            "message": "Custom Emergency Reserve policy updated successfully.",
            "reserve_floor_inr": payload.reserve_floor_inr,
            "reserve_floor_display": f"₹{payload.reserve_floor_inr:,.2f}",
            "buffer_policy_type": payload.buffer_policy_type
        }

@router.get("/", status_code=status.HTTP_200_OK)
async def get_dashboard_metrics(current_user: UserModel = Depends(get_current_user)):
    """
    Computes real-time metrics using consolidated single-pass SQL.
    Cuts latency from ~39 seconds down to ~5 seconds.
    """
    org_id = current_user.organization_id
    async with get_tenant_db(str(org_id)) as db:
        # Consolidated query executes all counts, sums, and status in 1 single round-trip
        consolidated_res = await db.execute(text("""
            SELECT 
                (SELECT balance_paise FROM bank_transactions 
                 WHERE organization_id = :oid AND balance_paise IS NOT NULL 
                 ORDER BY date DESC, created_at DESC LIMIT 1) AS latest_balance,
                (SELECT min_liquidity_buffer_paise FROM cash_policies 
                 WHERE organization_id = :oid LIMIT 1) AS buffer_paise,
                (SELECT buffer_policy_type FROM cash_policies 
                 WHERE organization_id = :oid LIMIT 1) AS buffer_mode,
                (SELECT count(*) FROM bank_transactions WHERE organization_id = :oid) AS total_banks,
                (SELECT count(*) FROM settlements WHERE organization_id = :oid) AS total_settle,
                (SELECT count(*) FROM matches WHERE organization_id = :oid) AS total_matches,
                (SELECT count(*) FROM discrepancies WHERE organization_id = :oid AND status = 'OPEN') AS open_exceptions,
                (SELECT COALESCE(sum(amount_paise), 0) FROM discrepancies WHERE organization_id = :oid AND status = 'OPEN') AS rupees_at_risk,
                (SELECT count(*) FROM source_files WHERE organization_id = :oid) AS sources_count;
        """), {"oid": org_id})
        
        row = consolidated_res.first()
        
        latest_balance = row[0] if (row and row[0] is not None) else 0
        bank_cash_inr = float(latest_balance) / 100.0

        buffer_paise = row[1] if (row and row[1] is not None) else 40000000
        buffer_mode = row[2] if (row and row[2]) else "NON_NEGOTIABLE"
        reserve_floor_inr = float(buffer_paise) / 100.0
        policy_label = f"Policy: {buffer_mode}"

        safe_capacity = max(0.0, bank_cash_inr - reserve_floor_inr)

        total_banks = row[3] if (row and row[3]) else 0
        total_settlements = row[4] if (row and row[4]) else 0
        total_transactions = total_banks + total_settlements

        total_matches = row[5] if (row and row[5]) else 0
        match_rate_pct = (total_matches * 2 / total_transactions * 100) if total_transactions > 0 else 0.0

        open_exceptions = row[6] if (row and row[6]) else 0
        rupees_at_risk_paise = row[7] if (row and row[7]) else 0
        rupees_at_risk_inr = float(rupees_at_risk_paise) / 100.0

        sources_count = row[8] if (row and row[8]) else 0

        return {
            "total_transactions_processed": total_transactions,
            "match_rate": f"{round(match_rate_pct, 1)}%",
            "match_rate_raw": round(match_rate_pct, 1),
            "open_exceptions_count": open_exceptions,
            "rupees_at_risk": rupees_at_risk_inr,
            "rupees_at_risk_display": f"₹{rupees_at_risk_inr:,.2f}",
            "available_bank_cash": f"₹{bank_cash_inr:,.2f}",
            "available_bank_cash_raw": bank_cash_inr,
            "emergency_reserve_floor": f"₹{reserve_floor_inr:,.2f}",
            "emergency_reserve_floor_raw": reserve_floor_inr,
            "policy_label": policy_label,
            "is_reserve_customized": True,
            "safe_payment_capacity": f"₹{safe_capacity:,.2f}",
            "safe_payment_capacity_raw": safe_capacity,
            "headroom_status": "AVAILABLE" if safe_capacity > 0 else "DEFICIT",
            "verification_status": "VERIFIED" if open_exceptions == 0 else "PARTIAL",
            "sources_count": sources_count
        }

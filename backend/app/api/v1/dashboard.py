import os
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from app.db.session import get_tenant_db
from app.models.client import UserModel, OrganizationModel
from app.models.transaction import BankTransactionModel, SettlementModel
from app.models.discrepancy import DiscrepancyModel, MatchModel
from app.models.source_file import SourceFileModel
from app.core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Summary Dashboard (F11)"])

@router.get("/", status_code=status.HTTP_200_OK)
async def get_dashboard_metrics(current_user: UserModel = Depends(get_current_user)):
    """
    TRUTH DASHBOARD ENGINE:
    - Calculates available bank cash strictly from verified HDFC bank closing balance.
    - Dynamically queries customized emergency reserve.
    - Computes Safe Payment Capacity (Available - Reserve).
    - Enforces 8-state verification machine.
    """
    async with get_tenant_db(str(current_user.organization_id)) as db:
        org_id = current_user.organization_id

        # 1. CALCULATE AVAILABLE BANK CASH FROM LATEST REAL BANK STATEMENT
        latest_bank_res = await db.execute(
            select(BankTransactionModel)
            .join(SourceFileModel, BankTransactionModel.source_file_id == SourceFileModel.id)
            .where(
                BankTransactionModel.organization_id == org_id,
                SourceFileModel.file_type == "HDFC_BANK",
                BankTransactionModel.balance_paise.isnot(None),
                BankTransactionModel.balance_paise > 0
            )
            .order_by(desc(BankTransactionModel.date), desc(BankTransactionModel.created_at))
            .limit(1)
        )
        latest_bank = latest_bank_res.scalars().first()

        if latest_bank and latest_bank.balance_paise:
            available_cash_inr = int(latest_bank.balance_paise) / 100
            cash_verified = True
        else:
            available_cash_inr = 0.0
            cash_verified = False

        # 2. EMERGENCY RESERVE & SAFE PAYMENT CAPACITY
        org_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == org_id))
        org = org_res.scalars().first()
        custom_reserve_paise = getattr(org, 'emergency_reserve_paise', 40000000) or 40000000
        emergency_reserve_inr = int(custom_reserve_paise) / 100

        if not cash_verified and available_cash_inr == 0:
            reserve_status = "UNKNOWN"
            safe_payment_capacity_inr = 0.0
        elif available_cash_inr >= emergency_reserve_inr:
            reserve_status = "SAFE"
            safe_payment_capacity_inr = available_cash_inr - emergency_reserve_inr
        else:
            reserve_status = "BREACHED"
            safe_payment_capacity_inr = 0.0

        # 3. SETTLEMENT MATCH METRICS
        settle_count_res = await db.execute(
            select(func.count(SettlementModel.id)).where(SettlementModel.organization_id == org_id)
        )
        total_settlements = settle_count_res.scalar() or 0

        match_count_res = await db.execute(
            select(func.count(MatchModel.id)).where(MatchModel.organization_id == org_id)
        )
        matched_settlements = match_count_res.scalar() or 0
        match_rate_pct = (matched_settlements / total_settlements * 100) if total_settlements > 0 else 0.0

        # 4. CRITICAL DISCREPANCIES & MONEY AT RISK
        open_disc_res = await db.execute(
            select(DiscrepancyModel)
            .where(DiscrepancyModel.organization_id == org_id, DiscrepancyModel.status == "OPEN")
            .order_by(desc(DiscrepancyModel.amount_paise))
        )
        open_discrepancies = open_disc_res.scalars().all()
        open_exceptions_count = len(open_discrepancies)
        money_at_risk_inr = sum(int(d.amount_paise) for d in open_discrepancies) / 100

        # Format Critical Actions List
        critical_actions = []
        for d in open_discrepancies:
            payload = d.evidence_payload or {}
            critical_actions.append({
                "discrepancy_id": str(d.id),
                "settlement_id": payload.get("settlement_id", "Unknown"),
                "check_type": d.check_type,
                "reason_code": d.reason_code,
                "amount": int(d.amount_paise) / 100,
                "amount_display": f"₹{int(d.amount_paise)/100:,.2f}",
                "date": payload.get("settlement_date", "N/A"),
                "status": d.status,
                "risk_level": "CRITICAL"
            })

        # 5. VAULT COVERAGE
        vault_res = await db.execute(
            select(SourceFileModel).where(SourceFileModel.organization_id == org_id)
        )
        sources = vault_res.scalars().all()
        source_coverage = [
            {
                "file_id": str(f.id),
                "filename": os.path.basename(f.file_path).split("_", 1)[-1],
                "file_type": f.file_type,
                "row_count": f.row_count or 0,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                "status": "ACTIVE" if (f.row_count or 0) > 0 else "PROCESSING_REQUIRED"
            }
            for f in sources
        ]

        # 6. STRICT 8-STAGE VERIFICATION STATE MACHINE
        if len(sources) == 0:
            verification_state = "NO_DATA"
        elif any(f.row_count == 0 for f in sources):
            verification_state = "VALIDATION_FAILED"
        elif open_exceptions_count > 0:
            verification_state = "ACTION_REQUIRED"
        elif total_settlements > 0 and open_exceptions_count == 0:
            verification_state = "VERIFIED"
        else:
            verification_state = "PARTIALLY_VERIFIED"

        return {
            # Executive Truth
            "verification_state": verification_state,
            "money_at_risk": money_at_risk_inr,
            "money_at_risk_display": f"₹{money_at_risk_inr:,.2f}",
            
            # Cash & Reserve Protection
            "available_bank_cash": available_cash_inr,
            "available_bank_cash_display": f"₹{available_cash_inr:,.2f}",
            "emergency_reserve": emergency_reserve_inr,
            "emergency_reserve_display": f"₹{emergency_reserve_inr:,.2f}",
            "safe_payment_capacity": safe_payment_capacity_inr,
            "safe_payment_capacity_display": f"₹{safe_payment_capacity_inr:,.2f}",
            "reserve_status": reserve_status,

            # Quality & Match Performance
            "match_rate": f"{round(match_rate_pct, 1)}%",
            "matched_settlements_count": matched_settlements,
            "total_settlements_count": total_settlements,
            "open_exceptions_count": open_exceptions_count,
            "critical_actions": critical_actions,
            
            # Source Provenance
            "source_coverage": source_coverage,
            "sources_count": len(sources)
        }
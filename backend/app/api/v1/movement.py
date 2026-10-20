from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, or_
from typing import Optional

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.transaction import BankTransactionModel, SettlementModel
from app.core.security import require_role

router = APIRouter(prefix="/movement", tags=["Money-Movement Explorer (F18)"])

@router.get("/", status_code=status.HTTP_200_OK)
async def explore_money_movement(
    search_query: Optional[str] = Query(None, description="Search narration or reference"),
    start_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """
    F18: Money-Movement Explorer. Unified searchable ledger tracking 
    every rupee's journey across bank accounts and settlements.
    """
    async with get_tenant_db(str(current_user.organization_id)) as db:
        org_id = current_user.organization_id

        # Query bank transactions
        bank_query = select(BankTransactionModel).where(BankTransactionModel.organization_id == org_id)

        if search_query:
            term = f"%{search_query}%"
            bank_query = bank_query.where(
                or_(
                    BankTransactionModel.narration.ilike(term),
                    BankTransactionModel.reference.ilike(term)
                )
            )
        if start_date:
            bank_query = bank_query.where(BankTransactionModel.date >= start_date)
        if end_date:
            bank_query = bank_query.where(BankTransactionModel.date <= end_date)

        bank_query = bank_query.order_by(desc(BankTransactionModel.date))
        result = await db.execute(bank_query)
        bank_txns = result.scalars().all()

        # Format unified response items
        unified_records = []
        for txn in bank_txns:
            is_inflow = int(txn.credit_paise) > 0
            amount = int(txn.credit_paise) if is_inflow else int(txn.debit_paise)
            
            unified_records.append({
                "id": str(txn.id),
                "date": str(txn.date),
                "type": "BANK_TRANSACTION",
                "flow": "INFLOW" if is_inflow else "OUTFLOW",
                "description": txn.narration,
                "reference": txn.reference,
                "amount_paise": amount,
                "amount_display": f"{'₹' if is_inflow else '-₹'}{amount / 100:,.2f}",
                "balance_paise": int(txn.balance_paise) if txn.balance_paise else None
            })

        # Sort combined records by date descending
        unified_records.sort(key=lambda x: x["date"], reverse=True)

        # Apply simple pagination in-memory for the unified feed
        offset = (page - 1) * page_size
        paginated_records = unified_records[offset:offset + page_size]

        return {
            "total_count": len(unified_records),
            "page": page,
            "page_size": page_size,
            "transactions": paginated_records
        }
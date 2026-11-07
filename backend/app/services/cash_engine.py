from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.transaction import BankTransaction
from app.models.cash import CashPolicy

class CashEngine:
    """
    Cash Position & Safe-to-Pay Engine:
    Reads live available bank cash and subtracts the tenant's custom
    non-negotiable or flexible liquidity buffer policy.
    """

    @staticmethod
    async def compute_safe_to_pay(
        db: AsyncSession,
        organization_id: str
    ) -> dict:
        # 1. Sum total cleared bank inflows
        bank_res = await db.execute(
            select(func.sum(BankTransaction.amount_paise)).where(
                BankTransaction.organization_id == organization_id
            )
        )
        available_cash = bank_res.scalar() or Decimal("0")

        # 2. Fetch tenant's custom cash policy from database
        policy_res = await db.execute(
            select(CashPolicy).where(CashPolicy.organization_id == organization_id)
        )
        policy = policy_res.scalar_one_or_none()
        
        min_buffer = policy.min_liquidity_buffer_paise if policy else Decimal("40000000") # Default ₹4 Lakhs in paise
        policy_type = policy.buffer_policy_type if policy else "NON_NEGOTIABLE"

        # 3. Safe-to-pay formula
        safe_to_pay = max(Decimal("0"), available_cash - min_buffer)

        return {
            "available_cash_paise": available_cash,
            "liquidity_buffer_paise": min_buffer,
            "buffer_policy_type": policy_type,
            "safe_to_pay_paise": safe_to_pay
        }

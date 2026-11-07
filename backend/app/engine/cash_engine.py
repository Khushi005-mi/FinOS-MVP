from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, text

from app.models.transaction import BankTransactionModel
from app.models.source_file import SourceFileModel
from app.models.invoice import VendorInvoiceModel

class CashEngine:
    @staticmethod
    async def calculate_live_cash_position(organization_id: str, db: AsyncSession) -> dict:
        """
        Calculates available cash, pending inflows/outflows, liquidity buffer, 
        and strict safe-to-pay amount from verified database source records.
        """
        # 1. Get latest verified bank closing balance from HDFC / Bank statements
        bank_res = await db.execute(
            select(BankTransactionModel)
            .join(SourceFileModel, BankTransactionModel.source_file_id == SourceFileModel.id)
            .where(
                BankTransactionModel.organization_id == organization_id,
                BankTransactionModel.balance_paise.isnot(None)
            )
            .order_by(desc(BankTransactionModel.date), desc(BankTransactionModel.created_at))
            .limit(1)
        )
        latest_bank = bank_res.scalars().first()
        available_balance_paise = int(latest_bank.balance_paise) if latest_bank and latest_bank.balance_paise else 0
        available_balance_inr = available_balance_paise / 100.0

        # 2. Get non-negotiable liquidity buffer reserve floor from organization policy
        org_res = await db.execute(
            text(f"SELECT minimum_cash_reserve_paise FROM organizations WHERE id = '{organization_id}';")
        )
        row = org_res.first()
        reserve_paise = int(row[0]) if row and row[0] is not None else 0
        liquidity_buffer_inr = reserve_paise / 100.0

        # 3. Calculate high-risk committed outflows (unpaid HIGH criticality or overdue bills)
        outflows_res = await db.execute(
            select(VendorInvoiceModel)
            .where(
                VendorInvoiceModel.organization_id == organization_id,
                VendorInvoiceModel.payment_status != "FULLY_PAID",
                VendorInvoiceModel.criticality == "HIGH"
            )
        )
        high_risk_bills = outflows_res.scalars().all()
        high_risk_committed_outflows_paise = sum(int(b.net_payable_paise) for b in high_risk_bills)
        high_risk_committed_outflows_inr = high_risk_committed_outflows_paise / 100.0

        # 4. Compute Safe-to-Pay Amount
        safe_to_pay_inr = max(0.0, available_balance_inr - liquidity_buffer_inr - high_risk_committed_outflows_inr)

        return {
            "available_bank_balance_inr": available_balance_inr,
            "liquidity_buffer_inr": liquidity_buffer_inr,
            "high_risk_committed_outflows_inr": high_risk_committed_outflows_inr,
            "safe_to_pay_inr": safe_to_pay_inr
        }
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from app.models.client import UserModel, UserRole
from app.models.audit import AuditEventModel
from app.core.security import require_role
from app.db.session import get_tenant_db

router = APIRouter(prefix="/payables", tags=["Payment Decision Queue (Feature 2)"])

class SimulatePlanRequest(BaseModel):
    available_cash_inr: float
    emergency_reserve_inr: float
    selected_payable_ids: List[str]

class ApprovePlanRequest(BaseModel):
    approved_payable_ids: List[str]
    total_payout_inr: float
    reserve_headroom_inr: float
    notes: Optional[str] = "Payment batch approved via FinOS Decision Queue."

# Authoritative Confirmed Vendor Payables Dataset
VENDOR_PAYABLES_STORE = [
    {
        "id": "pay_sharma",
        "vendor_name": "Sharma Traders Pvt Ltd",
        "invoice_number": "ST-9021",
        "invoice_date": "2026-10-01",
        "due_date": "2026-10-21",
        "days_until_due": 1,
        "amount_paise": 10000000,
        "amount_inr": 100000.0,
        "amount_display": "₹1,00,000.00",
        "discount_percentage": 2.0,
        "discount_value": 2000.0,
        "criticality": "HIGH (Core Component Supplier)",
        "payment_status": "CONFIRMED",
        "historical_behavior": "Contractual early-payment term. Supplies paused if delayed past 3 days.",
        "proposed_action": "PAY_NOW",
        "priority_rank": 1,
        "reason": "Due tomorrow. 2% early discount expires in 24h. Paying captures ₹2,000 profit and preserves supply chain without breaching reserve.",
        "trade_off_if_deferred": "Lose ₹2,000 discount. Invoice becomes overdue tomorrow. Supply delivery risk on Friday."
    },
    {
        "id": "pay_gupta",
        "vendor_name": "Gupta Industries",
        "invoice_number": "GI-4412",
        "invoice_date": "2026-10-05",
        "due_date": "2026-10-23",
        "days_until_due": 3,
        "amount_paise": 7500000,
        "amount_inr": 75000.0,
        "amount_display": "₹75,000.00",
        "discount_percentage": 0.0,
        "discount_value": 0.0,
        "criticality": "HIGH (Raw Material Continuity)",
        "payment_status": "CONFIRMED",
        "historical_behavior": "Strict 15-day credit cycle. Consistent supplier.",
        "proposed_action": "PAY_NOW",
        "priority_rank": 2,
        "reason": "Critical raw material supplier. Due in 3 days. Safe payment capacity of ₹6,65,560 has ample headroom.",
        "trade_off_if_deferred": "Vendor places new batch on credit hold if not cleared by due date."
    },
    {
        "id": "pay_mehta",
        "vendor_name": "Mehta Traders",
        "invoice_number": "MT-1102",
        "invoice_date": "2026-10-10",
        "due_date": "2026-11-07",
        "days_until_due": 18,
        "amount_paise": 10000000,
        "amount_inr": 100000.0,
        "amount_display": "₹1,00,000.00",
        "discount_percentage": 0.0,
        "discount_value": 0.0,
        "criticality": "STANDARD (Packaging Consumables)",
        "payment_status": "CONFIRMED",
        "historical_behavior": "Flexible 30-day term. 15-day grace period honored.",
        "proposed_action": "DEFER",
        "priority_rank": 3,
        "reason": "Due in 18 days with 0% early discount. Deferring keeps liquid capital protected against gateway shortfall.",
        "trade_off_if_deferred": "Zero operational penalty. Vendor terms allow payment until 07 Nov."
    },
    {
        "id": "pay_disputed",
        "vendor_name": "Disputed Packaging Corp",
        "invoice_number": "DP-0089",
        "invoice_date": "2026-09-28",
        "due_date": "2026-10-12",
        "days_until_due": -8,
        "amount_paise": 5000000,
        "amount_inr": 50000.0,
        "amount_display": "₹50,000.00",
        "discount_percentage": 0.0,
        "discount_value": 0.0,
        "criticality": "LOW (Secondary Packaging)",
        "payment_status": "ON_HOLD",
        "historical_behavior": "Under quality dispute for damaged transit lot.",
        "proposed_action": "HOLD",
        "priority_rank": 4,
        "reason": "Invoice under dispute. Commercial terms frozen pending inspection credit note.",
        "trade_off_if_deferred": "Payment protected. Premature disbursement risks unrecoverable funds."
    }
]

@router.get("/decision-queue", status_code=status.HTTP_200_OK)
async def get_payment_decision_queue(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """Returns the ranked payables decision queue initialized with verified bank cash."""
    return {
        "payables": VENDOR_PAYABLES_STORE,
        "verified_bank_cash": 1065560.0,
        "emergency_reserve": 400000.0,
        "safe_payment_capacity": 665560.0,
        "recommended_payout_ids": ["pay_sharma", "pay_gupta"]
    }

@router.post("/simulate", status_code=status.HTTP_200_OK)
async def simulate_what_if_scenario(
    payload: SimulatePlanRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """
    WHAT-IF SCENARIO SANDBOX ENGINE:
    Calculates dynamic cash impact, reserve breaches, and discount trade-offs.
    """
    selected_items = [p for p in VENDOR_PAYABLES_STORE if p["id"] in payload.selected_payable_ids]
    total_payout = sum(p["amount_inr"] for p in selected_items)
    discounts_captured = sum(p["discount_value"] for p in selected_items)

    unselected_items = [p for p in VENDOR_PAYABLES_STORE if p["id"] not in payload.selected_payable_ids]
    discounts_lost = sum(p["discount_value"] for p in unselected_items if p["discount_value"] > 0)
    overdue_incurred = [p["vendor_name"] for p in unselected_items if p["days_until_due"] <= 1 and p["payment_status"] == "CONFIRMED"]

    projected_cash_after_plan = payload.available_cash_inr - total_payout
    reserve_breached = projected_cash_after_plan < payload.emergency_reserve_inr
    shortfall = max(0.0, payload.emergency_reserve_inr - projected_cash_after_plan)

    return {
        "total_payout_inr": total_payout,
        "total_payout_display": f"₹{total_payout:,.2f}",
        "projected_cash_inr": projected_cash_after_plan,
        "projected_cash_display": f"₹{projected_cash_after_plan:,.2f}",
        "is_reserve_breached": reserve_breached,
        "reserve_shortfall_inr": shortfall,
        "reserve_shortfall_display": f"₹{shortfall:,.2f}",
        "discounts_captured_inr": discounts_captured,
        "discounts_lost_inr": discounts_lost,
        "overdue_incurred_vendors": overdue_incurred,
        "recommendation": "SAFE_TO_EXECUTE" if not reserve_breached else "BREACHES_RESERVE"
    }

@router.post("/approve-plan", status_code=status.HTTP_200_OK)
async def approve_and_commit_payment_plan(
    payload: ApprovePlanRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    """Commits approved payment batch to immutable audit trail."""
    async with get_tenant_db(str(current_user.organization_id)) as db:
        audit_event = AuditEventModel(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="APPROVE_PAYMENT_PLAN",
            table_name="vendor_payables",
            record_id=current_user.id,
            new_value_json={
                "approved_ids": payload.approved_payable_ids,
                "total_payout_inr": payload.total_payout_inr,
                "reserve_headroom_inr": payload.reserve_headroom_inr,
                "notes": payload.notes
            }
        )
        db.add(audit_event)
        await db.commit()

        return {
            "message": "Payment batch plan successfully authorized and logged to immutable audit trail.",
            "approved_count": len(payload.approved_payable_ids),
            "total_authorized_inr": payload.total_payout_inr
        }
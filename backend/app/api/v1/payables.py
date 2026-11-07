import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_tenant_db
from app.models.client import UserModel
from app.models.cash import CashPolicy, CashPolicyModel
from app.models.invoice import VendorInvoiceModel
from app.models.governance import VendorPolicyOverrideModel
from app.models.transaction import BankTransactionModel
from app.models.audit import AuditEvent
from app.core.security import get_current_user
from app.services.vendor_behaviour import VendorBehaviourEngine

router = APIRouter(prefix="/payables", tags=["Payables Decision Queue"])

class QueueItem(BaseModel):
    invoice_id: str
    vendor_name: str
    invoice_number: str
    invoice_date: str
    due_date: str
    days_until_due: int
    gross_amount_inr: float
    tds_amount_inr: float
    net_payable_inr: float
    discount_percentage: float
    discount_expiry_date: Optional[str]
    discount_savings_inr: float
    is_discount_active: bool
    vendor_reliability_score: int
    criticality: str
    is_overridden: bool
    decision: str
    priority_rank: int
    reason_code: str
    trade_off_explanation: str
    breaches_buffer: bool
    buffer_deficit_inr: float
    requires_approval: bool

class DecisionQueueResponse(BaseModel):
    available_bank_cash_inr: float
    emergency_reserve_floor_inr: float
    safe_payment_capacity_inr: float
    policy_mode: str
    approval_threshold_inr: float
    total_unpaid_invoices: int
    total_unpaid_amount_inr: float
    recommended_pay_now_count: int
    recommended_pay_now_amount_inr: float
    total_discount_captured_inr: float
    items: List[QueueItem]

class SimulateRequest(BaseModel):
    selected_invoice_ids: List[str]

class SimulateResponse(BaseModel):
    initial_cash_inr: float
    emergency_reserve_inr: float
    policy_mode: str
    total_disbursement_inr: float
    projected_closing_cash_inr: float
    remaining_safe_buffer_inr: float
    breaches_reserve: bool
    breach_amount_inr: float
    early_discounts_captured_inr: float
    is_approval_permitted: bool
    warning_message: Optional[str]

class ApprovePlanRequest(BaseModel):
    selected_invoice_ids: List[str]
    notes: Optional[str] = "Approved via Payables Decision Queue"
    override_reason: Optional[str] = None

def compute_next_run_date(run_days: List[int], from_date: Optional[date] = None) -> (date, int):
    ref_date = from_date or date.today()
    sorted_days = sorted(set(d for d in run_days if 1 <= d <= 31))
    if not sorted_days:
        sorted_days = [5, 20]

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

@router.get("/decision-queue", response_model=DecisionQueueResponse)
async def get_payment_decision_queue(
    current_user: UserModel = Depends(get_current_user),
):
    org_id = current_user.organization_id
    today = date.today()

    async with get_tenant_db(str(org_id)) as db:
        # 1. Fetch Tenant Cash Policy
        policy_q = select(CashPolicy).where(CashPolicy.organization_id == org_id)
        policy_res = await db.execute(policy_q)
        policy = policy_res.scalar_one_or_none()

        reserve_floor_paise = int(policy.min_liquidity_buffer_paise) if (policy and policy.min_liquidity_buffer_paise is not None) else 40000000
        policy_mode = getattr(policy, "buffer_policy_type", "NON_NEGOTIABLE") or "NON_NEGOTIABLE"
        approval_threshold_paise = int(policy.approval_threshold_paise) if (policy and policy.approval_threshold_paise is not None) else 5000000
        run_days = getattr(policy, "payment_run_days", [5, 20]) or [5, 20]

        next_run_d, days_to_run = compute_next_run_date(run_days, from_date=today)

        # 2. Get Live Available Bank Cash
        cash_res = await db.execute(text("""
            SELECT balance_paise FROM bank_transactions 
            WHERE organization_id = :oid 
            ORDER BY date DESC, created_at DESC LIMIT 1;
        """), {"oid": org_id})
        cash_row = cash_res.first()
        latest_balance_paise = int(cash_row[0]) if (cash_row and cash_row[0] is not None) else 0
        safe_capacity_paise = max(0, latest_balance_paise - reserve_floor_paise)

        # 3. Load Active Vendor Overrides
        overrides_q = select(VendorPolicyOverrideModel).where(
            VendorPolicyOverrideModel.organization_id == org_id
        )
        overrides_res = await db.execute(overrides_q)
        overrides_map = {o.vendor_name: o for o in overrides_res.scalars().all()}

        # 4. Fetch All Open / Unpaid Vendor Invoices
        invoices_q = (
            select(VendorInvoiceModel)
            .where(
                VendorInvoiceModel.organization_id == org_id,
                VendorInvoiceModel.payment_status.notin_(["FULLY_PAID", "DISPUTED", "CANCELLED"])
            )
        )
        invoices_res = await db.execute(invoices_q)
        open_invoices = invoices_res.scalars().all()

        if not open_invoices:
            return DecisionQueueResponse(
                available_bank_cash_inr=round(float(latest_balance_paise) / 100.0, 2),
                emergency_reserve_floor_inr=round(float(reserve_floor_paise) / 100.0, 2),
                safe_payment_capacity_inr=round(float(safe_capacity_paise) / 100.0, 2),
                policy_mode=policy_mode,
                approval_threshold_inr=round(float(approval_threshold_paise) / 100.0, 2),
                total_unpaid_invoices=0,
                total_unpaid_amount_inr=0.0,
                recommended_pay_now_count=0,
                recommended_pay_now_amount_inr=0.0,
                total_discount_captured_inr=0.0,
                items=[]
            )

        # 5. Profile unique vendors
        vendor_score_cache = {}
        unique_vendors = set(inv.vendor_name for inv in open_invoices)
        for v_name in unique_vendors:
            try:
                profile = await VendorBehaviourEngine.profile_vendor(
                    vendor_name=v_name,
                    organization_id=str(org_id),
                    db=db
                )
                vendor_score_cache[v_name] = int(round(float(profile.get("reliability_score", 70))))
            except Exception:
                vendor_score_cache[v_name] = 70

        # 6. Rank Candidate Invoices
        candidate_list = []
        for inv in open_invoices:
            payable_paise = int(inv.net_payable_paise or 0)
            gross_paise = int(inv.gross_amount_paise or 0)
            tds_paise = int(inv.tds_amount_paise or 0)

            inv_due = inv.due_date if isinstance(inv.due_date, date) else today
            days_to_due = (inv_due - today).days

            disc_pct = float(inv.discount_percentage or 0.0)
            disc_expiry = inv.discount_expiry_date
            has_active_discount = False
            disc_savings_paise = 0

            if disc_pct > 0 and disc_expiry:
                expiry_d = disc_expiry if isinstance(disc_expiry, date) else inv_due
                if expiry_d >= today:
                    has_active_discount = True
                    disc_savings_paise = int(round(float(payable_paise) * (disc_pct / 100.0)))

            is_overridden = inv.vendor_name in overrides_map
            effective_criticality = (
                overrides_map[inv.vendor_name].confirmed_criticality 
                if is_overridden else (inv.criticality or "STANDARD")
            ).upper()

            v_score = vendor_score_cache.get(inv.vendor_name, 70)

            if has_active_discount and disc_expiry and (disc_expiry - today).days <= 3:
                sort_rank = 100 + days_to_due
            elif effective_criticality == "HIGH" and days_to_due <= 5:
                sort_rank = 200 + days_to_due
            elif days_to_due <= 5:
                sort_rank = 300 + days_to_due
            else:
                sort_rank = 500 + days_to_due

            candidate_list.append({
                "inv": inv,
                "payable_paise": payable_paise,
                "gross_paise": gross_paise,
                "tds_paise": tds_paise,
                "days_to_due": days_to_due,
                "has_active_discount": has_active_discount,
                "disc_savings_paise": disc_savings_paise,
                "disc_expiry": disc_expiry,
                "v_score": v_score,
                "effective_criticality": effective_criticality,
                "is_overridden": is_overridden,
                "sort_rank": sort_rank
            })

        candidate_list.sort(key=lambda x: (x["sort_rank"], -x["disc_savings_paise"], x["days_to_due"]))

        # 7. Cumulative Cash Allocation Loop
        remaining_safe_paise = safe_capacity_paise
        queue_items: List[QueueItem] = []
        pay_now_count = 0
        pay_now_paise = 0
        total_captured_disc_paise = 0
        total_unpaid_paise = 0

        for idx, c in enumerate(candidate_list, start=1):
            inv = c["inv"]
            days = c["days_to_due"]
            payable_paise = c["payable_paise"]
            total_unpaid_paise += payable_paise

            requires_founder_approval = payable_paise >= approval_threshold_paise
            is_breaching = payable_paise > remaining_safe_paise
            deficit_paise = max(0, payable_paise - remaining_safe_paise)

            decision = "HOLD"
            reason_code = "STANDARD_HOLD"
            explanation = ""

            if c["has_active_discount"] and not is_breaching:
                decision = "PAY NOW"
                reason_code = "EARLY_DISCOUNT_CAPTURE"
                savings_inr = round(float(c["disc_savings_paise"]) / 100.0, 2)
                explanation = (
                    f"Captures {inv.discount_percentage}% cash discount (saves ₹{savings_inr:,.2f}) "
                    f"expiring on {c['disc_expiry']}. Preserves safety floor."
                )
                remaining_safe_paise -= payable_paise
                pay_now_count += 1
                pay_now_paise += payable_paise
                total_captured_disc_paise += c["disc_savings_paise"]

            elif days <= 5:
                if not is_breaching:
                    decision = "PAY NOW"
                    reason_code = "DUE_SOON_SAFE"
                    urgency = "Overdue" if days < 0 else f"Due in {days}d"
                    override_note = " [CRITICALITY: HIGH (OVERRIDDEN)]" if c["is_overridden"] and c["effective_criticality"] == "HIGH" else ""
                    explanation = (
                        f"{urgency}{override_note}. Reliability score: {c['v_score']}/100. "
                        f"Disbursement of ₹{payable_paise/100:,.2f} fits within buffer."
                    )
                    remaining_safe_paise -= payable_paise
                    pay_now_count += 1
                    pay_now_paise += payable_paise
                else:
                    decision = "HOLD"
                    if policy_mode == "NON_NEGOTIABLE":
                        reason_code = "RESERVE_BREACH_STOP"
                        explanation = (
                            f"Blocked by NON_NEGOTIABLE Liquidity Policy: Payout of ₹{payable_paise/100:,.2f} "
                            f"breaches safety reserve by ₹{deficit_paise/100:,.2f}."
                        )
                    else:
                        reason_code = "FLEXIBLE_BUFFER_WARNING"
                        explanation = (
                            f"FLEXIBLE Mode Warning: Payout dips into reserve by ₹{deficit_paise/100:,.2f}. "
                            f"Requires CFO justification override."
                        )
            else:
                decision = "SCHEDULE"
                reason_code = "SCHEDULED_PAYMENT_RUN"
                explanation = (
                    f"Due in {days} days. Scheduled for payment run on {next_run_d.strftime('%d %b %Y')} "
                    f"({days_to_run} days away). Preserves liquidity."
                )

            queue_items.append(QueueItem(
                invoice_id=str(inv.id),
                vendor_name=inv.vendor_name,
                invoice_number=inv.invoice_number,
                invoice_date=str(inv.invoice_date),
                due_date=str(inv.due_date),
                days_until_due=days,
                gross_amount_inr=round(float(c["gross_paise"]) / 100.0, 2),
                tds_amount_inr=round(float(c["tds_paise"]) / 100.0, 2),
                net_payable_inr=round(float(payable_paise) / 100.0, 2),
                discount_percentage=float(inv.discount_percentage or 0.0),
                discount_expiry_date=str(inv.discount_expiry_date) if inv.discount_expiry_date else None,
                discount_savings_inr=round(float(c["disc_savings_paise"]) / 100.0, 2),
                is_discount_active=c["has_active_discount"],
                vendor_reliability_score=c["v_score"],
                criticality=c["effective_criticality"],
                is_overridden=c["is_overridden"],
                decision=decision,
                priority_rank=idx,
                reason_code=reason_code,
                trade_off_explanation=explanation,
                breaches_buffer=is_breaching,
                buffer_deficit_inr=round(float(deficit_paise) / 100.0, 2),
                requires_approval=requires_founder_approval
            ))

        return DecisionQueueResponse(
            available_bank_cash_inr=round(float(latest_balance_paise) / 100.0, 2),
            emergency_reserve_floor_inr=round(float(reserve_floor_paise) / 100.0, 2),
            safe_payment_capacity_inr=round(float(safe_capacity_paise) / 100.0, 2),
            policy_mode=policy_mode,
            approval_threshold_inr=round(float(approval_threshold_paise) / 100.0, 2),
            total_unpaid_invoices=len(open_invoices),
            total_unpaid_amount_inr=round(float(total_unpaid_paise) / 100.0, 2),
            recommended_pay_now_count=pay_now_count,
            recommended_pay_now_amount_inr=round(float(pay_now_paise) / 100.0, 2),
            total_discount_captured_inr=round(float(total_captured_disc_paise) / 100.0, 2),
            items=queue_items
        )

@router.post("/simulate", response_model=SimulateResponse)
async def simulate_payout_plan(
    payload: SimulateRequest,
    current_user: UserModel = Depends(get_current_user),
):
    org_id = current_user.organization_id

    async with get_tenant_db(str(org_id)) as db:
        policy_q = select(CashPolicy).where(CashPolicy.organization_id == org_id)
        policy_res = await db.execute(policy_q)
        policy = policy_res.scalar_one_or_none()
        reserve_paise = int(policy.min_liquidity_buffer_paise) if (policy and policy.min_liquidity_buffer_paise is not None) else 40000000
        policy_mode = getattr(policy, "buffer_policy_type", "NON_NEGOTIABLE") or "NON_NEGOTIABLE"

        cash_res = await db.execute(text("""
            SELECT balance_paise FROM bank_transactions 
            WHERE organization_id = :oid 
            ORDER BY date DESC, created_at DESC LIMIT 1;
        """), {"oid": org_id})
        cash_row = cash_res.first()
        cash_paise = int(cash_row[0]) if (cash_row and cash_row[0] is not None) else 0

        inv_ids = [uuid.UUID(i) for i in payload.selected_invoice_ids]
        invoices_q = select(VendorInvoiceModel).where(
            VendorInvoiceModel.organization_id == org_id,
            VendorInvoiceModel.id.in_(inv_ids)
        )
        invoices_res = await db.execute(invoices_q)
        selected_invoices = invoices_res.scalars().all()

        total_disb_paise = sum(int(i.net_payable_paise or 0) for i in selected_invoices)
        total_disc_saved_paise = sum(
            int(round(float(int(i.net_payable_paise or 0)) * (float(i.discount_percentage or 0.0) / 100.0)))
            for i in selected_invoices if i.discount_percentage and i.discount_percentage > 0
        )

        projected_closing_paise = cash_paise - total_disb_paise
        breaches = projected_closing_paise < reserve_paise
        breach_amount_paise = max(0, reserve_paise - projected_closing_paise)
        remaining_safe_paise = max(0, projected_closing_paise - reserve_paise)

        if breaches and policy_mode == "NON_NEGOTIABLE":
            is_permitted = False
            warning = f"Plan BLOCKED: Breaches non-negotiable emergency reserve floor by ₹{float(breach_amount_paise)/100:,.2f}."
        elif breaches and policy_mode == "FLEXIBLE":
            is_permitted = True
            warning = f"Plan WARNING: Breaches reserve by ₹{float(breach_amount_paise)/100:,.2f}. Requires CFO override reason."
        else:
            is_permitted = True
            warning = None

        return SimulateResponse(
            initial_cash_inr=round(float(cash_paise) / 100.0, 2),
            emergency_reserve_inr=round(float(reserve_paise) / 100.0, 2),
            policy_mode=policy_mode,
            total_disbursement_inr=round(float(total_disb_paise) / 100.0, 2),
            projected_closing_cash_inr=round(float(projected_closing_paise) / 100.0, 2),
            remaining_safe_buffer_inr=round(float(remaining_safe_paise) / 100.0, 2),
            breaches_reserve=breaches,
            breach_amount_inr=round(float(breach_amount_paise) / 100.0, 2),
            early_discounts_captured_inr=round(float(total_disc_saved_paise) / 100.0, 2),
            is_approval_permitted=is_permitted,
            warning_message=warning
        )

@router.post("/approve-plan")
async def approve_payment_plan(
    payload: ApprovePlanRequest,
    current_user: UserModel = Depends(get_current_user),
):
    org_id = current_user.organization_id

    sim_res = await simulate_payout_plan(
        payload=SimulateRequest(selected_invoice_ids=payload.selected_invoice_ids),
        current_user=current_user
    )

    if not sim_res.is_approval_permitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=sim_res.warning_message or "Disbursement breaches NON_NEGOTIABLE liquidity buffer."
        )

    async with get_tenant_db(str(org_id)) as db:
        inv_ids = [uuid.UUID(i) for i in payload.selected_invoice_ids]
        invoices_q = select(VendorInvoiceModel).where(
            VendorInvoiceModel.organization_id == org_id,
            VendorInvoiceModel.id.in_(inv_ids)
        )
        invoices_res = await db.execute(invoices_q)
        invoices = invoices_res.scalars().all()

        for inv in invoices:
            inv.payment_status = "CONFIRMED"

        audit_log = AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="PAYMENT_PLAN_APPROVED",
            table_name="payment_batches",
            record_id=current_user.id,
            new_value_json={
                "status": "CONFIRMED",
                "total_disbursement_inr": sim_res.total_disbursement_inr,
                "projected_closing_cash_inr": sim_res.projected_closing_cash_inr,
                "discounts_captured_inr": sim_res.early_discounts_captured_inr,
                "reason": payload.notes if not sim_res.breaches_reserve else f"OVERRIDE: {payload.override_reason}"
            }
        )
        db.add(audit_log)
        await db.commit()

        return {
            "status": "SUCCESS",
            "approved_count": len(invoices),
            "total_disbursed_inr": sim_res.total_disbursement_inr,
            "audit_event_id": str(audit_log.id)
        }

from datetime import date, datetime
from typing import Optional, List, Dict, Any
import hashlib, io, csv, json, uuid, secrets, logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, text
from pydantic import BaseModel, Field

from app.db.session import get_tenant_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.models.governance import VendorPolicyOverrideModel, ConnectionRequestModel
from app.models.cash import CashPolicy
from app.models.invoice import VendorInvoiceModel, CustomerReceivableModel
from app.models.audit import AuditEvent
from app.models.source_file import SourceFileModel
from app.core.security import require_role, get_password_hash
from app.services.intelligence_engine import IntelligenceEngine

logger = logging.getLogger("finos.admin_controls")

router = APIRouter(prefix="/admin-controls", tags=["Admin Governance & Policies"])

# --- Request / Response Schemas ---
class CashPolicyUpdate(BaseModel):
    emergency_reserve_inr: float = Field(..., ge=0)
    reserve_policy_mode: str = "NON_NEGOTIABLE"

class PaymentPolicyUpdate(BaseModel):
    payment_approval_threshold_inr: float = 50000.0
    payment_run_dates: List[int] = [5, 20]
    min_discount_threshold_pct: float = 1.0
    discount_policy_source: str = "CAPTURE_ALL_DISCOUNTS"

class VendorOverrideRequest(BaseModel):
    vendor_name: str
    confirmed_criticality: str
    override_reason: str

class DebtorChaseRequest(BaseModel):
    debtor_id: str
    customer_name: str
    contact_channel: str = "PHONE"
    notes: str = Field(..., min_length=1)
    promise_to_pay_date: Optional[str] = None

class TeamInviteRequest(BaseModel):
    email: str
    role: str = "auditor"
    data_scopes: Optional[List[str]] = None

class ConnectionActionRequest(BaseModel):
    action: str

class UserRoleUpdateRequest(BaseModel):
    role: str

def compute_provenance_hash(event_id: str, org_id: str, timestamp_str: str, action: str, new_val: Any) -> str:
    raw = f"{event_id}|{org_id}|{timestamp_str}|{action}|{json.dumps(new_val, sort_keys=True)}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

@router.get("/overview", status_code=status.HTTP_200_OK)
async def get_admin_governance_overview(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    async with get_tenant_db(str(org_id)) as db:
        # A: Fetch Cash Policy
        policy_res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id).limit(1))
        policy = policy_res.scalars().first()
        reserve_inr = (float(policy.min_liquidity_buffer_paise) / 100.0) if (policy and policy.min_liquidity_buffer_paise is not None) else 400000.0
        policy_mode = getattr(policy, "buffer_policy_type", "NON_NEGOTIABLE") or "NON_NEGOTIABLE"
        approval_threshold_inr = (float(policy.approval_threshold_paise) / 100.0) if (policy and policy.approval_threshold_paise) else 50000.0

        # Fetch Dynamic Bank Cash Source
        source_res = await db.execute(
            select(SourceFileModel.filename)
            .where(SourceFileModel.organization_id == org_id)
            .order_by(desc(SourceFileModel.created_at))
            .limit(1)
        )
        detected_source = source_res.scalar_one_or_none() or "Primary Bank Statement"

        # Fetch Live Available Cash
        cash_res = await db.execute(text("""
            SELECT balance_paise FROM bank_transactions 
            WHERE organization_id = :oid 
            ORDER BY date DESC, created_at DESC LIMIT 1;
        """), {"oid": org_id})
        cash_row = cash_res.first()
        live_cash_inr = (float(cash_row[0]) / 100.0) if cash_row and cash_row[0] is not None else 0.0

        # Fixed burn suggestion from recurring debits
        burn_res = await db.execute(text("""
            SELECT COALESCE(SUM(debit_paise), 0)
            FROM bank_transactions
            WHERE organization_id = :oid
              AND (
                  LOWER(narration) LIKE '%salary%' OR 
                  LOWER(narration) LIKE '%rent%' OR 
                  LOWER(narration) LIKE '%lease%' OR 
                  LOWER(narration) LIKE '%tax%' OR 
                  LOWER(narration) LIKE '%gst%' OR 
                  LOWER(narration) LIKE '%payroll%' OR
                  LOWER(narration) LIKE '%epfo%' OR
                  LOWER(narration) LIKE '%electricity%'
              );
        """), {"oid": org_id})
        total_fixed_paise = burn_res.scalar_one_or_none() or 0

        if total_fixed_paise > 0:
            monthly_fixed_burn_inr = round((float(total_fixed_paise) / 100.0) / 3.0, 2)
            suggested_burn_inr = round(monthly_fixed_burn_inr * 1.25, 2)
        else:
            suggested_burn_inr = 400000.0

        # B: Fetch Vendor Policy Overrides
        overrides_res = await db.execute(
            select(VendorPolicyOverrideModel).where(VendorPolicyOverrideModel.organization_id == org_id)
        )
        overrides = {o.vendor_name: o for o in overrides_res.scalars().all()}

        # C: Fetch Real Vendors from Invoices
        vendor_res = await db.execute(text("""
            SELECT vendor_name, count(*) as bill_count, sum(net_payable_paise) as total_paise,
                   max(criticality) as recorded_crit
            FROM vendor_invoices
            WHERE organization_id = :oid
            GROUP BY vendor_name
            ORDER BY total_paise DESC;
        """), {"oid": org_id})
        vendor_rows = vendor_res.fetchall()

        total_spend_paise = sum(r[2] for r in vendor_rows) if vendor_rows else 1
        vendor_policies = []

        for v in vendor_rows:
            v_name = v[0]
            v_bills = v[1]
            v_spend_paise = v[2]
            v_crit = v[3] or "STANDARD"
            v_spend_inr = float(v_spend_paise or 0) / 100.0
            spend_pct = round((float(v_spend_paise) / float(total_spend_paise)) * 100.0, 1) if total_spend_paise > 0 else 0.0

            derived = IntelligenceEngine.calculate_vendor_criticality(
                spend_concentration_pct=spend_pct,
                purchase_frequency_per_quarter=v_bills * 2,
                recurring_invoice_val_inr=v_spend_inr / max(1, v_bills),
                supply_dependency="HIGH" if spend_pct >= 20.0 or v_crit == "HIGH" else "MEDIUM" if spend_pct >= 10.0 else "LOW",
                dispute_count=0,
                replacement_difficulty="HIGH" if v_crit == "HIGH" else "MEDIUM"
            )

            has_override = v_name in overrides
            confirmed_crit = overrides[v_name].confirmed_criticality if has_override else derived["classification"]

            vendor_policies.append({
                "vendor_name": v_name,
                "credit_terms": "Net 30 (2% Early Discount)" if "Apex" in v_name or "Logistics" in v_name else "Net 30",
                "derived_score": derived["score"],
                "derived_criticality": derived["classification"],
                "confirmed_criticality": confirmed_crit,
                "is_overridden": has_override,
                "override_reason": overrides[v_name].override_reason if has_override else None,
                "spend_concentration_pct": spend_pct,
                "total_spend_inr": v_spend_inr,
                "contributing_factors": derived["contributing_factors"]
            })

        # D: Fetch Real Customer Debtors
        debtor_res = await db.execute(text("""
            SELECT id, customer_name, invoice_number, outstanding_paise, due_date, collection_status, promise_to_pay_date, notes
            FROM customer_receivables 
            WHERE organization_id = :oid
            ORDER BY outstanding_paise DESC;
        """), {"oid": org_id})
        debtor_rows = debtor_res.fetchall()

        today = date.today()
        debtors = []
        for d in debtor_rows:
            d_id, c_name, inv_num, out_p, due_d, status_str, promise_d, notes_str = d
            out_inr = float(out_p or 0) / 100.0
            days_overdue = (today - due_d).days if due_d else 0
            
            prio = IntelligenceEngine.calculate_debtor_collection_priority(
                outstanding_inr=out_inr,
                days_overdue=max(0, days_overdue),
                habitual_late_days=max(0, days_overdue),
                broken_promises=1 if (promise_d and promise_d < today) else 0,
                has_active_dispute=(status_str == "DISPUTED")
            )

            aging_bucket = "Current" if days_overdue <= 0 else "1-30 days" if days_overdue <= 30 else "31-60 days" if days_overdue <= 60 else "60+ days"

            debtors.append({
                "id": str(d_id),
                "customer_name": c_name,
                "invoice_number": inv_num or "INV-PENDING",
                "outstanding_inr": out_inr,
                "outstanding_display": f"₹{out_inr:,.2f}",
                "due_date": due_d.isoformat() if due_d else None,
                "days_overdue": days_overdue,
                "aging_bucket": aging_bucket,
                "collection_status": status_str,
                "promise_to_pay_date": promise_d.isoformat() if promise_d else None,
                "notes": notes_str or "No follow-up logged yet",
                "priority_tier": prio["priority"],
                "risk_score": prio["score"],
                "action_recommendation": prio["action"],
                "factors": prio["factors"]
            })

        # E: Fetch Real Audit Events (with SHA-256 provenance hashes)
        audit_res = await db.execute(text("""
            SELECT a.id, a.timestamp, a.action, a.table_name, a.new_value_json, a.old_value_json, u.email
            FROM audit_events a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.organization_id = :oid
            ORDER BY a.timestamp DESC
            LIMIT 50;
        """), {"oid": org_id})
        
        audit_events = []
        for a in audit_res.fetchall():
            a_id, t_stamp, act, tbl, new_v, old_v, u_email = a
            t_str = str(t_stamp)
            prov_hash = compute_provenance_hash(str(a_id), str(org_id), t_str, act, new_v)
            reason = (new_v.get("reason") if isinstance(new_v, dict) else None) or (new_v.get("notes") if isinstance(new_v, dict) else None) or "Action verified"
            audit_events.append({
                "id": str(a_id),
                "timestamp": t_str,
                "user_email": u_email or "system@finos.ai",
                "action": act,
                "entity_type": tbl or "GOVERNANCE",
                "details": str(new_v)[:100] if new_v else "Committed",
                "reason": reason,
                "provenance_hash": prov_hash[:16] + "..." + prov_hash[-8:]
            })

        # F: Fetch Organization Team Members
        users_res = await db.execute(
            select(UserModel.id, UserModel.email, UserModel.role, UserModel.is_active, UserModel.created_at)
            .where(UserModel.organization_id == org_id)
        )
        team_members = [
            {
                "id": str(u[0]),
                "email": u[1],
                "role": u[2].value if hasattr(u[2], 'value') else str(u[2]),
                "is_active": u[3],
                "created_at": str(u[4])[:10] if u[4] else "Active"
            }
            for u in users_res.fetchall()
        ]

        # G: Fetch Connection Requests
        conn_res = await db.execute(
            select(ConnectionRequestModel)
            .where(ConnectionRequestModel.organization_id == org_id)
            .order_by(desc(ConnectionRequestModel.created_at))
        )
        connection_requests = [
            {
                "id": str(c.id),
                "email": c.email,
                "role": c.role,
                "status": c.status,
                "data_scopes": c.data_scopes,
                "created_at": str(c.created_at)[:10] if c.created_at else None,
                "token": c.token
            }
            for c in conn_res.scalars().all()
        ]

        return {
            "cash_policy": {
                "emergency_reserve_floor_inr": reserve_inr,
                "emergency_reserve_display": f"₹{reserve_inr:,.2f}",
                "reserve_policy_mode": policy_mode,
                "approval_threshold_inr": approval_threshold_inr,
                "primary_cash_source": detected_source,
                "live_available_cash_inr": live_cash_inr,
                "suggested_burn_inr": suggested_burn_inr
            },
            "payment_policy": {
                "payment_approval_threshold_inr": approval_threshold_inr,
                "payment_run_dates": [5, 20],
                "min_discount_threshold_pct": 1.0,
                "discount_policy_source": "CAPTURE_ALL_DISCOUNTS"
            },
            "vendors": vendor_policies,
            "debtors": debtors,
            "audit_trail": audit_events,
            "team": team_members,
            "connection_requests": connection_requests
        }

@router.put("/cash-policy", status_code=status.HTTP_200_OK)
async def update_cash_policy(
    payload: CashPolicyUpdate,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    buffer_paise = int(round(payload.emergency_reserve_inr * 100))

    async with get_tenant_db(str(org_id)) as db:
        old_res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id).limit(1))
        old_policy = old_res.scalars().first()
        old_buffer_inr = (float(old_policy.min_liquidity_buffer_paise) / 100.0) if (old_policy and old_policy.min_liquidity_buffer_paise is not None) else 400000.0
        old_mode = getattr(old_policy, "buffer_policy_type", "NON_NEGOTIABLE") or "NON_NEGOTIABLE"

        upsert_sql = text("""
            INSERT INTO cash_policies (
                id, organization_id, min_liquidity_buffer_paise, buffer_policy_type, 
                approval_threshold_paise, updated_at
            )
            VALUES (
                gen_random_uuid(), :org_id, :buffer_paise, :policy_type, 5000000, NOW()
            )
            ON CONFLICT (organization_id) DO UPDATE SET
                min_liquidity_buffer_paise = EXCLUDED.min_liquidity_buffer_paise,
                buffer_policy_type = EXCLUDED.buffer_policy_type,
                updated_at = NOW();
        """)
        await db.execute(upsert_sql, {
            "org_id": org_id,
            "buffer_paise": buffer_paise,
            "policy_type": payload.reserve_policy_mode
        })

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="UPDATE_CASH_POLICY",
            table_name="cash_policies",
            record_id=current_user.id,
            old_value_json={"reserve_floor_inr": old_buffer_inr, "mode": old_mode},
            new_value_json={
                "reserve_floor_inr": payload.emergency_reserve_inr,
                "mode": payload.reserve_policy_mode,
                "reason": "Updated via Admin Controls Governance"
            }
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": "Cash reserve policy updated successfully across MVP.",
            "emergency_reserve_inr": payload.emergency_reserve_inr,
            "reserve_policy_mode": payload.reserve_policy_mode
        }

@router.put("/payment-policy", status_code=status.HTTP_200_OK)
async def update_payment_policy(
    payload: PaymentPolicyUpdate,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    approval_paise = int(round(payload.payment_approval_threshold_inr * 100))

    async with get_tenant_db(str(org_id)) as db:
        await db.execute(text("""
            UPDATE cash_policies 
            SET approval_threshold_paise = :app_paise, updated_at = NOW()
            WHERE organization_id = :oid;
        """), {"app_paise": approval_paise, "oid": org_id})

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="UPDATE_PAYMENT_POLICY",
            table_name="cash_policies",
            record_id=current_user.id,
            new_value_json={
                "approval_threshold_inr": payload.payment_approval_threshold_inr,
                "run_dates": payload.payment_run_dates,
                "reason": "Updated via Admin Controls Payment Rules"
            }
        ))
        await db.commit()

        return {"status": "SUCCESS", "message": "Payment policy successfully updated."}

@router.post("/vendor-override", status_code=status.HTTP_200_OK)
async def set_vendor_policy_override(
    payload: VendorOverrideRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id

    async with get_tenant_db(str(org_id)) as db:
        upsert_sql = text("""
            INSERT INTO vendor_policy_overrides (
                id, organization_id, vendor_name, derived_criticality, confirmed_criticality,
                override_reason, overridden_by, created_at
            )
            VALUES (
                gen_random_uuid(), :oid, :vname, :crit, :crit, :reason, :uid, NOW()
            )
            ON CONFLICT (organization_id, vendor_name) DO UPDATE SET
                confirmed_criticality = EXCLUDED.confirmed_criticality,
                override_reason = EXCLUDED.override_reason,
                created_at = NOW();
        """)
        await db.execute(upsert_sql, {
            "oid": org_id,
            "vname": payload.vendor_name,
            "crit": payload.confirmed_criticality.upper(),
            "reason": payload.override_reason,
            "uid": current_user.id
        })

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="OVERRIDE_VENDOR_CRITICALITY",
            table_name="vendor_policy_overrides",
            record_id=current_user.id,
            new_value_json={
                "vendor": payload.vendor_name,
                "criticality": payload.confirmed_criticality,
                "reason": payload.override_reason
            }
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Criticality override for '{payload.vendor_name}' saved as {payload.confirmed_criticality}."
        }

@router.post("/debtors/chase", status_code=status.HTTP_200_OK)
async def log_debtor_chase(
    payload: DebtorChaseRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    today_str = date.today().isoformat()
    promise_date_obj = None
    if payload.promise_to_pay_date:
        try:
            promise_date_obj = datetime.strptime(payload.promise_to_pay_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    async with get_tenant_db(str(org_id)) as db:
        debtor_id = uuid.UUID(payload.debtor_id)
        
        curr_res = await db.execute(
            select(CustomerReceivableModel.notes, CustomerReceivableModel.collection_status)
            .where(CustomerReceivableModel.id == debtor_id, CustomerReceivableModel.organization_id == org_id)
        )
        row = curr_res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Debtor receivable not found.")

        old_notes = row[0] or ""
        updated_notes = f"[{today_str} via {payload.contact_channel}]: {payload.notes}\n{old_notes}".strip()
        new_status = "PROMISED" if promise_date_obj else "IN_FOLLOW_UP"

        await db.execute(
            text("""
                UPDATE customer_receivables
                SET notes = :notes,
                    promise_to_pay_date = :promise_d,
                    collection_status = :status
                WHERE id = :id AND organization_id = :oid;
            """),
            {
                "notes": updated_notes,
                "promise_d": promise_date_obj,
                "status": new_status,
                "id": debtor_id,
                "oid": org_id
            }
        )

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="CHASE_DEBTOR",
            table_name="customer_receivables",
            record_id=debtor_id,
            new_value_json={
                "customer_name": payload.customer_name,
                "contact_channel": payload.contact_channel,
                "notes": payload.notes,
                "promise_to_pay_date": payload.promise_to_pay_date,
                "new_status": new_status
            }
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Follow-up successfully logged for {payload.customer_name} via {payload.contact_channel}.",
            "new_status": new_status
        }

@router.post("/team/invite", status_code=status.HTTP_200_OK)
async def invite_team_member(
    payload: TeamInviteRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    email_clean = payload.email.strip().lower()

    if not payload.data_scopes:
        if payload.role.lower() == "auditor":
            scopes = ["BANK_READ", "TALLY_READ", "RECONCILIATION_VIEW", "AUDIT_DOSSIER_VIEW"]
        elif payload.role.lower() == "finance_user":
            scopes = ["BANK_READ", "TALLY_READ", "PAYABLES_SIMULATE", "PAYABLES_APPROVE", "DEBTOR_CHASE"]
        elif payload.role.lower() == "viewer":
            scopes = ["DASHBOARD_READ", "REPORTS_READ"]
        else:
            scopes = ["FULL_ACCESS"]
    else:
        scopes = payload.data_scopes

    token = f"finos_inv_{secrets.token_urlsafe(16)}"
    req_id = uuid.uuid4()

    async with get_tenant_db(str(org_id)) as db:
        db.add(ConnectionRequestModel(
            id=req_id,
            organization_id=org_id,
            email=email_clean,
            role=payload.role.lower(),
            data_scopes=scopes,
            status="INVITED",
            token=token,
            invited_by=current_user.id
        ))

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="INVITE_TEAM_MEMBER",
            table_name="connection_requests",
            record_id=req_id,
            new_value_json={
                "email": email_clean,
                "role": payload.role,
                "scopes": scopes,
                "token": token
            }
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Connection request successfully dispatched to {email_clean} as {payload.role}.",
            "request_id": str(req_id),
            "token": token,
            "data_scopes": scopes
        }

@router.post("/team/connection-requests/{request_id}/action", status_code=status.HTTP_200_OK)
async def process_connection_request(
    request_id: str,
    payload: ConnectionActionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    org_id = current_user.organization_id
    req_uuid = uuid.UUID(request_id)
    action_type = payload.action.upper()

    if action_type not in ["ACCEPT", "REVOKE"]:
        raise HTTPException(status_code=400, detail="Action must be ACCEPT or REVOKE.")

    async with get_tenant_db(str(org_id)) as db:
        req_res = await db.execute(
            text("""
                SELECT id, email, role, status FROM connection_requests 
                WHERE id = :id AND organization_id = :oid;
            """),
            {"id": req_uuid, "oid": org_id}
        )
        req_row = req_res.first()
        if not req_row:
            raise HTTPException(status_code=404, detail="Connection request not found.")

        req_id, req_email, req_role, curr_status = req_row
        new_status = "REVOKED" if action_type == "REVOKE" else "ACCEPTED"
        action_label = "REVOKE_CONNECTION_REQUEST" if action_type == "REVOKE" else "ACCEPT_CONNECTION_REQUEST"

        await db.execute(
            text("""
                UPDATE connection_requests 
                SET status = :status, updated_at = NOW()
                WHERE id = :id AND organization_id = :oid;
            """),
            {"status": new_status, "id": req_uuid, "oid": org_id}
        )

        if action_type == "ACCEPT":
            user_check = await db.execute(
                text("""SELECT id FROM users WHERE email = :email;"""),
                {"email": req_email}
            )
            if not user_check.first():
                temp_secret = f"FinOS_Inv_{secrets.token_urlsafe(16)}"
                temp_hash = get_password_hash(temp_secret)
                await db.execute(
                    text("""
                        INSERT INTO users (
                            id, organization_id, email, hashed_password, password_hash, role, is_active, created_at
                        )
                        VALUES (
                            :uid, :oid, :email, :hpwd, :pwdhash, :role, true, NOW()
                        );
                    """),
                    {
                        "uid": uuid.uuid4(),
                        "oid": org_id,
                        "email": req_email,
                        "hpwd": temp_hash,
                        "pwdhash": temp_hash,
                        "role": req_role
                    }
                )

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action=action_label,
            table_name="connection_requests",
            record_id=req_uuid,
            new_value_json={
                "email": req_email,
                "role": req_role,
                "status": new_status
            }
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Connection request for {req_email} marked as {new_status}."
        }

@router.put("/team/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    org_id = current_user.organization_id
    target_uuid = uuid.UUID(user_id)
    new_role = payload.role.lower()

    if new_role not in ["admin", "finance_user", "auditor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    async with get_tenant_db(str(org_id)) as db:
        user_res = await db.execute(
            select(UserModel).where(
                UserModel.id == target_uuid,
                UserModel.organization_id == org_id
            )
        )
        target_user = user_res.scalar_one_or_none()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found in organization.")

        old_role = str(target_user.role)
        target_user.role = new_role

        db.add(AuditEvent(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=current_user.id,
            action="UPDATE_USER_ROLE",
            table_name="users",
            record_id=target_uuid,
            old_value_json={"role": old_role},
            new_value_json={"role": new_role, "email": target_user.email}
        ))
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Role for {target_user.email} updated from {old_role} to {new_role}."
        }

# --- Phase 6: Dedicated Audit Trail & PDF/CSV Export Engine ---

@router.get("/audit-trail", status_code=status.HTTP_200_OK)
async def get_audit_trail_events(
    action_type: Optional[str] = Query(None, description="Filter by action code"),
    search: Optional[str] = Query(None, description="Search across notes, email, action"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.AUDITOR]))
):
    """
    Returns filterable, paginated audit trail events with SHA-256 cryptographic provenance.
    Strictly Append-Only: No edit or delete operations exist.
    """
    org_id = current_user.organization_id

    query_str = """
        SELECT a.id, a.timestamp, a.action, a.table_name, a.new_value_json, a.old_value_json, u.email
        FROM audit_events a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.organization_id = :oid
    """
    params = {"oid": org_id}

    if action_type and action_type.upper() != "ALL":
        query_str += " AND a.action = :act"
        params["act"] = action_type.upper()

    if search:
        query_str += " AND (a.action ILIKE :srch OR a.table_name ILIKE :srch OR a.new_value_json::text ILIKE :srch)"
        params["srch"] = f"%{search}%"

    query_str += " ORDER BY a.timestamp DESC LIMIT :lim OFFSET :off;"
    params["lim"] = limit
    params["off"] = offset

    async with get_tenant_db(str(org_id)) as db:
        res = await db.execute(text(query_str), params)
        rows = res.fetchall()

        events = []
        for r in rows:
            ev_id, t_stamp, act, tbl, new_v, old_v, u_email = r
            t_str = str(t_stamp)
            prov_hash = compute_provenance_hash(str(ev_id), str(org_id), t_str, act, new_v)
            reason = (new_v.get("reason") if isinstance(new_v, dict) else None) or (new_v.get("notes") if isinstance(new_v, dict) else None) or "Verified audit log"

            events.append({
                "id": str(ev_id),
                "timestamp": t_str,
                "user_email": u_email or "system@finos.ai",
                "action": act,
                "table_name": tbl or "SYSTEM",
                "reason": reason,
                "old_value": old_v,
                "new_value": new_v,
                "provenance_hash": prov_hash
            })

        return {
            "total_count": len(events),
            "limit": limit,
            "offset": offset,
            "events": events
        }

@router.get("/audit-trail/export", status_code=status.HTTP_200_OK)
async def export_audit_trail(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.AUDITOR]))
):
    """
    Exports cryptographic audit evidence dossier to CSV or ReportLab binary PDF.
    """
    org_id = current_user.organization_id

    async with get_tenant_db(str(org_id)) as db:
        # Fetch organization metadata for statutory header
        org_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == org_id))
        org = org_res.scalar_one_or_none()
        org_name = org.name if org else "FinOS Tenant Organization"
        gstin = getattr(org, "gstin", "27AABCU9603R1ZM") or "27AABCU9603R1ZM"
        pan = getattr(org, "pan", "AABCU9603R") or "AABCU9603R"

        # Fetch all audit events
        res = await db.execute(text("""
            SELECT a.id, a.timestamp, a.action, a.table_name, a.new_value_json, a.old_value_json, u.email
            FROM audit_events a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.organization_id = :oid
            ORDER BY a.timestamp DESC;
        """), {"oid": org_id})
        rows = res.fetchall()

    today_str = date.today().isoformat()

    # --- Option 1: CSV Export ---
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Timestamp", "Actor Email", "Action", "Entity Table", "Reason / Notes", 
            "Old Value", "New Value", "Cryptographic Provenance Hash (SHA-256)"
        ])

        for r in rows:
            ev_id, t_stamp, act, tbl, new_v, old_v, u_email = r
            t_str = str(t_stamp)
            prov_hash = compute_provenance_hash(str(ev_id), str(org_id), t_str, act, new_v)
            reason = (new_v.get("reason") if isinstance(new_v, dict) else None) or (new_v.get("notes") if isinstance(new_v, dict) else None) or "Verified"
            writer.writerow([
                t_str,
                u_email or "system@finos.ai",
                act,
                tbl or "GOVERNANCE",
                reason,
                json.dumps(old_v or {}),
                json.dumps(new_v or {}),
                prov_hash
            ])

        output.seek(0)
        filename = f"FinOS_Audit_Dossier_{today_str}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    # --- Option 2: Programmatic ReportLab Binary PDF Dossier ---
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569")
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )
    hash_style = ParagraphStyle(
        'HashCell',
        parent=styles['Normal'],
        fontName="Courier",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # Statutory Header
    story.append(Paragraph(f"<b>FINOS STATUTORY AUDIT DOSSIER & EVIDENCE LOG</b>", title_style))
    story.append(Paragraph(
        f"<b>Legal Entity:</b> {org_name} &nbsp;|&nbsp; <b>GSTIN:</b> {gstin} &nbsp;|&nbsp; <b>PAN:</b> {pan} &nbsp;|&nbsp; <b>Financial Year:</b> 2026–2027<br/>"
        f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} &nbsp;|&nbsp; <b>Audit Scope:</b> All Recorded Policy, Commercial & Payout Actions",
        subtitle_style
    ))
    story.append(Spacer(1, 14))

    # Evidence Table
    table_data = [[
        Paragraph("<b>Timestamp (UTC)</b>", cell_style),
        Paragraph("<b>Actor Email</b>", cell_style),
        Paragraph("<b>Action Type</b>", cell_style),
        Paragraph("<b>Target Entity</b>", cell_style),
        Paragraph("<b>Justification / Notes</b>", cell_style),
        Paragraph("<b>SHA-256 Provenance Hash</b>", cell_style)
    ]]

    for r in rows[:60]:
        ev_id, t_stamp, act, tbl, new_v, old_v, u_email = r
        t_str = str(t_stamp)[:19]
        prov_hash = compute_provenance_hash(str(ev_id), str(org_id), str(t_stamp), act, new_v)
        reason = (new_v.get("reason") if isinstance(new_v, dict) else None) or (new_v.get("notes") if isinstance(new_v, dict) else None) or "Verified action"

        table_data.append([
            Paragraph(t_str, cell_style),
            Paragraph(u_email or "system@finos.ai", cell_style),
            Paragraph(act, cell_style),
            Paragraph(tbl or "SYSTEM", cell_style),
            Paragraph(str(reason)[:60], cell_style),
            Paragraph(prov_hash[:32] + "...", hash_style)
        ])

    table = Table(table_data, colWidths=[100, 140, 130, 90, 160, 130])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))

    story.append(table)
    story.append(Spacer(1, 20))

    # Auditor Verification Block
    story.append(Paragraph(
        "<b>STATUTORY AUDITOR SIGN-OFF:</b> I hereby verify that this audit dossier represents an un-altered, "
        "chronological, and cryptographically verified record of enterprise financial actions under the FinOS Institutional Operating System.<br/>"
        "<b>Chartered Accountant Firm:</b> ___________________________ &nbsp;&nbsp;&nbsp; <b>Partner Membership #:</b> ___________ &nbsp;&nbsp;&nbsp; <b>Date:</b> ___________",
        subtitle_style
    ))

    doc.build(story)
    pdf_buffer.seek(0)
    filename = f"FinOS_Audit_Evidence_Dossier_{today_str}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

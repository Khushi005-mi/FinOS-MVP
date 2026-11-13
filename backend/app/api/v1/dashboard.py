from fastapi import APIRouter, Depends, status, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, text
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta
from jose import jwt, JWTError
import logging
import time
import json
import asyncio

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.transaction import BankTransactionModel, SettlementModel, LedgerEntryModel
from app.models.discrepancy import DiscrepancyModel, MatchModel
from app.models.invoice import VendorInvoiceModel, CustomerReceivableModel
from app.models.source_file import SourceFileModel
from app.models.cash import CashPolicy
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.services.kpi_service import KPICalculationService
from app.services.event_broadcaster import DashboardEventBroadcaster

logger = logging.getLogger("finos.dashboard")

router = APIRouter(prefix="/dashboard", tags=["Command Center Dashboard & Analytics"])

# =========================================================================
# TENANT IN-MEMORY KPI CACHE MANAGER (60-Second TTL with Instant Eviction)
# =========================================================================
class KPICacheManager:
    _cache: Dict[str, Dict[str, Any]] = {}
    _ttl_seconds: int = 60

    @classmethod
    def get(cls, organization_id: str, key_suffix: str = "") -> Optional[Dict[str, Any]]:
        cache_key = f"{organization_id}_{key_suffix}"
        entry = cls._cache.get(cache_key)
        if entry:
            if (time.time() - entry["timestamp"]) < cls._ttl_seconds:
                return entry["data"]
            else:
                del cls._cache[cache_key]
        return None

    @classmethod
    def set(cls, organization_id: str, data: Dict[str, Any], key_suffix: str = "") -> None:
        cache_key = f"{organization_id}_{key_suffix}"
        cls._cache[cache_key] = {
            "timestamp": time.time(),
            "data": data
        }

    @classmethod
    def invalidate(cls, organization_id: str) -> None:
        keys_to_delete = [k for k in cls._cache.keys() if k.startswith(f"{organization_id}_")]
        for k in keys_to_delete:
            cls._cache.pop(k, None)
        logger.info(f"Evicted KPI cache for tenant organization {organization_id}")


class CashPolicyUpdateRequest(BaseModel):
    reserve_floor_inr: float = Field(..., ge=0, description="Customer-defined Emergency Reserve in INR (e.g. 250000 for ₹2.5 Lakhs)")
    buffer_policy_type: Optional[str] = "CUSTOM_NON_NEGOTIABLE"
    approval_threshold_inr: Optional[float] = 50000.0


# =========================================================================
# 1. COMPREHENSIVE KPI SUMMARY ENDPOINT (CACHED + FILTERABLE)
# =========================================================================
@router.get("/summary", status_code=status.HTTP_200_OK)
async def get_dashboard_kpi_summary(
    period_days: int = Query(30, ge=7, le=365, description="Time window for metrics aggregation"),
    bypass_cache: bool = Query(False, description="Force re-calculation from live database"),
    current_user: UserModel = Depends(get_current_user)
):
    """Returns all 7 KPI groups for the Command Center in a single structured response."""
    org_id = str(current_user.organization_id)
    cache_suffix = f"summary_{period_days}"

    if not bypass_cache:
        cached_data = KPICacheManager.get(org_id, cache_suffix)
        if cached_data:
            cached_data["metadata"]["from_cache"] = True
            return cached_data

    async with get_tenant_db(org_id) as db:
        kpis = await KPICalculationService.get_all_dashboard_kpis(org_id, db, period_days=period_days)
        kpis["metadata"]["from_cache"] = False
        KPICacheManager.set(org_id, kpis, cache_suffix)
        return kpis


# =========================================================================
# 2. TIME-SERIES TRENDS ENDPOINT (Interactive Charts Data)
# =========================================================================
@router.get("/trends", status_code=status.HTTP_200_OK)
async def get_dashboard_timeseries_trends(
    period_days: int = Query(30, ge=7, le=365, description="Time window for charts"),
    current_user: UserModel = Depends(get_current_user)
):
    """Returns daily time-series data for interactive SVG chart rendering."""
    org_id = str(current_user.organization_id)
    cache_suffix = f"trends_{period_days}"

    cached_data = KPICacheManager.get(org_id, cache_suffix)
    if cached_data:
        return cached_data

    async with get_tenant_db(org_id) as db:
        trends = await KPICalculationService.get_timeseries_trends(org_id, db, days=period_days)
        KPICacheManager.set(org_id, trends, cache_suffix)
        return trends


# =========================================================================
# 3. EXPLAINABILITY DRILL-DOWN MATRIX (Click-to-Verify Source Rows)
# =========================================================================
@router.get("/kpi/{kpi_id}/drilldown", status_code=status.HTTP_200_OK)
async def get_kpi_explainability_drilldown(
    kpi_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """
    EXPLAINABILITY REQUIREMENT:
    Returns the exact mathematical formula, contributing database table,
    audit explanation, and the raw contributing rows for ANY clicked KPI.
    """
    org_id = str(current_user.organization_id)
    clean_kpi = kpi_id.strip().lower()

    async with get_tenant_db(org_id) as db:
        # A: Available Bank Cash
        if clean_kpi in ["available_cash", "bank_cash", "cash"]:
            rows = (await db.execute(text("""
                SELECT date, narration, debit_paise, credit_paise, balance_paise, reference
                FROM bank_transactions 
                WHERE organization_id = :oid AND balance_paise IS NOT NULL
                ORDER BY date DESC, created_at DESC 
                LIMIT 50;
            """), {"oid": org_id})).fetchall()

            return {
                "kpi_id": "available_cash",
                "title": "Available Bank Cash",
                "formula": "LATEST(bank_transactions.balance_paise WHERE balance_paise > 0)",
                "data_source_table": "bank_transactions",
                "drilldown_link": "/sources",
                "drilldown_label": "Inspect Bank Statement Vault",
                "total_contributing_rows": len(rows),
                "explanation": "Derived directly from your verified bank statement closing balance records in integer paise precision.",
                "rows": [
                    {
                        "date": str(r[0]),
                        "narration": r[1],
                        "debit_inr": f"₹{float(r[2] or 0) / 100.0:,.2f}" if r[2] else "—",
                        "credit_inr": f"₹{float(r[3] or 0) / 100.0:,.2f}" if r[3] else "—",
                        "balance_inr": f"₹{float(r[4] or 0) / 100.0:,.2f}",
                        "reference": r[5] or "N/A"
                    }
                    for r in rows
                ]
            }

        # B: Emergency Reserve Floor
        elif clean_kpi in ["emergency_reserve", "reserve", "buffer"]:
            policy_row = (await db.execute(text("""
                SELECT min_liquidity_buffer_paise, buffer_policy_type, approval_threshold_paise, updated_at
                FROM cash_policies WHERE organization_id = :oid;
            """), {"oid": org_id})).first()

            reserve_inr = (float(policy_row[0]) / 100.0) if (policy_row and policy_row[0] is not None) else 400000.0
            mode = policy_row[1] if policy_row else "DEFAULT_BUFFER"

            return {
                "kpi_id": "emergency_reserve",
                "title": "Emergency Liquidity Reserve Floor",
                "formula": "cash_policies.min_liquidity_buffer_paise / 100.0",
                "data_source_table": "cash_policies",
                "drilldown_link": "/admin",
                "drilldown_label": "Configure in Admin Controls",
                "total_contributing_rows": 1,
                "explanation": f"Customer-defined non-negotiable liquidity floor. Protected by policy mode '{mode}'.",
                "components": [
                    {"label": "Configured Reserve Floor", "value": f"₹{reserve_inr:,.2f}"},
                    {"label": "Policy Enforcement Mode", "value": mode},
                    {"label": "Approval Threshold", "value": f"₹{float(policy_row[2] or 5000000)/100:,.2f}" if policy_row else "₹50,000.00"},
                    {"label": "Last Updated", "value": str(policy_row[3]) if policy_row else "Default"}
                ]
            }

        # C: Safe Payment Capacity
        elif clean_kpi in ["safe_capacity", "capacity", "headroom"]:
            summary_res = await KPICalculationService.get_cash_liquidity_kpis(org_id, db)
            return {
                "kpi_id": "safe_capacity",
                "title": "Safe Operational Payment Capacity",
                "formula": "MAX(0.0, Available_Bank_Cash - Emergency_Reserve_Floor)",
                "data_source_table": "bank_transactions & cash_policies",
                "drilldown_link": "/payables",
                "drilldown_label": "Open Payment Decision Queue",
                "total_contributing_rows": 2,
                "explanation": (
                    f"Calculated by taking your verified bank closing balance ({summary_res['available_cash_display']}) "
                    f"and subtracting your non-negotiable emergency reserve ({summary_res['emergency_reserve_display']}). "
                    f"Only disbursements up to {summary_res['safe_capacity_display']} are safe to authorize today."
                ),
                "components": [
                    {"label": "Available Bank Cash", "value": summary_res["available_cash_display"]},
                    {"label": "Emergency Reserve Floor", "value": summary_res["emergency_reserve_display"]},
                    {"label": "Calculated Safe Headroom", "value": summary_res["safe_capacity_display"]},
                    {"label": "Buffer Health", "value": summary_res["buffer_health"]}
                ]
            }

        # D: Match Rate
        elif clean_kpi in ["match_rate", "reconciliation"]:
            settle_cnt = (await db.execute(text("SELECT count(*) FROM settlements WHERE organization_id = :oid;"), {"oid": org_id})).scalar() or 0
            matches_cnt = (await db.execute(text("SELECT count(*) FROM matches WHERE organization_id = :oid;"), {"oid": org_id})).scalar() or 0
            rate = round((matches_cnt / settle_cnt * 100.0), 1) if settle_cnt > 0 else 0.0

            rows = (await db.execute(text("""
                SELECT settlement_id, settlement_date, net_amount_paise, utr
                FROM settlements
                WHERE organization_id = :oid
                ORDER BY settlement_date DESC LIMIT 50;
            """), {"oid": org_id})).fetchall()

            return {
                "kpi_id": "match_rate",
                "title": "Gateway-to-Bank Reconciliation Match Rate",
                "formula": "(Verified_Matches / Total_Settlements) * 100.0",
                "data_source_table": "matches & settlements",
                "drilldown_link": "/queue",
                "drilldown_label": "Review Discrepancy Queue",
                "total_contributing_rows": len(rows),
                "explanation": f"{matches_cnt} of {settle_cnt} settlements matched against bank credits with zero float drift ({rate}% match rate).",
                "rows": [
                    {
                        "settlement_ref": r[0],
                        "settlement_date": str(r[1]),
                        "net_amount": f"₹{float(r[2] or 0) / 100.0:,.2f}",
                        "reconciliation_status": "MATCHED" if r[3] else "PENDING_CREDIT"
                    }
                    for r in rows
                ]
            }

        # E: Rupees at Risk / Open Discrepancies
        elif clean_kpi in ["rupees_at_risk", "exceptions", "discrepancies"]:
            rows = (await db.execute(text("""
                SELECT id, check_type, reason_code, amount_paise, status, created_at
                FROM discrepancies 
                WHERE organization_id = :oid AND status = 'OPEN'
                ORDER BY amount_paise DESC;
            """), {"oid": org_id})).fetchall()

            total_risk = sum(float(r[3] or 0) for r in rows) / 100.0

            return {
                "kpi_id": "rupees_at_risk",
                "title": "Money at Risk (Reconciliation Variances)",
                "formula": "SUM(discrepancies.amount_paise WHERE status = 'OPEN')",
                "data_source_table": "discrepancies",
                "drilldown_link": "/queue",
                "drilldown_label": "Investigate Discrepancies",
                "total_contributing_rows": len(rows),
                "explanation": f"Total exposure of ₹{total_risk:,.2f} across {len(rows)} open variances awaiting bank credit or UTR proof.",
                "rows": [
                    {
                        "id": str(r[0])[:8] + "...",
                        "check_type": r[1],
                        "reason": r[2],
                        "amount": f"₹{float(r[3] or 0) / 100.0:,.2f}",
                        "status": r[4],
                        "flagged_at": str(r[5])[:10]
                    }
                    for r in rows
                ]
            }

        # F: Payables Outstanding & Decision Breakdown
        elif clean_kpi in ["payables", "payables_due", "outstanding"]:
            rows = (await db.execute(text("""
                SELECT vendor_name, invoice_number, due_date, net_payable_paise, discount_percentage, criticality, payment_status
                FROM vendor_invoices 
                WHERE organization_id = :oid AND payment_status != 'FULLY_PAID'
                ORDER BY due_date ASC;
            """), {"oid": org_id})).fetchall()

            total_due = sum(float(r[3] or 0) for r in rows) / 100.0

            return {
                "kpi_id": "payables",
                "title": "Open Vendor Liabilities & Payables Queue",
                "formula": "SUM(vendor_invoices.net_payable_paise WHERE payment_status != 'FULLY_PAID')",
                "data_source_table": "vendor_invoices",
                "drilldown_link": "/payables",
                "drilldown_label": "Manage in Decision Queue",
                "total_contributing_rows": len(rows),
                "explanation": f"Total active commercial liability of ₹{total_due:,.2f} evaluated across {len(rows)} invoices.",
                "rows": [
                    {
                        "vendor_name": r[0],
                        "invoice_number": r[1],
                        "due_date": str(r[2]),
                        "amount": f"₹{float(r[3] or 0) / 100.0:,.2f}",
                        "discount": f"{float(r[4] or 0)}%" if r[4] else "—",
                        "criticality": r[5],
                        "status": r[6]
                    }
                    for r in rows
                ]
            }

        # G: Fixed Monthly Burn & Runway
        elif clean_kpi in ["monthly_burn", "burn", "runway"]:
            summary_res = await KPICalculationService.get_cash_liquidity_kpis(org_id, db)
            intel_res = await KPICalculationService.get_all_dashboard_kpis(org_id, db)
            components = intel_res["alerts_activity"].get("upcoming_deadlines", [])

            return {
                "kpi_id": "monthly_burn",
                "title": "Fixed Monthly Operating Burn & Runway",
                "formula": "SUM(bank_transactions.debit_paise WHERE recurring) / Historical_Months",
                "data_source_table": "bank_transactions",
                "drilldown_link": "/sources",
                "drilldown_label": "Inspect Historical Vault",
                "total_contributing_rows": 1,
                "explanation": f"Fixed burn is calibrated at {summary_res['monthly_burn_display']} based on historical debits, yielding {summary_res['runway_months']} months of operating runway.",
                "components": [
                    {"label": "Fixed Monthly Burn", "value": summary_res["monthly_burn_display"]},
                    {"label": "Current Available Cash", "value": summary_res["available_cash_display"]},
                    {"label": "Calculated Operating Runway", "value": f"{summary_res['runway_months']} Months"}
                ]
            }

        # H: Data Health & Cryptographic Hashes
        elif clean_kpi in ["data_health", "sources", "provenance"]:
            rows = (await db.execute(text("""
                SELECT filename, file_type, records_count, sha256_hash, is_historical, created_at
                FROM source_files 
                WHERE organization_id = :oid
                ORDER BY created_at DESC;
            """), {"oid": org_id})).fetchall()

            return {
                "kpi_id": "data_health",
                "title": "Data Health & Cryptographic Vault Provenance",
                "formula": "COUNT(DISTINCT source_files.file_type) * 20 + Cleanliness_Score",
                "data_source_table": "source_files",
                "drilldown_link": "/sources",
                "drilldown_label": "Manage Data Sources",
                "total_contributing_rows": len(rows),
                "explanation": "Every figure in FinOS links to raw source statement files verified by SHA-256 fingerprints.",
                "rows": [
                    {
                        "filename": r[0],
                        "type": "HISTORICAL" if r[4] else r[1],
                        "records": r[2] or 0,
                        "sha256": str(r[3] or "")[:20] + "...",
                        "uploaded_at": str(r[5])[:10]
                    }
                    for r in rows
                ]
            }

        else:
            raise HTTPException(status_code=404, detail=f"No drilldown provider configured for KPI identifier '{kpi_id}'.")


# =========================================================================
# 4. CASH POLICY MANAGEMENT ENDPOINTS (PRESERVED)
# =========================================================================
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
    org_id = str(current_user.organization_id)
    buffer_paise = int(payload.reserve_floor_inr * 100)
    approval_paise = int(payload.approval_threshold_inr * 100)

    async with get_tenant_db(org_id) as db:
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

        KPICacheManager.invalidate(org_id)
        await DashboardEventBroadcaster.broadcast(
            org_id, 
            "policy_updated", 
            {"reserve_floor_inr": payload.reserve_floor_inr, "mode": payload.buffer_policy_type}
        )
        
        return {
            "status": "SUCCESS",
            "message": "Custom Emergency Reserve policy updated successfully.",
            "reserve_floor_inr": payload.reserve_floor_inr,
            "reserve_floor_display": f"₹{payload.reserve_floor_inr:,.2f}",
            "buffer_policy_type": payload.buffer_policy_type
        }


# =========================================================================
# 5. LEGACY GET / DASHBOARD ENDPOINT (ENRICHED & BACKWARDS COMPATIBLE)
# =========================================================================
@router.get("/", status_code=status.HTTP_200_OK)
async def get_dashboard_metrics(current_user: UserModel = Depends(get_current_user)):
    org_id = str(current_user.organization_id)
    async with get_tenant_db(org_id) as db:
        kpis = await KPICalculationService.get_all_dashboard_kpis(org_id, db, period_days=30)
        c = kpis["cash_liquidity"]
        r = kpis["reconciliation"]
        h = kpis["data_health"]

        return {
            "total_transactions_processed": r["total_bank_lines_evaluated"] + r["total_settlements_evaluated"],
            "match_rate": f"{r['overall_match_rate_pct']}%",
            "match_rate_raw": r["overall_match_rate_pct"],
            "open_exceptions_count": r["open_exceptions_count"],
            "rupees_at_risk": r["rupees_at_risk_inr"],
            "rupees_at_risk_display": r["rupees_at_risk_display"],
            "available_bank_cash": c["available_cash_display"],
            "available_bank_cash_raw": c["available_cash_inr"],
            "emergency_reserve_floor": c["emergency_reserve_display"],
            "emergency_reserve_floor_raw": c["emergency_reserve_inr"],
            "policy_label": f"Policy: {c['buffer_policy_type']}",
            "safe_payment_capacity": c["safe_capacity_display"],
            "safe_payment_capacity_raw": c["safe_capacity_inr"],
            "headroom_status": "AVAILABLE" if c["safe_capacity_inr"] > 0 else "DEFICIT",
            "verification_status": r["reconciliation_status"],
            "sources_count": h["connected_sources_count"]
        }


# =========================================================================
# 6. REAL-TIME SERVER-SENT EVENTS (SSE) STREAMING ENDPOINT
# =========================================================================
async def authenticate_stream_user(
    token_query: Optional[str] = Query(None, alias="token"),
    auth_header: Optional[str] = Depends(lambda: None)
) -> str:
    token = token_query
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required for live stream")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        org_id = payload.get("org_id")
        if not org_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload: missing org_id")
        return str(org_id)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.get("/stream", status_code=status.HTTP_200_OK)
async def dashboard_realtime_stream(
    org_id: str = Depends(authenticate_stream_user)
):
    queue = await DashboardEventBroadcaster.subscribe(org_id)

    async def event_generator():
        init_payload = json.dumps({
            "event": "connected",
            "organization_id": org_id,
            "server_time": datetime.utcnow().isoformat(),
            "message": "FinOS Live SSE Channel Active"
        })
        yield f"event: connected\ndata: {init_payload}\n\n"

        try:
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: {msg['event']}\ndata: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    yield f": keep-alive {datetime.utcnow().isoformat()}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await DashboardEventBroadcaster.unsubscribe(org_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
    )

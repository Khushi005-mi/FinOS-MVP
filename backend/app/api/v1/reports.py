from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, desc
import logging

from app.db.session import get_tenant_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.models.source_file import SourceFileModel
from app.models.transaction import BankTransactionModel, SettlementModel
from app.models.discrepancy import MatchModel, DiscrepancyModel
from app.models.cash import CashPolicy
from app.core.security import require_role
from app.services.pdf_generator import EvidencePackGenerator

logger = logging.getLogger("finos.reports")

router = APIRouter(prefix="/reports", tags=["Evidence Packs & Reports (F10)"])

@router.get("/evidence-pack/{period_start}/{period_end}", status_code=status.HTTP_200_OK)
async def download_evidence_pack(
    period_start: str,
    period_end: str,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """
    F10: One-click Audit Evidence Pack PDF generation.
    Retrieves live database metrics, source file SHA-256 hashes, open exceptions,
    and audit logs, streaming an audit-ready PDF directly to the client.
    """
    org_id = current_user.organization_id
    async with get_tenant_db(str(org_id)) as db:
        # 1. Fetch organization profile
        org_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == org_id))
        org = org_res.scalars().first()
        org_name = org.name if org else "FinOS Workspace"
        org_gstin = getattr(org, 'gstin', None)
        org_pan = getattr(org, 'pan', None)

        # 2. Bank Cash & Emergency Reserve
        latest_bank_res = await db.execute(
            select(BankTransactionModel)
            .where(
                BankTransactionModel.organization_id == org_id,
                BankTransactionModel.balance_paise.isnot(None),
                BankTransactionModel.balance_paise > 0
            )
            .order_by(desc(BankTransactionModel.date), desc(BankTransactionModel.created_at))
            .limit(1)
        )
        latest_bank = latest_bank_res.scalars().first()
        available_bank_cash = (float(latest_bank.balance_paise) / 100.0) if latest_bank else 0.0

        policy_res = await db.execute(select(CashPolicy).where(CashPolicy.organization_id == org_id).limit(1))
        policy = policy_res.scalars().first()
        reserve_inr = (float(policy.min_liquidity_buffer_paise) / 100.0) if (policy and policy.min_liquidity_buffer_paise) else 400000.0
        policy_mode = policy.buffer_policy_type if policy else "Default Reserve"
        safe_capacity = max(0.0, available_bank_cash - reserve_inr)

        # 3. Transaction Counts & Reconciliation Match Rate
        bank_count = (await db.execute(text("SELECT count(*) FROM bank_transactions WHERE organization_id = :oid;"), {"oid": org_id})).scalar() or 0
        settle_count = (await db.execute(text("SELECT count(*) FROM settlements WHERE organization_id = :oid;"), {"oid": org_id})).scalar() or 0
        total_txns = bank_count + settle_count

        matches_count = (await db.execute(text("SELECT count(*) FROM matches WHERE organization_id = :oid;"), {"oid": org_id})).scalar() or 0
        match_rate_pct = (matches_count * 2 / total_txns * 100.0) if total_txns > 0 else 0.0

        # 4. Open Discrepancies
        disc_res = await db.execute(
            select(DiscrepancyModel)
            .where(DiscrepancyModel.organization_id == org_id, DiscrepancyModel.status == "OPEN")
            .limit(25)
        )
        disc_list = disc_res.scalars().all()
        rupees_at_risk_paise = sum(float(d.amount_paise or 0) for d in disc_list)

        discrepancies = []
        for d in disc_list:
            discrepancies.append({
                "check_type": d.check_type or "Check 2 Reconciliation",
                "reason_code": d.reason_code or "Variance Detected",
                "amount_display": f"₹{float(d.amount_paise or 0) / 100:,.2f}",
                "status": d.status or "OPEN"
            })

        # 5. Vault Sources Cryptographic Hashes (Safe COALESCE query)
        vault_res = await db.execute(text("""
            SELECT 
                COALESCE(filename, split_part(file_path, '_', 2), file_path, 'statement.csv') AS filename,
                COALESCE(file_type, source_type, 'DATA') AS file_type,
                COALESCE(records_count, row_count, 0) AS records_count,
                COALESCE(sha256_hash, file_hash, 'UNHASHED') AS sha256_hash
            FROM source_files 
            WHERE organization_id = :oid;
        """), {"oid": org_id})
        source_hashes = [
            {
                "filename": str(r[0]),
                "file_type": str(r[1]),
                "records_count": int(r[2] or 0),
                "sha256_hash": str(r[3])
            }
            for r in vault_res.fetchall()
        ]

        # 6. Audit Trail Compliance Log (Corrected column name: timestamp)
        audit_res = await db.execute(text("""
            SELECT timestamp, action, table_name, new_value_json
            FROM audit_events
            WHERE organization_id = :oid
            ORDER BY timestamp DESC
            LIMIT 10;
        """), {"oid": org_id})
        audit_trail = [
            {
                "created_at": str(a[0]),
                "action": str(a[1]),
                "table_name": str(a[2] or "SYSTEM"),
                "details": str(a[3])[:45] if a[3] else "Action logged"
            }
            for a in audit_res.fetchall()
        ]

        metrics = {
            "available_bank_cash": available_bank_cash,
            "emergency_reserve": reserve_inr,
            "policy_mode": policy_mode,
            "safe_capacity": safe_capacity,
            "total_transactions": total_txns,
            "match_rate": f"{round(match_rate_pct, 1)}%",
            "open_exceptions_count": len(discrepancies),
            "rupees_at_risk": rupees_at_risk_paise / 100.0
        }

        # 7. Generate PDF via ReportLab
        try:
            pdf_bytes = EvidencePackGenerator.generate_evidence_pdf(
                org_name=org_name,
                gstin=org_gstin,
                pan=org_pan,
                period_label=f"{period_start} to {period_end}",
                metrics=metrics,
                discrepancies=discrepancies,
                source_hashes=source_hashes,
                audit_trail=audit_trail
            )
        except Exception as e:
            logger.error(f"Evidence pack PDF generation failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"PDF evidence pack generation failed: {str(e)}")

        safe_filename = f"FinOS_Evidence_Pack_{org_name.replace(' ', '_')}_{period_start}_to_{period_end}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={safe_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_tenant_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.models.source_file import SourceFileModel
from app.models.transaction import BankTransactionModel, SettlementModel
from app.models.discrepancy import MatchModel, DiscrepancyModel
from app.core.security import require_role
from app.services.pdf_generator import EvidencePackGenerator

router = APIRouter(prefix="/reports", tags=["Evidence Packs & Reports (F10)"])

@router.get("/evidence-pack/{period_start}/{period_end}", status_code=status.HTTP_200_OK)
async def download_evidence_pack(
    period_start: str,
    period_end: str,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """
    F10: One-click PDF Evidence Pack generation. Gathers verified database metrics,
    source file SHA-256 hashes, and open exceptions with exact source lineage,
    returning an audit-ready PDF. Accessible by all roles (including auditor/viewer).
    """
    async with get_tenant_db(str(current_user.organization_id)) as db:
        org_id = current_user.organization_id

        # 1. Fetch organization business profile (Name, GSTIN)
        org_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == org_id))
        org = org_res.scalars().first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # 2. Gather Summary Metrics for the Report
        bank_count_res = await db.execute(select(func.count(BankTransactionModel.id)).where(BankTransactionModel.organization_id == org_id))
        total_banks = bank_count_res.scalar() or 0

        settle_count_res = await db.execute(select(func.count(SettlementModel.id)).where(SettlementModel.organization_id == org_id))
        total_settlements = settle_count_res.scalar() or 0
        total_transactions = total_banks + total_settlements

        match_count_res = await db.execute(select(func.count(MatchModel.id)).where(MatchModel.organization_id == org_id))
        total_matches = match_count_res.scalar() or 0
        match_rate_pct = (total_matches * 2 / total_transactions * 100) if total_transactions > 0 else 0.0

        open_disc_res = await db.execute(
            select(func.count(DiscrepancyModel.id), func.sum(DiscrepancyModel.amount_paise))
            .where(DiscrepancyModel.organization_id == org_id, DiscrepancyModel.status == "OPEN")
        )
        disc_row = open_disc_res.one_or_none()
        open_exceptions_count = disc_row[0] if disc_row and disc_row[0] else 0
        rupees_at_risk_paise = disc_row[1] if disc_row and disc_row[1] else 0

        metrics = {
            "total_transactions": total_transactions,
            "match_rate": f"{round(match_rate_pct, 1)}%",
            "open_exceptions_count": open_exceptions_count,
            "rupees_at_risk": int(rupees_at_risk_paise) / 100
        }

        # 3. Gather Open Discrepancies with Exact Source Lineage for the Report
        disc_query_res = await db.execute(
            select(DiscrepancyModel)
            .where(DiscrepancyModel.organization_id == org_id, DiscrepancyModel.status == "OPEN")
            .limit(50)
        )
        
        discrepancies = []
        for d in disc_query_res.scalars().all():
            payload = d.evidence_payload or {}
            source_filename = payload.get("filename", "Vault Source")
            row_index = payload.get("row_index", "N/A")

            discrepancies.append({
                "check_type": d.check_type,
                "reason_code": d.reason_code,
                "amount_display": f"₹{int(d.amount_paise) / 100:,.2f}",
                "status": d.status,
                "source_filename": source_filename,
                "row_index": row_index
            })

        # 4. Gather Immutable Source File SHA-256 Hashes (Provenance)
        vault_res = await db.execute(select(SourceFileModel).where(SourceFileModel.organization_id == org_id))
        source_hashes = [
            {
                "filename": f.file_path.split("/")[-1].split("_", 1)[-1],
                "file_type": f.file_type,
                "sha256_hash": f.sha256_hash
            }
            for f in vault_res.scalars().all()
        ]

        # 5. Generate PDF Bytes via ReportLab Generator
        try:
            pdf_bytes = EvidencePackGenerator.generate_evidence_pdf(
                org_name=org.name,
                gstin=org.gstin or "N/A",
                period_label=f"{period_start} to {period_end}",
                metrics=metrics,
                discrepancies=discrepancies,
                source_hashes=source_hashes
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF evidence pack generation failed: {str(e)}")

        # 6. Stream PDF byte response with download headers
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=FinOS_Evidence_Pack_{period_start}_to_{period_end}.pdf"
            }
        )
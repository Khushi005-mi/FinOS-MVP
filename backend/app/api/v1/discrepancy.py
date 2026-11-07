from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.discrepancy import DiscrepancyModel, CaseModel
from app.models.audit import AuditEventModel
from app.core.security import require_role

router = APIRouter(prefix="/discrepancies", tags=["Discrepancy Queue & Cases (F7, F8)"])

class ResolutionRequest(BaseModel):
    status: str
    resolution_text: str
    owner_id: Optional[str] = None

@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def get_discrepancy_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    check_type: Optional[str] = Query(None),
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        query = select(DiscrepancyModel).where(DiscrepancyModel.organization_id == current_user.organization_id)

        if status_filter:
            query = query.where(DiscrepancyModel.status == status_filter)
        if check_type:
            query = query.where(DiscrepancyModel.check_type == check_type)

        query = query.order_by(desc(DiscrepancyModel.amount_paise))
        result = await db.execute(query)
        discrepancies = result.scalars().all()

        return {
            "total_count": len(discrepancies),
            "discrepancies": [
                {
                    "id": str(d.id),
                    "check_type": d.check_type,
                    "reason_code": d.reason_code,
                    "amount_paise": int(d.amount_paise),
                    "amount_display": f"₹{int(d.amount_paise) / 100:,.2f}",
                    "status": d.status,
                    "evidence_payload": d.evidence_payload,
                    "owner_id": str(d.owner_id) if d.owner_id else None,
                    "created_at": d.created_at.isoformat() if d.created_at else None
                }
                for d in discrepancies
            ]
        }

@router.get("/{discrepancy_id}", status_code=status.HTTP_200_OK)
async def get_discrepancy_detail(
    discrepancy_id: str,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        res = await db.execute(
            select(DiscrepancyModel).where(
                DiscrepancyModel.id == discrepancy_id,
                DiscrepancyModel.organization_id == current_user.organization_id
            )
        )
        d = res.scalars().first()
        if not d:
            raise HTTPException(status_code=404, detail="Discrepancy not found")

        case_res = await db.execute(select(CaseModel).where(CaseModel.discrepancy_id == d.id))
        case = case_res.scalars().first()

        audit_records = []
        try:
            audit_res = await db.execute(
                select(AuditEventModel)
                .where(AuditEventModel.record_id == d.id)
                .order_by(desc(AuditEventModel.timestamp))
            )
            audit_events = audit_res.scalars().all()
            audit_records = [
                {
                    "action": a.action,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                    "new_value": a.new_value_json
                }
                for a in audit_events
            ]
        except Exception:
            audit_records = []

        payload = d.evidence_payload or {}

        return {
            "id": str(d.id),
            "check_type": d.check_type,
            "reason_code": d.reason_code,
            "status": d.status,
            "risk_level": "CRITICAL" if int(d.amount_paise) > 10000000 else "HIGH",
            "amount_paise": int(d.amount_paise),
            "amount_display": f"₹{int(d.amount_paise) / 100:,.2f}",
            "evidence_payload": payload,
            "case": {
                "id": str(case.id) if case else None,
                "status": case.status if case else d.status,
                "resolution": case.resolution if case else None,
                "resolved_at": case.resolved_at.isoformat() if case and case.resolved_at else None
            } if case else None,
            "audit_trail": audit_records
        }

@router.post("/{discrepancy_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_discrepancy_case(
    discrepancy_id: str,
    payload: ResolutionRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        disc_result = await db.execute(
            select(DiscrepancyModel).where(
                DiscrepancyModel.id == discrepancy_id,
                DiscrepancyModel.organization_id == current_user.organization_id
            )
        )
        discrepancy = disc_result.scalars().first()
        if not discrepancy:
            raise HTTPException(status_code=404, detail="Discrepancy case not found")

        old_status = discrepancy.status
        discrepancy.status = payload.status

        case_result = await db.execute(select(CaseModel).where(CaseModel.discrepancy_id == discrepancy.id))
        case = case_result.scalars().first()

        if not case:
            case = CaseModel(
                discrepancy_id=discrepancy.id,
                organization_id=current_user.organization_id,
                status=payload.status,
                owner_id=current_user.id,
                resolution=payload.resolution_text
            )
            db.add(case)
        else:
            case.status = payload.status
            case.resolution = payload.resolution_text

        try:
            audit_event = AuditEventModel(
                organization_id=current_user.organization_id,
                user_id=current_user.id,
                action="RESOLVE_DISCREPANCY_CASE",
                table_name="discrepancies",
                record_id=discrepancy.id,
                old_value_json={"status": old_status},
                new_value_json={"status": payload.status, "notes": payload.resolution_text}
            )
            db.add(audit_event)
        except Exception:
            pass

        await db.commit()

        return {
            "message": "Discrepancy case successfully updated and audited.",
            "discrepancy_id": str(discrepancy.id),
            "status": discrepancy.status
        }

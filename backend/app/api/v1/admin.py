from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.source_file import SourceFileModel
from app.models.audit import AuditEventModel
from app.core.security import require_role

router = APIRouter(prefix="/admin", tags=["Admin Console (F14)"])

@router.get("/failed-jobs", status_code=status.HTTP_200_OK)
async def get_failed_ingestion_jobs(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    """
    F14: Admin Console. Inspects failed-job visibility and data-readiness.
    Restricted strictly to ADMIN role.
    """
    async with get_tenant_db(str(current_user.organization_id)) as db:
        # Fetch files that have row_count as 0 or failed parsing state
        result = await db.execute(
            select(SourceFileModel).where(
                SourceFileModel.organization_id == current_user.organization_id,
                SourceFileModel.row_count == 0
            )
        )
        failed_files = result.scalars().all()
        return {
            "failed_jobs_count": len(failed_files),
            "failed_files": [
                {
                    "file_id": str(f.id),
                    "filename": f.file_path.split("/")[-1],
                    "file_type": f.file_type,
                    "uploaded_at": f.uploaded_at
                }
                for f in failed_files
            ]
        }

@router.get("/run-history", status_code=status.HTTP_200_OK)
async def get_system_run_history(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN]))
):
    """
    F14: Admin Console. Retrieves append-only audit event execution history.
    Restricted strictly to ADMIN role.
    """
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(
            select(AuditEventModel)
            .where(AuditEventModel.organization_id == current_user.organization_id)
            .order_by(desc(AuditEventModel.timestamp))
            .limit(50)
        )
        events = result.scalars().all()
        return {
            "total_audit_events": len(events),
            "history": [
                {
                    "event_id": str(e.id),
                    "action": e.action,
                    "table_name": e.table_name,
                    "record_id": str(e.record_id),
                    "timestamp": e.timestamp
                }
                for e in events
            ]
        }
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.core.security import require_role
from app.services.matching_engine import MatchingEngine

router = APIRouter(prefix="/reconciliation", tags=["Matching Engine & Reconciliation (F6)"])

class RunMatchingRequest(BaseModel):
    check_type: str = "CHECK_2_GATEWAY_TO_BANK"

@router.post("/run-matching", status_code=status.HTTP_200_OK)
async def run_matching_engine(
    payload: RunMatchingRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    """
    F6: Triggers the Check 2 deterministic matching engine.
    Compares gateway settlements against bank statement credits and books.
    """
    if payload.check_type != "CHECK_2_GATEWAY_TO_BANK":
        raise HTTPException(status_code=400, detail="Unsupported check type for MVP pilot.")

    async with get_tenant_db(str(current_user.organization_id)) as db:
        try:
            result = await MatchingEngine.run_check_2_reconciliation(
                organization_id=str(current_user.organization_id),
                db=db
            )
            return {
                "message": "Reconciliation matching engine executed successfully.",
                "check_type": payload.check_type,
                **result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Matching engine execution failed: {str(e)}")
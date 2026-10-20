from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Any

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.audit import AuditEventModel
from app.core.security import require_role
from app.services.qa_engine import GuardedQAEngine

router = APIRouter(prefix="/ask", tags=["Guarded Q&A Assistant (F12)"])

class AskRequest(BaseModel):
    question: str

class KeyFigure(BaseModel):
    label: str
    value_display: str
    calculation: str

class EvidenceItem(BaseModel):
    source_file: str
    file_type: str
    row_number: int
    field_name: str
    value_display: str
    reference: str
    status: str

class ActionCTA(BaseModel):
    label: str
    link: str

class GroundedAskResponse(BaseModel):
    direct_answer: str
    verification_state: str
    key_figures: List[KeyFigure]
    evidence: List[EvidenceItem]
    limitations_or_assumptions: str
    recommended_next_action: str
    action_cta: Optional[ActionCTA] = None

@router.post("/", response_model=GroundedAskResponse, status_code=status.HTTP_200_OK)
async def ask_guarded_question(
    payload: AskRequest,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    """
    F12: ADVANCED GROUNDED FINANCIAL ASSISTANT.
    Answers natural operational questions grounded strictly in verified tenant PostgreSQL records.
    Every answer returns the 6-part structured contract with exact row-level citations.
    Logs each query to the immutable audit trail.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    async with get_tenant_db(str(current_user.organization_id)) as db:
        try:
            result = await GuardedQAEngine.answer_guarded_question(
                question=payload.question,
                organization_id=str(current_user.organization_id),
                db=db,
                user_id=str(current_user.id)
            )

            # Log query to append-only audit trail
            audit_event = AuditEventModel(
                organization_id=current_user.organization_id,
                user_id=current_user.id,
                action="GUARDED_ASK_QUERY",
                table_name="ask_queries",
                record_id=current_user.id,
                new_value_json={
                    "query": payload.question,
                    "verification_state": result.get("verification_state"),
                    "key_figures_count": len(result.get("key_figures", [])),
                    "evidence_count": len(result.get("evidence", []))
                }
            )
            db.add(audit_event)
            await db.commit()

            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Assistant verification failed: {str(e)}")
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from app.db.session import get_tenant_db
from app.models.client import UserModel
from app.models.audit import AuditEventModel
from app.core.security import get_current_user
from app.services.qa_engine import GuardedQAEngine

logger = logging.getLogger("finos.ask")

router = APIRouter(prefix="/ask", tags=["Guarded AI Financial Query (F12)"])

class AskRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    prompt: Optional[str] = None

@router.post("/", status_code=status.HTTP_200_OK)
@router.post("", status_code=status.HTTP_200_OK)
async def ask_financial_brain(
    payload: AskRequest,
    current_user: UserModel = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    F12: Guarded Financial Assistant.
    Answers queries strictly grounded in the tenant's verified Render PostgreSQL records.
    Returns structured GroundedResponse with row-level source citations.
    """
    text_query = (payload.question or payload.query or payload.prompt or "").strip()
    if not text_query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="A question string is required."
        )

    org_id = current_user.organization_id
    user_id = current_user.id

    async with get_tenant_db(str(org_id)) as db:
        try:
            response = await GuardedQAEngine.answer_guarded_question(
                question=text_query,
                organization_id=str(org_id),
                db=db,
                user_id=str(user_id)
            )

            # Audit log query for compliance and evaluation
            audit_event = AuditEventModel(
                organization_id=org_id,
                user_id=user_id,
                action="GUARDED_AI_QUERY",
                table_name="ask_audit",
                record_id=user_id,
                new_value_json={
                    "prompt": text_query,
                    "verification_state": response.get("verification_state"),
                    "direct_answer_preview": response.get("direct_answer", "")[:120]
                }
            )
            db.add(audit_event)
            await db.commit()

            return response
        except Exception as e:
            logger.error(f"Error answering guarded question '{text_query}': {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

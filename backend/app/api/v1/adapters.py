from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.source_file import SourceFileModel
from app.models.transaction import BankTransactionModel, SettlementModel, LedgerEntryModel
from app.core.security import require_role
from app.adapters.bank_adapters.hdfc_adapter import HDFCBankAdapter
from app.adapters.gateway_adapters.razorpay_adapter import RazorpayAdapter
from app.adapters.accounting_adapters.tally_adapter import TallyAdapter

router = APIRouter(prefix="/adapters", tags=["Adapters & Ingestion (F3)"])

class ParseRequest(BaseModel):
    file_id: str

@router.post("/parse-hdfc", status_code=status.HTTP_201_CREATED)
async def parse_hdfc_statement(payload: ParseRequest, current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(select(SourceFileModel).where(SourceFileModel.id == payload.file_id, SourceFileModel.organization_id == current_user.organization_id))
        source_file = result.scalars().first()
        if not source_file: raise HTTPException(status_code=404, detail="Source file not found")
        if source_file.file_type != "HDFC_BANK": raise HTTPException(status_code=400, detail="Expected HDFC_BANK file type.")

        with open(source_file.file_path, "rb") as f: file_bytes = f.read()
        filename = source_file.file_path.split("/")[-1]
        if "_" in filename: filename = filename.split("_", 1)[-1]

        parsed_rows = HDFCBankAdapter.parse_statement(file_bytes, filename, str(source_file.id))
        
        for row in parsed_rows:
            txn = BankTransactionModel(
                organization_id=current_user.organization_id,
                source_file_id=source_file.id,
                date=datetime.strptime(row["date"], "%Y-%m-%d").date(),
                narration=row["narration"],
                debit_paise=row["debit_paise"],
                credit_paise=row["credit_paise"],
                balance_paise=row["balance_paise"],
                reference=row["reference"]
            )
            db.add(txn)

        source_file.row_count = len(parsed_rows)
        await db.commit()
        return {"message": "HDFC bank statement successfully parsed and stored.", "total_imported": len(parsed_rows)}

@router.post("/parse-razorpay", status_code=status.HTTP_201_CREATED)
async def parse_razorpay_settlement(payload: ParseRequest, current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(select(SourceFileModel).where(SourceFileModel.id == payload.file_id, SourceFileModel.organization_id == current_user.organization_id))
        source_file = result.scalars().first()
        if not source_file: raise HTTPException(status_code=404, detail="Source file not found")
        if source_file.file_type != "RAZORPAY_GATEWAY": raise HTTPException(status_code=400, detail="Expected RAZORPAY_GATEWAY file type.")

        with open(source_file.file_path, "rb") as f: file_bytes = f.read()
        filename = source_file.file_path.split("/")[-1]
        if "_" in filename: filename = filename.split("_", 1)[-1]

        parsed_rows = RazorpayAdapter.parse_settlement(file_bytes, filename, str(source_file.id))
        
        for row in parsed_rows:
            settle = SettlementModel(
                organization_id=current_user.organization_id,
                source_file_id=source_file.id,
                settlement_id=row["settlement_id"],
                gross_amount_paise=row["gross_amount_paise"],
                fee_paise=row["fee_paise"],
                gst_on_fee_paise=row["gst_on_fee_paise"],
                refunds_paise=row["refunds_paise"],
                holds_paise=row["holds_paise"],
                net_amount_paise=row["net_amount_paise"],
                settlement_date=datetime.strptime(row["settlement_date"], "%Y-%m-%d").date()
            )
            db.add(settle)

        source_file.row_count = len(parsed_rows)
        await db.commit()
        return {"message": "Razorpay settlement report successfully parsed and stored.", "total_imported": len(parsed_rows)}

@router.post("/parse-tally", status_code=status.HTTP_201_CREATED)
async def parse_tally_ledger(payload: ParseRequest, current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(select(SourceFileModel).where(SourceFileModel.id == payload.file_id, SourceFileModel.organization_id == current_user.organization_id))
        source_file = result.scalars().first()
        if not source_file: raise HTTPException(status_code=404, detail="Source file not found")
        if source_file.file_type != "TALLY_LEDGER": raise HTTPException(status_code=400, detail="Expected TALLY_LEDGER file type.")

        with open(source_file.file_path, "rb") as f: file_bytes = f.read()
        filename = source_file.file_path.split("/")[-1]
        if "_" in filename: filename = filename.split("_", 1)[-1]

        parsed_rows = TallyAdapter.parse_export(file_bytes, filename, str(source_file.id))
        
        for row in parsed_rows:
            ledger = LedgerEntryModel(
                organization_id=current_user.organization_id,
                source_file_id=source_file.id,
                voucher_date=datetime.strptime(row["voucher_date"], "%Y-%m-%d").date(),
                voucher_type=row["voucher_type"],
                amount_paise=row["amount_paise"],
                ledger_name=row["ledger_name"]
            )
            db.add(ledger)

        source_file.row_count = len(parsed_rows)
        await db.commit()
        return {"message": "Tally accounting export successfully parsed and stored.", "total_imported": len(parsed_rows)}
import os
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.db.session import get_tenant_db
from app.models.client import UserModel, UserRole
from app.models.source_file import SourceFileModel
from app.models.transaction import BankTransactionModel, SettlementModel, LedgerEntryModel
from app.core.security import require_role
from app.services.vault_service import VaultService
from app.services.matching_engine import MatchingEngine
from app.engine.universal_parser import UniversalFileParser
from app.adapters.bank_adapters.hdfc_adapter import HDFCBankAdapter
from app.adapters.gateway_adapters.razorpay_adapter import RazorpayAdapter
from app.adapters.accounting_adapters.tally_adapter import TallyAdapter

router = APIRouter(prefix="/vault", tags=["Source Vault & Registry (F2)"])

@router.get("/", status_code=status.HTTP_200_OK)
async def list_vault_sources(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(
            select(SourceFileModel)
            .where(SourceFileModel.organization_id == current_user.organization_id)
            .order_by(desc(SourceFileModel.uploaded_at))
        )
        sources = result.scalars().all()
        return {
            "sources": [
                {
                    "file_id": str(f.id),
                    "filename": os.path.basename(f.file_path).split("_", 1)[-1],
                    "file_type": f.file_type,
                    "sha256_hash": f.sha256_hash,
                    "row_count": f.row_count or 0,
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                    "status": "INGESTED" if (f.row_count or 0) > 0 else "STORED"
                }
                for f in sources
            ]
        }

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_source_file(
    file: UploadFile = File(...),
    file_type: str = Form("AUTO_DETECT"),
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER])),
):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid format. Only CSV and Excel files are accepted.")

    async with get_tenant_db(str(current_user.organization_id)) as db:
        try:
            source_file = await VaultService.process_and_store_file(
                file=file,
                file_type=file_type,
                organization_id=str(current_user.organization_id),
                user_id=str(current_user.id),
                db=db
            )

            with open(source_file.file_path, "rb") as f:
                file_bytes = f.read()

            filename = os.path.basename(source_file.file_path)
            clean_filename = filename.split("_", 1)[-1] if "_" in filename else filename

            # 1. Preview rows to auto-detect file type
            raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, clean_filename)
            detected_type = UniversalFileParser.sniff_file_type(raw_rows)

            # Override file_type with detected type to prevent manual misclassification
            effective_type = detected_type if detected_type != "UNKNOWN" else file_type
            source_file.file_type = effective_type

            imported_count = 0

            # 2. Ingest into proper relational table
            if effective_type == "HDFC_BANK":
                parsed_rows = HDFCBankAdapter.parse_statement(file_bytes, clean_filename, str(source_file.id))
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
                imported_count = len(parsed_rows)

            elif effective_type == "RAZORPAY_GATEWAY":
                parsed_rows = RazorpayAdapter.parse_settlement(file_bytes, clean_filename, str(source_file.id))
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
                imported_count = len(parsed_rows)

            elif effective_type == "TALLY_LEDGER":
                parsed_rows = TallyAdapter.parse_export(file_bytes, clean_filename, str(source_file.id))
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
                imported_count = len(parsed_rows)

            source_file.row_count = imported_count
            await db.flush()

            # 3. Automatically run deterministic reconciliation
            recon = await MatchingEngine.run_check_2_reconciliation(
                organization_id=str(current_user.organization_id),
                db=db
            )

            return {
                "message": f"Successfully ingested {imported_count} records as {effective_type}.",
                "file_id": str(source_file.id),
                "filename": clean_filename,
                "detected_type": effective_type,
                "imported_records": imported_count,
                "reconciliation": recon
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@router.get("/{file_id}/rows/{row_index}", status_code=status.HTTP_200_OK)
async def get_vault_file_row_lineage(
    file_id: str,
    row_index: int,
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER, UserRole.VIEWER]))
):
    async with get_tenant_db(str(current_user.organization_id)) as db:
        result = await db.execute(
            select(SourceFileModel).where(
                SourceFileModel.id == file_id,
                SourceFileModel.organization_id == current_user.organization_id
            )
        )
        source_file = result.scalars().first()
        if not source_file:
            raise HTTPException(status_code=404, detail="Source file not found")

        with open(source_file.file_path, "rb") as f:
            file_bytes = f.read()

        base_name = os.path.basename(source_file.file_path)
        filename = base_name.split("_", 1)[-1] if "_" in base_name else base_name
        rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        
        if row_index < 1 or row_index > len(rows):
            target_row = rows[0] if rows else {}
            row_index = 1
        else:
            target_row = rows[row_index - 1]

        return {
            "file_id": str(source_file.id),
            "filename": filename,
            "file_type": source_file.file_type,
            "sha256_hash": source_file.sha256_hash,
            "row_index": row_index,
            "raw_row_data": target_row
        }
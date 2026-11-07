import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from datetime import datetime
import os, sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.source_file import SourceFile
from app.models.transaction import BankTransaction, Settlement, LedgerEntry
from app.adapters.bank_adapters.hdfc_adapter import HDFCBankAdapter
from app.adapters.gateway_adapters.razorpay_adapter import RazorpayAdapter
from app.adapters.accounting_adapters.tally_adapter import TallyAdapter
from app.services.matching_engine import MatchingEngine

async def run_pipeline():
    print("=" * 70)
    print("       STARTING FINOS END-TO-END INGESTION & RECONCILIATION     ")
    print("=" * 70)

    async with AsyncSessionLocal() as db:
        # 1. Classify Files Correctly
        print("\n1. Tagging Vaulted Files with Appropriate Adapter Types...")
        await db.execute(text("UPDATE source_files SET file_type = 'HDFC_BANK', source_type = 'HDFC_BANK' WHERE filename ILIKE '%bank%';"))
        await db.execute(text("UPDATE source_files SET file_type = 'RAZORPAY_GATEWAY', source_type = 'RAZORPAY_GATEWAY' WHERE filename ILIKE '%razorpay%';"))
        await db.execute(text("UPDATE source_files SET file_type = 'TALLY_LEDGER', source_type = 'TALLY_LEDGER' WHERE filename ILIKE '%tally%';"))
        await db.commit()

        # Fetch tagged files
        res = await db.execute(text("SELECT id, organization_id, filename, file_type, file_path, storage_path FROM source_files;"))
        files = res.fetchall()

        org_id = None
        for f in files:
            f_id, f_org_id, f_name, f_type, f_path, s_path = f
            org_id = f_org_id
            real_path = s_path or f_path

            if not os.path.exists(real_path):
                # Check root directory for fallback
                sample_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", f_name))
                if os.path.exists(sample_root):
                    real_path = sample_root

            if not os.path.exists(real_path):
                print(f"  [Skip] Could not locate file {f_name} at {real_path}")
                continue

            with open(real_path, "rb") as fp:
                file_bytes = fp.read()

            if "bank" in f_name.lower():
                print(f"2. Parsing Bank Statement ({f_name})...")
                rows = HDFCBankAdapter.parse_statement(file_bytes, f_name, str(f_id))
                for r in rows:
                    db.add(BankTransaction(
                        organization_id=f_org_id,
                        source_file_id=f_id,
                        date=datetime.strptime(r["date"], "%Y-%m-%d").date(),
                        narration=r["narration"],
                        debit_paise=r["debit_paise"],
                        credit_paise=r["credit_paise"],
                        balance_paise=r["balance_paise"],
                        reference=r["reference"]
                    ))
                print(f"   -> Imported {len(rows)} Bank Transactions.")

            elif "razorpay" in f_name.lower():
                print(f"3. Parsing Gateway Settlements ({f_name})...")
                rows = RazorpayAdapter.parse_settlement(file_bytes, f_name, str(f_id))
                for r in rows:
                    db.add(Settlement(
                        organization_id=f_org_id,
                        source_file_id=f_id,
                        settlement_id=r["settlement_id"],
                        gross_amount_paise=r["gross_amount_paise"],
                        fee_paise=r["fee_paise"],
                        gst_on_fee_paise=r["gst_on_fee_paise"],
                        refunds_paise=r["refunds_paise"],
                        holds_paise=r["holds_paise"],
                        net_amount_paise=r["net_amount_paise"],
                        settlement_date=datetime.strptime(r["settlement_date"], "%Y-%m-%d").date()
                    ))
                print(f"   -> Imported {len(rows)} Gateway Settlements.")

            elif "tally" in f_name.lower():
                print(f"4. Parsing Accounting Ledger ({f_name})...")
                rows = TallyAdapter.parse_export(file_bytes, f_name, str(f_id))
                for r in rows:
                    db.add(LedgerEntry(
                        organization_id=f_org_id,
                        source_file_id=f_id,
                        voucher_date=datetime.strptime(r["voucher_date"], "%Y-%m-%d").date(),
                        voucher_type=r["voucher_type"],
                        amount_paise=r["amount_paise"],
                        ledger_name=r["ledger_name"]
                    ))
                print(f"   -> Imported {len(rows)} Ledger Entries.")

        await db.commit()

        # 5. Run Matching Engine
        if org_id:
            print("\n5. Running Check 2 Deterministic Matching Engine...")
            recon_res = await MatchingEngine.run_check_2_reconciliation(str(org_id), db)
            print("   Reconciliation Results:", recon_res)

    print("\n" + "=" * 70)
    print("          INGESTION & RECONCILIATION COMPLETED SUCCESSFULLY     ")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_pipeline())

import asyncio
from datetime import datetime
import os, sys, uuid, hashlib

# Ensure backend is in sys.path
sys.path.insert(0, os.path.abspath("backend"))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
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
        # 1. Fetch Tenant Context (Organization and User)
        org_res = await db.execute(text("SELECT id FROM organizations LIMIT 1;"))
        org_row = org_res.first()
        if not org_row:
            print("ERROR: No organization found in Render PostgreSQL.")
            return
        org_id = org_row[0]

        user_res = await db.execute(text("SELECT id FROM users WHERE organization_id = :org_id LIMIT 1;"), {"org_id": org_id})
        user_row = user_res.first()
        user_id = user_row[0] if user_row else None
        print(f"Target Organization: {org_id}")
        print(f"Target User:         {user_id}")

        # 2. Clean Existing Data to Ensure Idempotency
        await db.execute(text("DELETE FROM matches WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.execute(text("DELETE FROM discrepancies WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.execute(text("DELETE FROM bank_transactions WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.execute(text("DELETE FROM settlements WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.execute(text("DELETE FROM ledger_entries WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.execute(text("DELETE FROM source_files WHERE organization_id = :org_id;"), {"org_id": org_id})
        await db.commit()

        # 3. File Discovery Helper
        def find_file(name_keyword):
            search_paths = [
                os.path.abspath("."),
                os.path.abspath("backend"),
                os.path.abspath("backend/vault_storage")
            ]
            for p in search_paths:
                if os.path.exists(p):
                    for fname in os.listdir(p):
                        if name_keyword.lower() in fname.lower() and fname.endswith(".csv"):
                            return os.path.join(p, fname), fname
            return None, None

        # 4. Canonical Vault Ingestion
        async def register_vault_file(filename, file_type, file_bytes, path):
            f_id = uuid.uuid4()
            f_hash = hashlib.sha256(file_bytes).hexdigest()
            f_size = len(file_bytes)
            lines = file_bytes.decode("utf-8", errors="ignore").strip().splitlines()
            cnt = max(0, len(lines) - 1) if lines else 0

            sf = SourceFile(
                id=f_id,
                organization_id=org_id,
                filename=filename,
                source_type=file_type,
                file_hash=f_hash,
                file_size=f_size,
                records_count=cnt,
                storage_path=path,
                status="PROCESSED",
                uploaded_by=user_id
            )
            db.add(sf)
            await db.commit()
            await db.refresh(sf)
            return sf.id

        # --- A. HDFC BANK STATEMENT ---
        bank_path, bank_fname = find_file("bank")
        if bank_path:
            with open(bank_path, "rb") as f:
                b_bytes = f.read()
            bank_file_id = await register_vault_file(bank_fname, "HDFC_BANK", b_bytes, bank_path)
            print(f"\n1. Ingested {bank_fname} into Vault (Source ID: {bank_file_id})")

            rows = HDFCBankAdapter.parse_statement(b_bytes, bank_fname, str(bank_file_id))
            print(f"   Adapter extracted {len(rows)} raw bank rows.")
            for r in rows:
                date_val = r["date"] if hasattr(r["date"], "strftime") else datetime.strptime(str(r["date"]), "%Y-%m-%d").date()
                db.add(BankTransaction(
                    organization_id=org_id,
                    source_file_id=bank_file_id,
                    date=date_val,
                    narration=r["narration"],
                    debit_paise=r.get("debit_paise", 0),
                    credit_paise=r.get("credit_paise", 0),
                    balance_paise=r.get("balance_paise", 0),
                    reference=r.get("reference"),
                    reference_number=r.get("reference")
                ))
            await db.commit()
            print(f"   Successfully imported {len(rows)} Bank Transactions.")

        # --- B. RAZORPAY GATEWAY SETTLEMENTS ---
        rzp_path, rzp_fname = find_file("razorpay")
        if rzp_path:
            with open(rzp_path, "rb") as f:
                r_bytes = f.read()
            rzp_file_id = await register_vault_file(rzp_fname, "RAZORPAY_GATEWAY", r_bytes, rzp_path)
            print(f"\n2. Ingested {rzp_fname} into Vault (Source ID: {rzp_file_id})")

            rows = RazorpayAdapter.parse_settlement(r_bytes, rzp_fname, str(rzp_file_id))
            print(f"   Adapter extracted {len(rows)} raw settlement rows.")
            for r in rows:
                s_date = r["settlement_date"] if hasattr(r["settlement_date"], "strftime") else datetime.strptime(str(r["settlement_date"]), "%Y-%m-%d").date()
                db.add(Settlement(
                    organization_id=org_id,
                    source_file_id=rzp_file_id,
                    settlement_id=r.get("settlement_id"),
                    gross_amount_paise=r.get("gross_amount_paise", 0),
                    fee_paise=r.get("fee_paise", 0),
                    gst_on_fee_paise=r.get("gst_on_fee_paise", 0),
                    refunds_paise=r.get("refunds_paise", 0),
                    holds_paise=r.get("holds_paise", 0),
                    net_amount_paise=r.get("net_amount_paise", 0),
                    settlement_date=s_date
                ))
            await db.commit()
            print(f"   Successfully imported {len(rows)} Gateway Settlements.")

        # --- C. TALLY ACCOUNTING LEDGER ---
        tally_path, tally_fname = find_file("tally")
        if tally_path:
            with open(tally_path, "rb") as f:
                t_bytes = f.read()
            tally_file_id = await register_vault_file(tally_fname, "TALLY_LEDGER", t_bytes, tally_path)
            print(f"\n3. Ingested {tally_fname} into Vault (Source ID: {tally_file_id})")

            tally_data = TallyAdapter.parse_export(t_bytes, tally_fname, str(tally_file_id))
            ledger_rows = tally_data.get("ledger_entries", [])
            print(f"   Adapter extracted {len(ledger_rows)} raw ledger entries.")
            for r in ledger_rows:
                v_date = r["voucher_date"] if hasattr(r["voucher_date"], "strftime") else datetime.strptime(str(r["voucher_date"]), "%Y-%m-%d").date()
                db.add(LedgerEntry(
                    organization_id=org_id,
                    source_file_id=tally_file_id,
                    voucher_date=v_date,
                    voucher_type=r.get("voucher_type"),
                    amount_paise=r.get("amount_paise", 0),
                    ledger_name=r.get("ledger_name")
                ))
            await db.commit()
            print(f"   Successfully imported {len(ledger_rows)} Ledger Entries.")

        # --- D. CHECK 2 RECONCILIATION MATCHING ENGINE ---
        print("\n4. Executing Check 2 Deterministic 3-Way Matching Engine...")
        recon_res = await MatchingEngine.run_check_2_reconciliation(str(org_id), db)
        print("\n" + "=" * 70)
        print("                   RECONCILIATION AUDIT SUMMARY                 ")
        print("=" * 70)
        print(f"  • Total Gateway Settled:   ₹{recon_res.get('total_settled_paise', 0)/100:,.2f}")
        print(f"  • Total Bank Matched:      ₹{recon_res.get('total_matched_paise', 0)/100:,.2f}")
        print(f"  • Discrepancies Detected:  {recon_res.get('discrepancies_count', 0)}")
        print(f"  • Check 2 Match Rate:      {recon_res.get('match_rate_percentage', 0.0):.1f}%")

    # 5. Live State Verification
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        print("\n=== LIVE RENDER POSTGRESQL VERIFIED STATE ===")
        for tbl in ['source_files', 'bank_transactions', 'settlements', 'ledger_entries', 'matches', 'discrepancies']:
            cnt = (await conn.execute(text(f'SELECT count(*) FROM {tbl};'))).scalar()
            print(f"  • {tbl:<22}: {cnt} rows")
    await engine.dispose()
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_pipeline())

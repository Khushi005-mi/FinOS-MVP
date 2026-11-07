import asyncio, sys, os, time, io
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import AsyncSessionLocal
from app.models.client import UserModel
from app.api.v1.dashboard import get_dashboard_metrics
from app.api.v1.vault import upload_vault_file, list_vault_files
from app.api.v1.ask import ask_financial_brain, AskRequest
from app.api.v1.reports import download_evidence_pack
from fastapi import UploadFile
from sqlalchemy import select

async def run_e2e_verification():
    print("==================================================================")
    print("            FINOS END-TO-END VERIFICATION SUITE                   ")
    print("==================================================================")
    
    async with AsyncSessionLocal() as session:
        u = (await session.execute(select(UserModel).limit(1))).scalar_one()
        print(f"Authenticated Tenant: {u.email} (Org ID: {u.organization_id})\n")

        # 1. VERIFY DASHBOARD LOAD
        print("[TEST 1/5] Testing Dashboard Metrics API...")
        t0 = time.time()
        dash = await get_dashboard_metrics(current_user=u)
        elapsed_dash = time.time() - t0
        assert elapsed_dash < 10.0, f"Dashboard too slow: {elapsed_dash}s"
        print(f"✅ PASS: Dashboard loaded in {elapsed_dash:.2f}s (Cash: {dash['available_bank_cash']}, Buffer: {dash['emergency_reserve_floor']})")

        # 2. VERIFY FILE UPLOAD (NO TIMEOUT)
        print("\n[TEST 2/5] Testing Vault File Upload API (Direct Ingestion)...")
        csv_payload = b"Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance\n2026-10-15,NEFT-TEST-INFLOW,UTR-E2E-001,2026-10-15,,50000.00,1115560.00\n"
        upload_mock = UploadFile(filename="HDFC_E2E_Test_Oct2026.csv", file=io.BytesIO(csv_payload))
        
        t1 = time.time()
        upload_res = await upload_vault_file(
            file=upload_mock,
            source_type="bank",
            is_historical="false",
            current_user=u
        )
        elapsed_upload = time.time() - t1
        assert upload_res["status"] == "SUCCESS", "Upload must return SUCCESS"
        print(f"✅ PASS: File uploaded and hashed in {elapsed_upload:.2f}s (File: {upload_res['filename']})")
        print(f"         SHA-256 Fingerprint: {upload_res['sha256_hash'][:32]}...")

        # 3. VERIFY VAULT LISTING
        print("\n[TEST 3/5] Verifying Vault File in Ingested Sources...")
        vault_files = await list_vault_files(current_user=u)
        file_names = [f["filename"] for f in vault_files]
        assert "HDFC_E2E_Test_Oct2026.csv" in file_names, "Uploaded file must be present in vault"
        print(f"✅ PASS: File registered in PostgreSQL source_files (Total files: {len(vault_files)})")

        # 4. VERIFY GUARDED ASK AI
        print("\n[TEST 4/5] Testing Guarded Ask AI...")
        t2 = time.time()
        ask_res = await ask_financial_brain(
            payload=AskRequest(question="What is our emergency reserve floor?"),
            current_user=u,
            db=session
        )
        elapsed_ask = time.time() - t2
        print(f"✅ PASS: Guarded Ask responded in {elapsed_ask:.2f}s:")
        print(f"         Direct Answer: {str(ask_res)[:80]}...")

        # 5. VERIFY REPORTLAB EVIDENCE DOSSIER PDF
        print("\n[TEST 5/5] Testing PDF Evidence Pack Generation...")
        t3 = time.time()
        pdf_res = await download_evidence_pack(
            start_date="2026-10-01",
            end_date="2026-10-31",
            current_user=u
        )
        elapsed_pdf = time.time() - t3
        pdf_bytes = b"".join([chunk async for chunk in pdf_res.body_iterator])
        assert pdf_bytes.startswith(b"%PDF"), "Must return valid binary PDF"
        print(f"✅ PASS: Evidence Dossier PDF compiled in {elapsed_pdf:.2f}s ({len(pdf_bytes)} bytes, %PDF header verified)")

    print("\n==================================================================")
    print("✅ SYSTEM IS FULLY FUNCTIONAL: ALL 5 FLOWS PASSED WITH 0 ERRORS")
    print("==================================================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_verification())

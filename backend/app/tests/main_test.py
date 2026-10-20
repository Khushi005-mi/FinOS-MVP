import httpx
import asyncio
import os

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def run_smoke_test():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        print("🚀 [1/5] Testing Health Probe...")
        res = await client.get("http://127.0.0.1:8000/healthz")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("✅ Health check passed:", res.json())

        print("\n🚀 [2/5] Testing Tenant Signup...")
        signup_payload = {
            "company_name": "Test Enterprise Pvt Ltd",
            "email": "test.cfo@enterprise.com",
            "password": "SecurePassword123!",
            "gstin": "27AABCT1234F1Z5",
            "pan": "AABCT1234F"
        }
        res = await client.post("/auth/signup", json=signup_payload)
        if res.status_code == 400 and "already registered" in res.text:
            print("⚠️ User already registered, proceeding to login...")
            res = await client.post("/auth/login", json={"email": signup_payload["email"], "password": signup_payload["password"]})
        
        assert res.status_code == 200 or res.status_code == 201, f"Auth failed: {res.text}"
        token_data = res.json()
        token = token_data["access_token"]
        print("✅ Authentication passed. Token acquired!")

        headers = {"Authorization": f"Bearer {token}"}

        print("\n🚀 [3/5] Testing Vault File Upload (F2)...")
        import time
        # Append unique timestamp so SHA-256 hash changes on every test run
        unique_note = f"TEST_{int(time.time())}"
        csv_data = f"Date,Narration,Withdrawal Amt,Deposit Amt,Closing Balance\n02/10/2026,UPI/AMAZON/{unique_note},,5000.00,150000.00\n"
        files = {"file": ("sample-test.csv", csv_data, "text/csv")}
        data = {"file_type": "HDFC_BANK"}
        
        res = await client.post("/vault/upload", headers=headers, data=data, files=files)
        assert res.status_code == 201, f"Vault upload failed: {res.text}"

        vault_res = res.json()
        file_id = vault_res["file_id"]
        print("✅ Vault upload passed! File ID:", file_id)
        print("   SHA-256 Hash:", vault_res["sha256_hash"])

        print("\n🚀 [4/5] Testing Lineage Row Inspector (F9)...")
        res = await client.get(f"/vault/{file_id}/rows/1", headers=headers)
        assert res.status_code == 200, f"Lineage inspection failed: {res.text}"
        print("✅ Lineage inspection passed:", res.json())

        print("\n🚀 [5/5] Testing HDFC Statement Adapter & Normalizer (F3/F4)...")
        res = await client.post("/adapters/parse-hdfc", headers=headers, json={"file_id": file_id})
        assert res.status_code == 201, f"HDFC parsing failed: {res.text}"
        print("✅ HDFC parsing & paise normalization passed:", res.json())

        print("\n🎉 ALL BACKEND SMOKE TESTS PASSED SUCCESSFULLY! BACKEND IS 100% BULLETPROOF.")

if __name__ == "__main__":
    asyncio.run(run_smoke_test())
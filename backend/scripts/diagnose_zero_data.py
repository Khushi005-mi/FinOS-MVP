import asyncio, sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import AsyncSessionLocal
from app.models.client import UserModel, OrganizationModel
from app.api.v1.dashboard import get_dashboard_metrics
from app.api.v1.payables import get_payment_decision_queue
from sqlalchemy import select, text

async def diagnose_all_engines():
    print("==================================================================")
    print("        FINOS DATA & CALCULATION ENGINE DIAGNOSTIC                ")
    print("==================================================================")

    async with AsyncSessionLocal() as session:
        # 1. Inspect all users and organizations
        users_res = await session.execute(text("SELECT id, email, organization_id, role FROM users;"))
        all_users = users_res.fetchall()
        print(f"\n1. USERS & TENANT WORKSPACES ({len(all_users)} users found):")
        for u in all_users:
            print(f"   - User: {u[1]} | Org ID: {u[2]} | Role: {u[3]}")

        # 2. Check table row counts across organizations
        print("\n2. CANONICAL DATABASE TABLE ROW COUNTS:")
        tables = [
            "organizations", "users", "source_files", "bank_transactions", 
            "settlements", "ledger_entries", "vendor_invoices", 
            "customer_receivables", "cash_policies", "matches", 
            "discrepancies", "cases", "vendor_policy_overrides"
        ]
        for tbl in tables:
            try:
                cnt = (await session.execute(text(f"SELECT count(*) FROM {tbl};"))).scalar()
                print(f"   - {tbl:25}: {cnt} rows")
            except Exception as e:
                print(f"   - {tbl:25}: ERROR ({e})")

        # 3. Test API Payload for the first active user
        first_user = (await session.execute(select(UserModel).limit(1))).scalar_one()
        print(f"\n3. TESTING API OUTPUT FOR TENANT: {first_user.email} ({first_user.organization_id})")
        
        # Test Dashboard API
        try:
            dash = await get_dashboard_metrics(current_user=first_user)
            print("   [DASHBOARD API OUTPUT]:")
            for k, v in dash.items():
                print(f"      • {k}: {v}")
        except Exception as e:
            print(f"   ❌ Dashboard API Error: {e}")

        # Test Payables Decision Queue API
        try:
            pq = await get_payment_decision_queue(current_user=first_user, db=session)
            print(f"\n   [PAYABLES DECISION ENGINE OUTPUT]:")
            print(f"      • Available Bank Cash: ₹{pq.available_bank_cash_inr:,.2f}")
            print(f"      • Emergency Floor:     ₹{pq.emergency_reserve_floor_inr:,.2f}")
            print(f"      • Safe Payout Capacity:₹{pq.safe_payment_capacity_inr:,.2f}")
            print(f"      • Total Bills in Queue:{len(pq.items)}")
            print(f"      • Recommended Pay Now: {pq.recommended_pay_now_count}")
        except Exception as e:
            print(f"   ❌ Payables Engine Error: {e}")

        # 4. Check Reconciled Matches & Discrepancies
        print("\n4. 3-WAY RECONCILIATION & DISCREPANCY ENGINE:")
        try:
            disc_cnt = (await session.execute(text("SELECT count(*) FROM discrepancies WHERE organization_id = :oid;"), {"oid": first_user.organization_id})).scalar()
            match_cnt = (await session.execute(text("SELECT count(*) FROM matches WHERE organization_id = :oid;"), {"oid": first_user.organization_id})).scalar()
            print(f"   - Reconciled Matches in DB:      {match_cnt}")
            print(f"   - Flagged Discrepancies in DB:   {disc_cnt}")
        except Exception as e:
            print(f"   ❌ Reconciliation Check Error: {e}")

    print("\n==================================================================")

if __name__ == "__main__":
    asyncio.run(diagnose_all_engines())

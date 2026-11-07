import asyncio, sys, os, time
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import AsyncSessionLocal
from app.models.client import UserModel
from app.api.v1.dashboard import get_dashboard_metrics
from app.api.v1.vault import list_vault_files
from sqlalchemy import select

async def test_performance_and_vault():
    print("=== TESTING DASHBOARD PERFORMANCE ===")
    async with AsyncSessionLocal() as session:
        u = (await session.execute(select(UserModel).limit(1))).scalar_one()
        
        t0 = time.time()
        metrics = await get_dashboard_metrics(current_user=u)
        elapsed = time.time() - t0
        print(f"Dashboard query completed in: {elapsed:.2f} seconds")
        print(f"Available Bank Cash: {metrics['available_bank_cash']}")
        print(f"Emergency Reserve:   {metrics['emergency_reserve_floor']}")
        print(f"Safe Capacity:       {metrics['safe_payment_capacity']}")
        print(f"Transactions Count:  {metrics['total_transactions_processed']}")

        print("\n=== TESTING VAULT FILES LISTING ===")
        t1 = time.time()
        files = await list_vault_files(current_user=u)
        elapsed_vault = time.time() - t1
        print(f"Vault query completed in: {elapsed_vault:.2f} seconds")
        print(f"Vault Files Count: {len(files)}")

if __name__ == "__main__":
    asyncio.run(test_performance_and_vault())

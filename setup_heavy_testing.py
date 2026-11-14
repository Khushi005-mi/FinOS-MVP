import os, sys, uuid
from datetime import datetime, date, timedelta

# Inject backend into sys.path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.models.source_file import SourceFile
from app.models.transaction import BankTransaction, Settlement, LedgerEntry
from app.models.invoice import VendorInvoiceModel, CustomerReceivableModel
from app.models.cash import CashPolicy
from app.adapters.bank_adapters.hdfc_adapter import HDFCBankAdapter
from app.adapters.gateway_adapters.razorpay_adapter import RazorpayAdapter
from app.adapters.accounting_adapters.tally_adapter import TallyAdapter
from app.adapters.invoice_adapter import InvoiceAdapter
from app.services.matching_engine import MatchingEngine
from app.api.v1.dashboard import KPICacheManager

# -------------------------------------------------------------------------
# 1. GENERATE THE 6 REAL-WORLD CORPORATE DATASETS ON DISK
# -------------------------------------------------------------------------
print("======================================================================")
print("     GENERATING REAL-WORLD CORPORATE DATASETS FOR FINOS STRESS-TEST    ")
print("======================================================================")

# A. ICICI Corporate Current Account Statement
icici_bank = """Date,Narration,Reference,Debit,Credit,Balance
2026-10-01,OPENING BALANCE B/F,ICICI-INIT-00,0.00,0.00,1250000.00
2026-10-02,CMS/RAZORPAY/SETTLE_OCT_101/ICICI,CMS982144,0.00,195280.00,1445280.00
2026-10-03,RTGS-IN/LARSEN_AND_TOUBRO/INFRA_ADV,RTGS90211,0.00,850000.00,2295280.00
2026-10-04,CMS/RAZORPAY/SETTLE_OCT_102/ICICI,CMS982145,0.00,488200.00,2783480.00
2026-10-05,NEFT-OUT/CORPORATE_FACTORY_LEASE/OCT,NEFT44120,300000.00,0.00,2483480.00
2026-10-06,CMS/RAZORPAY/SETTLE_OCT_103/ICICI,CMS982146,0.00,97640.00,2581120.00
2026-10-07,BULK-IMPS/INDUSTRIAL_PAYROLL_OCT,IMPS77102,1800000.00,0.00,781120.00
2026-10-08,CHQ-CLR/TATA_STEEL_ADVANCE/CHQ881,CHQ881023,250000.00,0.00,531120.00
2026-10-09,UPI-IN/COLLECTION_RETAIL_BATCH_01,UPI001923,0.00,125000.00,656120.00
2026-10-10,NEFT-OUT/GRID_POWER_UTILITY_DISCOM,NEFT99211,50000.00,0.00,606120.00
2026-10-12,CMS/RAZORPAY/SETTLE_OCT_104/ICICI,CMS982147,0.00,585840.00,1191960.00
2026-10-14,RTGS-IN/BHARAT_FORGE_LTD/SETTLE_INV,RTGS88192,0.00,650000.00,1841960.00
2026-10-15,NEFT-OUT/MAHINDRA_LOGISTICS_CLEAR,NEFT77192,120000.00,0.00,1721960.00
2026-10-17,CHQ-CLR/OFFICE_ADMIN_EXPENSES,CHQ119203,35000.00,0.00,1686960.00
2026-10-20,GST-PMT-GOV/CBIC_GSTR3B_OCT,GST991024,185000.00,0.00,1501960.00
2026-10-22,CMS/RAZORPAY/SETTLE_OCT_106/ICICI,CMS982149,0.00,390560.00,1892520.00
2026-10-25,RTGS-OUT/APEX_HEAVY_FOUNDRY/PART,RTGS55102,400000.00,0.00,1492520.00
2026-10-28,CLOSING BALANCE C/F,ICICI-FINAL-01,0.00,0.00,1492520.00"""

with open('icici_bank_statement.csv', 'w') as f:
    f.write(icici_bank.strip())
print("  1. Created icici_bank_statement.csv (Closing Balance: INR 14,92,520.00)")

# B. Razorpay Corporate Settlement Report (1 deliberate uncredited anomaly)
razorpay = """Settlement ID,Settlement Date,Gross Amount,Fee,GST on Fee,Refund Amount,Hold Amount,Net Amount
SETTLE_OCT_101,2026-10-02,200000.00,4000.00,720.00,0.00,0.00,195280.00
SETTLE_OCT_102,2026-10-04,500000.00,10000.00,1800.00,0.00,0.00,488200.00
SETTLE_OCT_103,2026-10-06,100000.00,2000.00,360.00,0.00,0.00,97640.00
SETTLE_OCT_104,2026-10-12,600000.00,12000.00,2160.00,0.00,0.00,585840.00
SETTLE_OCT_105,2026-10-16,350000.00,7000.00,1260.00,0.00,0.00,341740.00
SETTLE_OCT_106,2026-10-22,400000.00,8000.00,1440.00,0.00,0.00,390560.00"""

with open('razorpay_settlements_live.csv', 'w') as f:
    f.write(razorpay.strip())
print("  2. Created razorpay_settlements_live.csv (SETTLE_OCT_105 uncredited: INR 3,41,740.00 Money at Risk)")

# C. Tally Prime Daybook Export
tally = """Date,Voucher Type,Voucher No.,Particulars,Debit,Credit
02/10/2026,Receipt,REC-OCT-01,Razorpay Settlement A/c,,195280.00
03/10/2026,Receipt,REC-OCT-02,Larsen and Toubro Ltd,,850000.00
04/10/2026,Receipt,REC-OCT-03,Razorpay Settlement A/c,,488200.00
05/10/2026,Payment,PAY-OCT-01,Corporate Factory Lease,300000.00,
06/10/2026,Receipt,REC-OCT-04,Razorpay Settlement A/c,,97640.00
07/10/2026,Payment,PAY-OCT-02,Industrial Payroll Clearing,1800000.00,
08/10/2026,Payment,PAY-OCT-03,Tata Steel Advance,250000.00,
10/10/2026,Payment,PAY-OCT-04,Grid Power Utility Discom,50000.00,
12/10/2026,Receipt,REC-OCT-05,Razorpay Settlement A/c,,585840.00
14/10/2026,Receipt,REC-OCT-06,Bharat Forge Ltd,,650000.00
15/10/2026,Payment,PAY-OCT-05,Mahindra Industrial Logistics,120000.00,
20/10/2026,Payment,PAY-OCT-06,GST Statutory Tax Deposit,185000.00,
22/10/2026,Receipt,REC-OCT-07,Razorpay Settlement A/c,,390560.00
25/10/2026,Payment,PAY-OCT-07,Apex Heavy Foundry,400000.00,"""

with open('tally_daybook_corporate.csv', 'w') as f:
    f.write(tally.strip())
print("  3. Created tally_daybook_corporate.csv")

# D. Open Current Vendor Bills (With 2% Cash Discount and Duplicate Injection)
vendor_bills = """Vendor Name,Invoice Number,Invoice Date,Due Date,Amount,Discount %,Criticality
Apex Heavy Foundry,INV-2026-8891,2026-10-25,2026-11-14,400000.00,2.0%,HIGH
Precision Valve Corp,INV-2026-0912,2026-10-20,2026-11-25,250000.00,0.0%,STANDARD
Corporate Factory Lease,LEASE-NOV-2026,2026-10-01,2026-11-02,300000.00,0.0%,HIGH
Grid Power & Utility Bills,UTIL-2026-883,2026-10-15,2026-11-05,50000.00,0.0%,HIGH
Mahindra Industrial Logistics,LOG-2026-442,2026-10-22,2026-11-18,120000.00,1.5%,STANDARD
AWS Cloud Infrastructure,INV-AWS-7712,2026-10-05,2026-11-04,150000.00,0.0%,HIGH
Apex Heavy Foundry,INV-2026-8891,2026-10-25,2026-11-14,400000.00,2.0%,HIGH"""

with open('vendor_bills_heavy.csv', 'w') as f:
    f.write(vendor_bills.strip())
print("  4. Created vendor_bills_heavy.csv (Includes duplicate bill at row 7)")

# E. B2B Customer Receivables
debtors = """Customer Name,Invoice Number,Invoice Date,Due Date,Outstanding,Status
Larsen and Toubro Ltd,REC-INV-9901,2026-09-15,2026-10-15,850000.00,OVERDUE
Bharat Forge Ltd,REC-INV-9902,2026-10-01,2026-11-01,650000.00,PENDING
Tata Motors Commercial,REC-INV-9903,2026-09-10,2026-10-10,420000.00,DISPUTED
Reliance Retail Enterprise,REC-INV-9904,2026-10-10,2026-11-10,310000.00,PENDING"""

with open('customer_debtors_heavy.csv', 'w') as f:
    f.write(debtors.strip())
print("  5. Created customer_debtors_heavy.csv")

# F. Multi-Month Historical Training Data
historical = """Date,Voucher Type,Voucher No.,Particulars,Debit,Credit
02/04/2026,Payment,PAY-APEX-01,Corporate Factory Lease,300000.00,0.00
07/04/2026,Payment,PAY-APEX-02,Industrial Payroll Clearing,1800000.00,0.00
10/04/2026,Payment,PAY-APEX-03,Grid Power & Utility Bills,50000.00,0.00
12/04/2026,Purchase,PUR-APEX-01,Apex Heavy Foundry,0.00,400000.00
15/04/2026,Payment,PAY-APEX-01,Apex Heavy Foundry,392000.00,0.00
18/04/2026,Sales,SAL-APEX-01,National Infrastructure Ltd,850000.00,0.00
02/05/2026,Payment,PAY-APEX-04,Corporate Factory Lease,300000.00,0.00
07/05/2026,Payment,PAY-APEX-05,Industrial Payroll Clearing,1800000.00,0.00
10/05/2026,Payment,PAY-APEX-06,Grid Power & Utility Bills,50000.00,0.00
12/05/2026,Purchase,PUR-APEX-02,Precision Valve Corp,0.00,250000.00
16/05/2026,Receipt,REC-APEX-01,National Infrastructure Ltd,0.00,850000.00
02/06/2026,Payment,PAY-APEX-07,Corporate Factory Lease,300000.00,0.00
07/06/2026,Payment,PAY-APEX-08,Industrial Payroll Clearing,1800000.00,0.00
10/06/2026,Payment,PAY-APEX-09,Grid Power & Utility Bills,50000.00,0.00
14/06/2026,Purchase,PUR-APEX-03,Apex Heavy Foundry,0.00,400000.00
18/06/2026,Payment,PAY-APEX-10,Apex Heavy Foundry,392000.00,0.00"""

with open('historical_training_heavy.csv', 'w') as f:
    f.write(historical.strip())
print("  6. Created historical_training_heavy.csv")

# -------------------------------------------------------------------------
# 2. INGESTION INTO RENDER POSTGRESQL UNDER ACTIVE TENANT
# -------------------------------------------------------------------------
async def ingest_all():
    print("\nConnecting to Render PostgreSQL...")
    async with AsyncSessionLocal() as db:
        # Get active organization (Jhamishra.inc or primary tenant)
        res = await db.execute(text("""
            SELECT u.id, u.organization_id, o.name 
            FROM users u JOIN organizations o ON u.organization_id = o.id 
            WHERE o.name ILIKE '%Jhamishra%' LIMIT 1;
        """))
        row = res.first()
        if not row:
            res = await db.execute(text("SELECT u.id, u.organization_id, o.name FROM users u JOIN organizations o ON u.organization_id = o.id LIMIT 1;"))
            row = res.first()
        
        uid, org_id, org_name = row
        print(f"Active Tenant Workspace: {org_name} ({org_id})\n")

        # Clean old records for clean mathematical verification
        await db.execute(text("DELETE FROM matches WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM discrepancies WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM bank_transactions WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM settlements WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM ledger_entries WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM vendor_invoices WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM customer_receivables WHERE organization_id = :oid;"), {'oid': org_id})
        await db.execute(text("DELETE FROM source_files WHERE organization_id = :oid;"), {'oid': org_id})
        await db.commit()

        # Helper to create source_file
        async def make_sf(fname, ftype, is_hist=False):
            sf_id = uuid.uuid4()
            with open(fname, 'rb') as f:
                content = f.read()
            cnt = len(content.decode('utf-8', errors='ignore').strip().splitlines()) - 1
            await db.execute(text("""
                INSERT INTO source_files (
                    id, organization_id, filename, file_type, source_type, 
                    file_hash, sha256_hash, file_size, records_count, row_count,
                    storage_path, file_path, status, is_historical, uploaded_by, created_at, uploaded_at
                )
                VALUES (
                    :id, :oid, :fname, :ftype, :ftype,
                    'HASH', 'HASH', :fsize, :cnt, :cnt,
                    :path, :path, 'VERIFIED', :is_hist, :uid, NOW(), NOW()
                );
            """), {
                'id': sf_id, 'oid': org_id, 'fname': fname, 'ftype': ftype,
                'fsize': len(content), 'cnt': cnt, 'path': fname, 'is_hist': is_hist, 'uid': uid
            })
            await db.commit()
            return sf_id, content

        # Ingest ICICI Bank
        b_fid, b_bytes = await make_sf('icici_bank_statement.csv', 'HDFC_BANK', False)
        b_rows = HDFCBankAdapter.parse_statement(b_bytes, 'icici_bank_statement.csv', str(b_fid))
        for r in b_rows:
            d_val = r['date'] if hasattr(r['date'], 'strftime') else datetime.strptime(str(r['date']), '%Y-%m-%d').date()
            db.add(BankTransaction(
                organization_id=org_id,
                source_file_id=b_fid,
                date=d_val,
                narration=r['narration'],
                debit_paise=r.get('debit_paise', 0),
                credit_paise=r.get('credit_paise', 0),
                balance_paise=r.get('balance_paise', 0),
                reference=r.get('reference'),
                reference_number=r.get('reference')
            ))
        await db.commit()
        print(f"-> Ingested ICICI Bank: {len(b_rows)} transactions (Closing Cash: INR 14,92,520.00)")

        # Ingest Razorpay
        r_fid, r_bytes = await make_sf('razorpay_settlements_live.csv', 'RAZORPAY_GATEWAY', False)
        r_rows = RazorpayAdapter.parse_settlement(r_bytes, 'razorpay_settlements_live.csv', str(r_fid))
        for r in r_rows:
            s_date = r['settlement_date'] if hasattr(r['settlement_date'], 'strftime') else datetime.strptime(str(r['settlement_date']), '%Y-%m-%d').date()
            db.add(Settlement(
                organization_id=org_id,
                source_file_id=r_fid,
                settlement_id=r.get('settlement_id'),
                gross_amount_paise=r.get('gross_amount_paise', 0),
                fee_paise=r.get('fee_paise', 0),
                gst_on_fee_paise=r.get('gst_on_fee_paise', 0),
                refunds_paise=r.get('refunds_paise', 0),
                holds_paise=r.get('holds_paise', 0),
                net_amount_paise=r.get('net_amount_paise', 0),
                settlement_date=s_date
            ))
        await db.commit()
        print(f"-> Ingested Razorpay Settlements: {len(r_rows)} batches")

        # Ingest Tally Daybook
        t_fid, t_bytes = await make_sf('tally_daybook_corporate.csv', 'TALLY_LEDGER', False)
        t_data = TallyAdapter.parse_export(t_bytes, 'tally_daybook_corporate.csv', str(t_fid))
        for r in t_data.get('ledger_entries', []):
            v_date = r['voucher_date'] if hasattr(r['voucher_date'], 'strftime') else datetime.strptime(str(r['voucher_date']), '%Y-%m-%d').date()
            db.add(LedgerEntry(
                organization_id=org_id,
                source_file_id=t_fid,
                voucher_date=v_date,
                voucher_type=r.get('voucher_type'),
                amount_paise=r.get('amount_paise', 0),
                ledger_name=r.get('ledger_name', '')
            ))
        await db.commit()
        print(f"-> Ingested Tally Daybook: {len(t_data.get('ledger_entries', []))} vouchers")

        # Ingest Vendor Invoices
        v_fid, v_bytes = await make_sf('vendor_bills_heavy.csv', 'VENDOR_BILLS', False)
        v_rows = InvoiceAdapter.parse_vendor_invoices(v_bytes, 'vendor_bills_heavy.csv', str(v_fid))
        for b in v_rows:
            inv_d = datetime.strptime(b['invoice_date'], '%Y-%m-%d').date() if isinstance(b['invoice_date'], str) else b['invoice_date']
            due_d = datetime.strptime(b['due_date'], '%Y-%m-%d').date() if isinstance(b['due_date'], str) else b['due_date']
            db.add(VendorInvoiceModel(
                id=uuid.uuid4(),
                organization_id=org_id,
                source_file_id=v_fid,
                vendor_name=b['vendor_name'],
                invoice_number=b['invoice_number'],
                invoice_date=inv_d,
                due_date=due_d,
                gross_amount_paise=b['gross_amount_paise'],
                tds_amount_paise=0,
                net_payable_paise=b['net_payable_paise'],
                discount_percentage=b['discount_percentage'],
                discount_expiry_date=due_d if b['discount_percentage'] > 0 else None,
                criticality=b['criticality'],
                payment_status='CONFIRMED'
            ))
        await db.commit()
        print(f"-> Ingested Vendor Bills: {len(v_rows)} open bills")

        # Ingest B2B Customer Debtors
        with open('customer_debtors_heavy.csv', 'r') as f:
            d_lines = f.read().strip().splitlines()[1:]
        for line in d_lines:
            c_name, inv_no, i_date, d_date, out_amt, stat = line.split(',')
            db.add(CustomerReceivableModel(
                id=uuid.uuid4(),
                organization_id=org_id,
                source_file_id=b_fid,
                customer_name=c_name.strip(),
                invoice_number=inv_no.strip(),
                invoice_date=datetime.strptime(i_date.strip(), '%Y-%m-%d').date(),
                due_date=datetime.strptime(d_date.strip(), '%Y-%m-%d').date(),
                outstanding_paise=int(float(out_amt.strip()) * 100),
                collection_status=stat.strip()
            ))
        await db.commit()
        print(f"-> Ingested Customer Debtors: {len(d_lines)} receivables")

        # Ingest Historical Baseline Training
        h_fid, h_bytes = await make_sf('historical_training_heavy.csv', 'HISTORICAL_LEDGER', True)
        from app.services.historical_engine import HistoricalIntelligenceEngine
        await HistoricalIntelligenceEngine.train_from_historical_csv(h_bytes, 'historical_training_heavy.csv', str(org_id), str(uid))
        print("-> Ingested Multi-Month Historical Training Baseline")

        # Run Check 2 Reconciliation Matching Engine
        print("\nExecuting Check 2 3-Way Reconciliation Engine...")
        recon_result = await MatchingEngine.run_check_2_reconciliation(str(org_id), db)
        print(f"   Match Rate: {recon_result.get('match_rate_percentage', 0.0):.1f}% | Open Discrepancies: {recon_result.get('discrepancies_count', 0)}")

        # Configure Emergency Reserve to INR 4,00,000.00
        await db.execute(text("""
            INSERT INTO cash_policies (id, organization_id, min_liquidity_buffer_paise, buffer_policy_type, approval_threshold_paise, updated_at)
            VALUES (gen_random_uuid(), :oid, 40000000, '30_DAYS_OPEX_RESERVE', 5000000, NOW())
            ON CONFLICT (organization_id) DO UPDATE SET
                min_liquidity_buffer_paise = 40000000,
                buffer_policy_type = '30_DAYS_OPEX_RESERVE',
                updated_at = NOW();
        """), {'oid': org_id})
        await db.commit()

        # Evict cache so dashboard recalculates live
        KPICacheManager.invalidate(str(org_id))

    print("\n======================================================================")
    print("     CORPORATE DATASETS INGESTED & VERIFIED ON RENDER POSTGRESQL      ")
    print("======================================================================")

if __name__ == '__main__':
    import asyncio
    asyncio.run(ingest_all())

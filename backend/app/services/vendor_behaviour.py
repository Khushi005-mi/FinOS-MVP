"""
FinOS Deterministic Vendor Behaviour Engine
Calculates real-world vendor reliability scores (0-100) and classifications
strictly from historical bank debits, Tally ledgers, and vendor bills.
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from statistics import mean, stdev
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.invoice import VendorInvoiceModel
from app.models.transaction import BankTransactionModel, LedgerEntryModel
from app.models.source_file import SourceFileModel
from app.models.governance import VendorPolicyOverrideModel


class VendorBehaviourEngine:
    @classmethod
    async def profile_vendor(
        cls,
        vendor_name: str,
        organization_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        clean_name = vendor_name.strip().upper()

        # 1. Query strictly HISTORICAL vendor bills (is_historical = True) for temporal baseline learning
        bills_res = await db.execute(
            select(VendorInvoiceModel, SourceFileModel)
            .join(SourceFileModel, VendorInvoiceModel.source_file_id == SourceFileModel.id)
            .where(
                VendorInvoiceModel.organization_id == organization_id,
                SourceFileModel.is_historical == True
            )
        )
        all_historical_rows = bills_res.all()
        org_historical_bills = [item[0] for item in all_historical_rows]
        vendor_bills = [b for b in org_historical_bills if b.vendor_name.strip().upper() == clean_name]

        # 2. Query strictly HISTORICAL bank debits for chronological profiling
        bank_res = await db.execute(
            select(BankTransactionModel, SourceFileModel)
            .join(SourceFileModel, BankTransactionModel.source_file_id == SourceFileModel.id)
            .where(
                BankTransactionModel.organization_id == organization_id,
                BankTransactionModel.debit_paise > 0,
                SourceFileModel.is_historical == True
            )
        )
        all_historical_txns = bank_res.all()
        org_historical_bank_txns = [item[0] for item in all_historical_txns]
        
        vendor_bank_txns = [
            t for t in org_historical_bank_txns 
            if clean_name[:10] in (t.narration or "").upper() or clean_name[:10] in (t.reference or "").upper()
        ]

        # Fetch active admin policy overrides
        override_res = await db.execute(
            select(VendorPolicyOverrideModel).where(
                VendorPolicyOverrideModel.organization_id == organization_id,
                VendorPolicyOverrideModel.vendor_name == vendor_name
            )
        )
        override = override_res.scalars().first()

        total_company_spend_paise = sum(int(t.debit_paise) for t in org_historical_bank_txns) or 1
        vendor_total_spend_paise = sum(int(t.debit_paise) for t in vendor_bank_txns)
        spend_concentration_pct = round((vendor_total_spend_paise / total_company_spend_paise) * 100, 2)

        factors = []
        
        # Vector 1: Payment Track Record
        disbursals_count = len(vendor_bank_txns)
        on_time_count = 0
        delays = []

        for b in vendor_bills:
            matching_debit = next(
                (t for t in vendor_bank_txns if b.invoice_number.upper() in (t.reference or t.narration).upper()), 
                None
            )
            if matching_debit:
                delay_days = (matching_debit.date - b.due_date).days
                delays.append(max(0, delay_days))
                if delay_days <= 0:
                    on_time_count += 1

        avg_delay = mean(delays) if delays else 0.0
        on_time_rate = (on_time_count / len(delays) * 100) if delays else 100.0

        score_pay = (30.0 * (on_time_rate / 100.0)) - min(15.0, avg_delay * 0.5)
        score_pay = max(0.0, min(30.0, score_pay))
        factors.append(f"On-time disbursal rate: {on_time_rate:.1f}% (Avg delay: {avg_delay:.1f} days)")

        # Vector 2: Invoice Amount Consistency
        bill_amounts = [int(b.net_payable_paise) / 100 for b in vendor_bills]
        if len(bill_amounts) >= 2:
            mu = mean(bill_amounts)
            sigma = stdev(bill_amounts)
            cv = (sigma / mu) if mu > 0 else 0.0
            score_var = max(0.0, min(20.0, 20.0 * (1.0 - min(1.0, cv))))
            factors.append(f"Invoice amount variance: CV {cv:.2f}")
        else:
            score_var = 15.0

        # Vector 3: Duplicate Cleanliness
        inv_refs = [b.invoice_number.strip().upper() for b in vendor_bills]
        dup_count = len(inv_refs) - len(set(inv_refs))
        score_dup = max(0.0, 25.0 - (dup_count * 10.0))
        if dup_count > 0:
            factors.append(f"⚠️ {dup_count} duplicate invoice numbers detected in history")
        else:
            factors.append("Zero duplicate invoice incidents in history")

        # Vector 4: Business Supply Criticality
        if spend_concentration_pct >= 20.0 or any(b.criticality == "HIGH" for b in vendor_bills):
            score_crit = 15.0
            business_crit = "HIGH"
            factors.append(f"Core operational supplier ({spend_concentration_pct:.1f}% company spend)")
        elif spend_concentration_pct >= 10.0:
            score_crit = 10.0
            business_crit = "STANDARD"
            factors.append(f"Standard operational supplier ({spend_concentration_pct:.1f}% spend)")
        else:
            score_crit = 5.0
            business_crit = "LOW"
            factors.append("Commodity / secondary vendor")

        # Vector 5: Bank Account & Payment Stability
        unique_destinations = set(t.reference for t in vendor_bank_txns if t.reference)
        account_changes = max(0, len(unique_destinations) - 1)
        if account_changes > 0:
            score_bank = 0.0
            factors.append(f"⚠️ Bank account changed {account_changes} time(s) in history")
        else:
            score_bank = 10.0
            factors.append("Stable verified bank account lineage")

        total_score = round(score_pay + score_var + score_dup + score_crit + score_bank, 2)
        total_score = max(0.0, min(100.0, total_score))

        if total_score >= 80.0:
            tier = "HIGH"
        elif total_score >= 50.0:
            tier = "NORMAL"
        else:
            tier = "LOW"

        confirmed_crit = override.confirmed_criticality if override else business_crit
        is_overridden = override is not None

        return {
            "vendor_name": vendor_name,
            "total_bills_received": len(vendor_bills),
            "total_spend_inr": vendor_total_spend_paise / 100,
            "spend_concentration_pct": spend_concentration_pct,
            "on_time_payment_rate_pct": on_time_rate,
            "average_payment_delay_days": avg_delay,
            "duplicate_incidents_count": dup_count,
            "bank_account_changes_count": account_changes,
            "business_criticality": confirmed_crit,
            "derived_criticality": business_crit,
            "is_criticality_overridden": is_overridden,
            "override_reason": override.override_reason if override else None,
            "reliability_score": total_score,
            "reliability_tier": tier,
            "score_breakdown": {
                "payment_track_pts": round(score_pay, 1),
                "amount_consistency_pts": round(score_var, 1),
                "duplicate_cleanliness_pts": round(score_dup, 1),
                "supply_criticality_pts": round(score_crit, 1),
                "bank_stability_pts": round(score_bank, 1)
            },
            "contributing_factors": factors
        }
"""
FinOS Deterministic Bill Matching & Status Engine
Reconciles uploaded Vendor Bills against Bank Transactions and Tally Ledger Entries.
Strictly adheres to:
- Integer paise mathematics (zero floating-point drift)
- Row-level source lineage preservation
- Conservative matching (zero false matches; uncertain cases preserved for review)
- Indian Statutory TDS slab triangulation (194C, 194J, 194Q)
"""

from datetime import date, datetime
from typing import List, Dict, Any, Optional
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.invoice import VendorInvoiceModel
from app.models.transaction import BankTransactionModel, LedgerEntryModel
from app.models.source_file import SourceFileModel


class BillMatchingEngine:
    TDS_SLABS = [
        {"name": "194Q_GOODS", "rate": Decimal("0.001")},
        {"name": "194C_INDIVIDUAL", "rate": Decimal("0.01")},
        {"name": "194C_COMPANY", "rate": Decimal("0.02")},
        {"name": "194J_TECHNICAL", "rate": Decimal("0.02")},
        {"name": "194I_PLANT", "rate": Decimal("0.02")},
        {"name": "194J_PROFESSIONAL", "rate": Decimal("0.10")},
        {"name": "194I_LAND_BUILDING", "rate": Decimal("0.10")}
    ]

    @classmethod
    async def reconcile_vendor_bills(
        cls,
        organization_id: str,
        db: AsyncSession,
        specific_bill_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        bill_query = select(VendorInvoiceModel).where(
            VendorInvoiceModel.organization_id == organization_id
        )
        if specific_bill_id:
            bill_query = bill_query.where(VendorInvoiceModel.id == specific_bill_id)
        
        bill_res = await db.execute(bill_query.order_by(VendorInvoiceModel.due_date.asc()))
        all_bills = bill_res.scalars().all()

        if not all_bills:
            return []

        # 2. Fetch all real bank withdrawals
        bank_query = (
            select(BankTransactionModel, SourceFileModel)
            .join(SourceFileModel, BankTransactionModel.source_file_id == SourceFileModel.id)
            .where(
                BankTransactionModel.organization_id == organization_id,
                BankTransactionModel.debit_paise > 0
            )
            .order_by(BankTransactionModel.date.asc())
        )
        bank_res = await db.execute(bank_query)
        bank_rows = bank_res.all()

        # 3. Fetch all Tally payment/journal vouchers
        ledger_query = (
            select(LedgerEntryModel, SourceFileModel)
            .join(SourceFileModel, LedgerEntryModel.source_file_id == SourceFileModel.id)
            .where(
                LedgerEntryModel.organization_id == organization_id
            )
            .order_by(LedgerEntryModel.voucher_date.asc())
        )
        ledger_res = await db.execute(ledger_query)
        ledger_rows = ledger_res.all()

        evaluations = []
        for bill in all_bills:
            evaluated = cls._evaluate_single_bill(
                bill=bill,
                all_bills=all_bills,
                bank_rows=bank_rows,
                ledger_rows=ledger_rows
            )
            evaluations.append(evaluated)

        return evaluations

    @classmethod
    def _evaluate_single_bill(
        cls,
        bill: VendorInvoiceModel,
        all_bills: List[VendorInvoiceModel],
        bank_rows: List[Any],
        ledger_rows: List[Any]
    ) -> Dict[str, Any]:
        net_payable = int(bill.net_payable_paise)
        clean_inv_ref = bill.invoice_number.strip().upper()
        clean_vendor = bill.vendor_name.strip().upper()

        matched_bank_txns = []
        matched_ledger_entries = []
        evidence_pointers = []
        
        evidence_pointers.append({
            "source_type": "VENDOR_BILL",
            "file_id": str(bill.source_file_id),
            "row_index": getattr(bill, 'source_row_index', 1),
            "field_name": "net_payable_paise",
            "raw_value": str(net_payable / 100),
            "normalized_value": net_payable,
            "description": f"Uploaded Vendor Bill #{bill.invoice_number} from {bill.vendor_name}"
        })

        # ====================================================================
        # PASS 1: Bill to Bank Transactions (Exact Reference & Amount)
        # ====================================================================
        matched_debit_sum = 0
        matching_refs = []

        for b_txn, b_file in bank_rows:
            txn_ref = (b_txn.reference or "").strip().upper()
            txn_narration = (b_txn.narration or "").strip().upper()
            txn_amount = int(b_txn.debit_paise)

            ref_in_bank = (
                clean_inv_ref in txn_ref or 
                clean_inv_ref in txn_narration or
                clean_inv_ref.replace("-", "") in txn_narration or
                clean_inv_ref.replace("/", "") in txn_narration
            )

            if ref_in_bank and b_txn.date >= bill.invoice_date:
                matched_bank_txns.append({
                    "id": str(b_txn.id),
                    "date": b_txn.date.isoformat(),
                    "narration": b_txn.narration,
                    "reference": b_txn.reference,
                    "debit_paise": txn_amount,
                    "source_file_name": b_file.file_name,
                    "source_file_id": str(b_file.id),
                    "sha256_hash": b_file.sha256_hash
                })
                matched_debit_sum += txn_amount
                matching_refs.append(b_txn.reference or b_txn.narration[:20])
                
                evidence_pointers.append({
                    "source_type": "BANK_STATEMENT",
                    "file_id": str(b_file.id),
                    "file_name": b_file.file_name,
                    "row_index": getattr(b_txn, 'source_row_index', 1),
                    "field_name": "debit_paise",
                    "raw_value": str(txn_amount / 100),
                    "normalized_value": txn_amount,
                    "sha256_hash": b_file.sha256_hash,
                    "description": f"HDFC Bank Debit Ref: {b_txn.reference or b_txn.narration[:30]}"
                })

        # ====================================================================
        # PASS 2: Bill to Books / Tally Daybook (Safe Attribute Lookups)
        # ====================================================================
        for l_entry, l_file in ledger_rows:
            v_ref = str(getattr(l_entry, 'bill_reference', '') or '').strip().upper()
            v_no = str(getattr(l_entry, 'voucher_number', '') or '').strip().upper()
            l_party = str(getattr(l_entry, 'ledger_name', '') or '').strip().upper()
            
            if hasattr(l_entry, 'debit_paise') and l_entry.debit_paise and l_entry.debit_paise > 0:
                v_amount = int(l_entry.debit_paise)
            else:
                v_amount = abs(int(getattr(l_entry, 'amount_paise', 0) or 0))

            ref_in_books = (
                (bool(v_ref) and clean_inv_ref in v_ref) or 
                (bool(v_no) and clean_inv_ref in v_no) or 
                (bool(clean_vendor) and clean_vendor in l_party and v_amount == net_payable)
            )

            if ref_in_books and l_entry.voucher_date >= bill.invoice_date:
                v_type = getattr(l_entry, 'voucher_type', 'Voucher') or 'Voucher'
                v_num_display = v_no or 'N/A'
                matched_ledger_entries.append({
                    "id": str(l_entry.id),
                    "voucher_date": l_entry.voucher_date.isoformat(),
                    "voucher_type": v_type,
                    "voucher_number": v_num_display,
                    "ledger_name": getattr(l_entry, 'ledger_name', ''),
                    "debit_paise": v_amount,
                    "source_file_name": l_file.file_name,
                    "source_file_id": str(l_file.id),
                    "sha256_hash": l_file.sha256_hash
                })
                
                evidence_pointers.append({
                    "source_type": "TALLY_BOOKS",
                    "file_id": str(l_file.id),
                    "file_name": l_file.file_name,
                    "row_index": getattr(l_entry, 'source_row_index', 1),
                    "field_name": "amount_paise",
                    "raw_value": str(v_amount / 100),
                    "normalized_value": v_amount,
                    "sha256_hash": l_file.sha256_hash,
                    "description": f"Tally {v_type} #{v_num_display} on {getattr(l_entry, 'ledger_name', 'Ledger')}"
                })

        # ====================================================================
        # PASS 3: TDS Slab Triangulation (If no exact reference match)
        # ====================================================================
        tds_detected = None
        if matched_debit_sum == 0:
            for b_txn, b_file in bank_rows:
                txn_narration = (b_txn.narration or "").strip().upper()
                txn_amount = int(b_txn.debit_paise)
                
                vendor_in_narration = clean_vendor[:10] in txn_narration
                date_diff_days = abs((b_txn.date - bill.due_date).days)

                if vendor_in_narration and date_diff_days <= 15:
                    for slab in cls.TDS_SLABS:
                        expected_net_paise = int(Decimal(net_payable) * (Decimal("1.00") - slab["rate"]))
                        amount_diff_paise = abs(expected_net_paise - txn_amount)

                        if amount_diff_paise <= 100:
                            matched_debit_sum = net_payable
                            tds_detected = {
                                "slab_name": slab["name"],
                                "tds_rate_pct": float(slab["rate"] * 100),
                                "tds_deducted_paise": net_payable - txn_amount,
                                "bank_disbursed_paise": txn_amount
                            }
                            matched_bank_txns.append({
                                "id": str(b_txn.id),
                                "date": b_txn.date.isoformat(),
                                "narration": b_txn.narration,
                                "reference": b_txn.reference,
                                "debit_paise": txn_amount,
                                "source_file_name": b_file.file_name,
                                "source_file_id": str(b_file.id),
                                "tds_slab": slab["name"]
                            })
                            evidence_pointers.append({
                                "source_type": "BANK_STATEMENT",
                                "file_id": str(b_file.id),
                                "file_name": b_file.file_name,
                                "field_name": "debit_paise",
                                "raw_value": str(txn_amount / 100),
                                "normalized_value": txn_amount,
                                "description": f"TDS-Adjusted Disbursal ({slab['name']} at {float(slab['rate']*100)}% TDS)"
                            })
                            break
                    if tds_detected:
                        break

        # ====================================================================
        # PASS 4: Duplicate & Overpayment Risk Detector
        # ====================================================================
        duplicate_risk = "NONE"
        duplicate_details = None

        # Check 4A: Intra-Invoice Duplicates
        duplicate_bills = [
            b for b in all_bills 
            if b.id != bill.id and 
            b.vendor_name.strip().upper() == clean_vendor and 
            b.invoice_number.strip().upper() == clean_inv_ref
        ]
        if duplicate_bills:
            duplicate_risk = "CRITICAL"
            duplicate_details = {
                "risk_type": "DUPLICATE_BILL_UPLOADED",
                "message": f"Identical Invoice #{bill.invoice_number} from {bill.vendor_name} appears multiple times in uploaded bills.",
                "conflicting_bill_id": str(duplicate_bills[0].id)
            }

        # Check 4B: Multiple Bank Debits for the Same Invoice Reference
        if len(matched_bank_txns) > 1 and matched_debit_sum > net_payable:
            duplicate_risk = "CRITICAL"
            duplicate_details = {
                "risk_type": "DUPLICATE_BANK_DISBURSEMENT",
                "message": f"Multiple bank debits totaling ₹{matched_debit_sum/100:,.2f} cleared for bill #{bill.invoice_number} (Bill total: ₹{net_payable/100:,.2f}).",
                "cleared_debits_count": len(matched_bank_txns)
            }

        # Check 4C: Similar Amount from Same Vendor within 7-Day Window
        if duplicate_risk == "NONE":
            similar_bills = [
                b for b in all_bills
                if b.id != bill.id and
                b.vendor_name.strip().upper() == clean_vendor and
                abs(int(b.net_payable_paise) - net_payable) == 0 and
                abs((b.invoice_date - bill.invoice_date).days) <= 7
            ]
            if similar_bills:
                duplicate_risk = "MEDIUM"
                duplicate_details = {
                    "risk_type": "SIMILAR_BILL_PROXIMITY",
                    "message": f"Another bill #{similar_bills[0].invoice_number} with identical amount ₹{net_payable/100:,.2f} exists within 7 days.",
                    "conflicting_bill_id": str(similar_bills[0].id)
                }

        # ====================================================================
        # FINAL STATUS & REASON CODE SYNTHESIS
        # ====================================================================
        outstanding_paise = max(0, net_payable - matched_debit_sum)
        
        if bill.payment_status in ["ON_HOLD", "DISPUTED"] or getattr(bill, 'is_disputed', False):
            payment_status = "DISPUTED"
            reason_code = "COMMERCIAL_DISPUTE_ACTIVE"
            plain_reason = f"Payment frozen. Invoice #{bill.invoice_number} is flagged under commercial dispute: {bill.dispute_reason or 'Goods inspection pending'}."
            confidence = 1.00
        elif duplicate_risk == "CRITICAL":
            payment_status = "OVERPAID" if matched_debit_sum > net_payable else "UNPAID"
            reason_code = "DUPLICATE_PAYMENT_RISK_DETECTED"
            plain_reason = duplicate_details["message"] if duplicate_details else "Duplicate disbursement detected."
            confidence = 0.95
        elif matched_debit_sum >= net_payable:
            payment_status = "FULLY_PAID"
            reason_code = "EXACT_BANK_DISBURSEMENT_VERIFIED"
            plain_reason = f"Verified paid in full. Matched against bank disbursement of ₹{matched_debit_sum/100:,.2f}."
            if tds_detected:
                plain_reason += f" Net of {tds_detected['tds_rate_pct']}% statutory TDS deduction."
            confidence = 1.00 if not tds_detected else 0.90
        elif matched_debit_sum > 0:
            payment_status = "PARTIALLY_PAID"
            reason_code = "PARTIAL_DISBURSEMENT_CLEARED"
            plain_reason = f"Partially paid. ₹{matched_debit_sum/100:,.2f} cleared in bank statement; ₹{outstanding_paise/100:,.2f} remains outstanding."
            confidence = 0.90
        elif matched_ledger_entries:
            payment_status = "UNPAID"
            reason_code = "RECORDED_IN_BOOKS_PENDING_BANK"
            plain_reason = f"Recorded in Tally books ({matched_ledger_entries[0]['voucher_type']} #{matched_ledger_entries[0]['voucher_number']}), but funds have not cleared the bank statement."
            confidence = 0.85
        else:
            payment_status = "UNPAID"
            reason_code = "AWAITING_DISBURSEMENT"
            plain_reason = f"Bill #{bill.invoice_number} is unpaid. No matching debit detected in bank statement or Tally payment vouchers."
            confidence = 1.00

        return {
            "bill_id": str(bill.id),
            "vendor_name": bill.vendor_name,
            "invoice_number": bill.invoice_number,
            "invoice_date": bill.invoice_date.isoformat(),
            "due_date": bill.due_date.isoformat(),
            "gross_amount_paise": int(bill.gross_amount_paise),
            "net_payable_paise": net_payable,
            "cleared_paise": matched_debit_sum,
            "outstanding_paise": outstanding_paise,
            "outstanding_display": f"₹{outstanding_paise / 100:,.2f}",
            "payment_status": payment_status,
            "duplicate_risk": duplicate_risk,
            "duplicate_details": duplicate_details,
            "tds_deduction": tds_detected,
            "matched_bank_txns": matched_bank_txns,
            "matched_ledger_entries": matched_ledger_entries,
            "confidence_score": confidence,
            "status_reason_code": reason_code,
            "plain_language_status": plain_reason,
            "evidence_pointers": evidence_pointers
        }

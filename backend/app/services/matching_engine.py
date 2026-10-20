from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.models.transaction import BankTransactionModel, SettlementModel
from app.models.discrepancy import MatchModel, DiscrepancyModel

class MatchingEngine:
    @staticmethod
    async def run_check_2_reconciliation(organization_id: str, db: AsyncSession) -> dict:
        """
        DETERMINISTIC GATEWAY-TO-BANK RECONCILIATION WITH CONTEXTUAL INTELLIGENCE:
        - Evaluates settlement aging against the latest bank statement date.
        - Detects customer refund netting.
        - Generates case-specific root causes and actionable remediations.
        """
        # Wipe previous check-2 records for idempotency
        await db.execute(
            delete(MatchModel).where(
                MatchModel.organization_id == organization_id,
                MatchModel.match_type.like("CHECK_2%")
            )
        )
        await db.execute(
            delete(DiscrepancyModel).where(
                DiscrepancyModel.organization_id == organization_id,
                DiscrepancyModel.check_type == "CHECK_2_GATEWAY_TO_BANK"
            )
        )

        # 1. Fetch un-reconciled bank credits and settlements
        bank_result = await db.execute(
            select(BankTransactionModel).where(
                BankTransactionModel.organization_id == organization_id,
                BankTransactionModel.credit_paise > 0
            )
        )
        bank_txns = bank_result.scalars().all()

        settlement_result = await db.execute(
            select(SettlementModel).where(
                SettlementModel.organization_id == organization_id
            )
        )
        settlements = settlement_result.scalars().all()

        # Find latest bank transaction date to evaluate aging accurately
        latest_bank_date = max((t.date for t in bank_txns), default=datetime.utcnow().date())

        matches_created = 0
        discrepancies_created = 0
        matched_settlement_ids = set()
        matched_bank_ids = set()

        # PASS 1: Exact Reference / Settlement ID Match (within ₹1 tolerance)
        for sett in settlements:
            if sett.id in matched_settlement_ids:
                continue
                
            for txn in bank_txns:
                if txn.id in matched_bank_ids:
                    continue

                if sett.settlement_id in (txn.reference or "") or sett.settlement_id in (txn.narration or ""):
                    amount_diff = abs(int(sett.net_amount_paise) - int(txn.credit_paise))
                    if amount_diff <= 100:
                        match = MatchModel(
                            organization_id=organization_id,
                            match_type="CHECK_2_GATEWAY_TO_BANK",
                            matched_record_ids=[str(sett.id), str(txn.id)],
                            confidence_score=Decimal("1.00"),
                            reason_code="MATCHED",
                            evidence_payload={
                                "source_file_id_gateway": str(sett.source_file_id),
                                "source_file_id_bank": str(txn.source_file_id),
                                "settlement_id": sett.settlement_id,
                                "settlement_date": str(sett.settlement_date),
                                "bank_date": str(txn.date),
                                "gross_amount": int(sett.gross_amount_paise) / 100,
                                "fee": int(sett.fee_paise) / 100,
                                "gst": int(sett.gst_on_fee_paise or 0) / 100,
                                "net_amount": int(sett.net_amount_paise) / 100,
                                "bank_credit": int(txn.credit_paise) / 100,
                                "description": "Exact settlement ID match between gateway payout and bank credit."
                            }
                        )
                        db.add(match)
                        matched_settlement_ids.add(sett.id)
                        matched_bank_ids.add(txn.id)
                        matches_created += 1
                        break

        # PASS 2: Fee-Adjusted Amount & Date Window (0-3 days tolerance)
        for sett in settlements:
            if sett.id in matched_settlement_ids:
                continue

            for txn in bank_txns:
                if txn.id in matched_bank_ids:
                    continue

                net_settled = int(sett.net_amount_paise)
                bank_credit = int(txn.credit_paise)
                amount_diff = abs(net_settled - bank_credit)
                date_diff = abs((sett.settlement_date - txn.date).days)

                if amount_diff <= 100 and date_diff <= 3:
                    match = MatchModel(
                        organization_id=organization_id,
                        match_type="CHECK_2_GATEWAY_TO_BANK_FEE_ADJUSTED",
                        matched_record_ids=[str(sett.id), str(txn.id)],
                        confidence_score=Decimal("0.90"),
                        reason_code="FEE_ADJUSTED_MATCH",
                        evidence_payload={
                            "source_file_id_gateway": str(sett.source_file_id),
                            "source_file_id_bank": str(txn.source_file_id),
                            "settlement_id": sett.settlement_id,
                            "net_amount": int(sett.net_amount_paise) / 100,
                            "bank_credit": int(txn.credit_paise) / 100,
                            "date_difference_days": date_diff,
                            "description": f"Fee-adjusted match with {date_diff} day timing variance."
                        }
                    )
                    db.add(match)
                    matched_settlement_ids.add(sett.id)
                    matched_bank_ids.add(txn.id)
                    matches_created += 1
                    break

        # PASS 3: Critical Missing Bank Credit Detection with Financial Aging Context
        for sett in settlements:
            if sett.id not in matched_settlement_ids:
                days_elapsed = (latest_bank_date - sett.settlement_date).days
                refund_amt = int(sett.refunds_paise or 0) / 100
                net_amt = int(sett.net_amount_paise) / 100

                # Context-Aware Financial Reasoning
                if days_elapsed >= 3:
                    classification = "AGED_LEAKAGE"
                    root_cause = f"Settlement {sett.settlement_id} for ₹{net_amt:,.2f} was processed on {sett.settlement_date}. It is {days_elapsed} days past standard T+2 clearance with zero corresponding deposit in HDFC statement."
                    remediation = f"Raise an urgent support ticket with Razorpay Merchant Support quoting Settlement ID '{sett.settlement_id}' and demand the 16-digit bank UTR clearance proof."
                elif refund_amt > 0:
                    classification = "REFUND_ADJUSTED"
                    root_cause = f"Settlement {sett.settlement_id} on {sett.settlement_date} netted off ₹{refund_amt:,.2f} in customer refunds before payout. It has not yet cleared in the bank statement."
                    remediation = f"Verify that the ₹{refund_amt:,.2f} customer return was recorded in Tally as a Credit Note, and allow 24 hours for bank batch credit before filing a dispute."
                else:
                    classification = "IN_TRANSIT"
                    root_cause = f"Settlement {sett.settlement_id} for ₹{net_amt:,.2f} was initiated on {sett.settlement_date} (same date as statement closing). Funds are within the normal clearing window."
                    remediation = f"Do not raise a support ticket yet. Funds are within standard 24–48h transit. Verify against tomorrow morning's bank statement feed."

                disc = DiscrepancyModel(
                    organization_id=organization_id,
                    check_type="CHECK_2_GATEWAY_TO_BANK",
                    reason_code="MISSING_IN_BANK",
                    amount_paise=sett.net_amount_paise,
                    evidence_payload={
                        "source_file_id_gateway": str(sett.source_file_id),
                        "settlement_id": sett.settlement_id,
                        "settlement_date": str(sett.settlement_date),
                        "gross_amount": int(sett.gross_amount_paise) / 100,
                        "fee": int(sett.fee_paise) / 100,
                        "gst": int(sett.gst_on_fee_paise or 0) / 100,
                        "refund_amount": refund_amt,
                        "expected_net_credit": net_amt,
                        "actual_bank_credit": 0.0,
                        "difference": net_amt,
                        "days_elapsed": days_elapsed,
                        "classification": classification,
                        "root_cause_explanation": root_cause,
                        "suggested_remediation": remediation,
                        "description": root_cause
                    },
                    status="OPEN"
                )
                db.add(disc)
                discrepancies_created += 1

        await db.commit()

        total_settlements_count = len(settlements)
        auto_match_rate = (matches_created / total_settlements_count * 100) if total_settlements_count > 0 else 0.0

        return {
            "total_settlements": total_settlements_count,
            "matches_created": matches_created,
            "discrepancies_created": discrepancies_created,
            "auto_match_rate": f"{round(auto_match_rate, 1)}%"
        }
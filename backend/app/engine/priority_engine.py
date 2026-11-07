from datetime import date
from app.models.invoice import VendorInvoiceModel

class PriorityEngine:
    @staticmethod
    def evaluate_priority_and_recommendation(
        bill: VendorInvoiceModel, 
        vendor_reliability_score: int, 
        safe_capacity_inr: float, 
        emergency_reserve_inr: float
    ) -> dict:
        """
        Calculates transparent priority score and assigns PAY NOW, SCHEDULE, or HOLD / REVIEW
        based strictly on due dates, discounts, reliability scores, and cash headroom.
        """
        today = date.today()
        due_d = bill.due_date or today
        days_until_due = (due_d - today).days
        amount_inr = int(bill.net_payable_paise) / 100.0

        discount_pct = float(bill.discount_percentage or 0.0)
        discount_val = round(amount_inr * (discount_pct / 100.0), 2)

        score = 0.0
        reasons = []
        trade_offs = []

        # 1. Due Date Urgency Weight
        if days_until_due < 0:
            score += 50.0 + min(20.0, abs(days_until_due) * 1.5)
            reasons.append(f"Overdue by {abs(days_until_due)} days")
            trade_offs.append("Vendor credit hold and late penalty risk active")
        elif days_until_due <= 1:
            score += 40.0
            reasons.append("Due tomorrow / today")
        elif days_until_due <= 5:
            score += 20.0
            reasons.append(f"Due in {days_until_due} days")
        else:
            score -= 10.0
            reasons.append(f"Due in {days_until_due} days")
            trade_offs.append("Contractual maturity is distant; deferral carries zero operational penalty")

        # 2. Early-Payment Discount ROI
        if discount_val > 0:
            score += 25.0
            reasons.append(f"{discount_pct}% early discount saves ₹{discount_val:,.2f}")
            trade_offs.append(f"Deferral forfeits ₹{discount_val:,.2f} in immediate profit")

        # 3. Vendor Reliability & Criticality Weight
        if bill.criticality == "HIGH":
            score += 20.0
            reasons.append("High-criticality core supplier")
        
        # Factor in historical reliability score (0-100 normalization)
        reliability_weight = (vendor_reliability_score - 50) / 5.0 # -10 to +10 adjustment
        score += reliability_weight

        # 4. Cash Headroom & Buffer Impact
        headroom_after = safe_capacity_inr - amount_inr
        if headroom_after >= 0:
            score += 15.0
            reasons.append(f"Safe headroom covers bill (₹{headroom_after:,.2f} buffer remains)")
        else:
            score -= 50.0
            reasons.append(f"Disbursal breaches emergency reserve by ₹{abs(headroom_after):,.2f}")
            trade_offs.append(f"Disbursing today breaches your non-negotiable ₹{emergency_reserve_inr:,.2f} buffer")

        # 5. Circuit Breakers (Duplicates & Disputes)
        if getattr(bill, 'duplicate_risk', False):
            score -= 90.0
            reasons.append("DUPLICATE RISK: Similar bill detected in system")
            trade_offs.append("Risk of double payment; review bank ledger before approving")

        if bill.payment_status in ["ON_HOLD", "DISPUTED"]:
            score -= 100.0
            reasons.append("COMMERCIAL DISPUTE ACTIVE: Quality hold in place")
            trade_offs.append("Payment frozen pending inspection credit note")

        # Recommendation Assignment Rules
        if getattr(bill, 'duplicate_risk', False) or bill.payment_status in ["ON_HOLD", "DISPUTED"] or headroom_after < 0:
            action = "HOLD / REVIEW"
        elif score >= 45.0 and headroom_after >= 0:
            action = "PAY NOW"
        else:
            action = "SCHEDULE"

        plain_reason = " • ".join(reasons)
        trade_off_text = " • ".join(trade_offs) if trade_offs else "Standard scheduled execution."

        return {
            "id": str(bill.id),
            "vendor_name": bill.vendor_name,
            "invoice_number": bill.invoice_number,
            "invoice_date": bill.invoice_date.isoformat() if bill.invoice_date else today.isoformat(),
            "due_date": due_d.isoformat(),
            "days_until_due": days_until_due,
            "amount_inr": amount_inr,
            "amount_display": f"₹{amount_inr:,.2f}",
            "discount_percentage": discount_pct,
            "discount_value": discount_val,
            "criticality": bill.criticality,
            "payment_status": bill.payment_status,
            "duplicate_risk": getattr(bill, 'duplicate_risk', False),
            "recommendation": action,
            "priority_score": round(score, 2),
            "reason": plain_reason,
            "trade_off_if_deferred": trade_off_text
        }
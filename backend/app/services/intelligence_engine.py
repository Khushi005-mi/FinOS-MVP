from typing import Dict, Any

class IntelligenceEngine:
    @staticmethod
    def calculate_vendor_criticality(
        spend_concentration_pct: float,
        purchase_frequency_per_quarter: int,
        recurring_invoice_val_inr: float,
        supply_dependency: str,
        dispute_count: int,
        replacement_difficulty: str
    ) -> Dict[str, Any]:
        score = 0.0
        factors = []
        if spend_concentration_pct >= 20.0:
            score += 25.0
            factors.append(f"High spend concentration ({spend_concentration_pct:.1f}%)")
        elif spend_concentration_pct >= 10.0:
            score += 15.0
        else:
            score += 5.0

        if purchase_frequency_per_quarter >= 6:
            score += 20.0
            factors.append(f"High purchase frequency ({purchase_frequency_per_quarter} orders/qtr)")
        else:
            score += 10.0

        if supply_dependency == "HIGH":
            score += 25.0
            factors.append("Sole-source critical component supplier")
        elif supply_dependency == "MEDIUM":
            score += 15.0
        else:
            score += 5.0

        if replacement_difficulty == "HIGH":
            score += 20.0
            factors.append("Long supplier replacement lead-time (>45 days)")
        else:
            score += 10.0

        total_score = min(100.0, round(score, 1))
        classification = "HIGH" if total_score >= 65.0 else "MEDIUM" if total_score >= 40.0 else "LOW"
        return {"score": total_score, "classification": classification, "contributing_factors": factors}

    @staticmethod
    def calculate_debtor_collection_priority(
        outstanding_inr: float,
        days_overdue: int,
        habitual_late_days: int,
        broken_promises: int,
        has_active_dispute: bool
    ) -> Dict[str, Any]:
        score = 0.0
        factors = []
        if days_overdue >= 25:
            score += 40.0
            factors.append(f"Severely delinquent ({days_overdue} days past due)")
        elif days_overdue >= 10:
            score += 25.0
        else:
            score += 10.0

        if outstanding_inr >= 100000.0:
            score += 30.0
            factors.append(f"High balance exposure (₹{outstanding_inr:,.2f})")
        else:
            score += 15.0

        if habitual_late_days > 15:
            score += 20.0
            factors.append("Habitual late payer")

        total_score = min(100.0, round(score, 1))
        priority = "HIGH" if total_score >= 65.0 else "MEDIUM" if total_score >= 40.0 else "LOW"
        action = "CHASE_TODAY" if priority == "HIGH" else "SEND_REMINDER" if priority == "MEDIUM" else "STANDARD_FOLLOWUP"
        return {"score": total_score, "priority": priority, "action": action, "factors": factors}

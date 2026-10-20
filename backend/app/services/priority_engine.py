from decimal import Decimal

class PayablesPriorityEngine:
    @staticmethod
    def calculate_priority_rankings(
        payables: list[dict],
        available_cash_paise: int | None = None
    ) -> dict:
        """
        CONCEPT: PAYABLES PRIORITY & CASH-CONSTRAINED OPTIMIZATION (Feature F16)
        Takes a list of vendor payables, scores them by urgency and statutory importance,
        and generates a ranked 'pay first' action list.
        """
        scored_payables = []

        for item in payables:
            # Expected item fields:
            # vendor_name, amount_paise, due_date (days until due), is_statutory (bool), discount_percentage (float)
            
            amount = int(item.get("amount_paise", 0))
            days_until_due = int(item.get("days_until_due", 0)) # Negative means overdue
            is_statutory = bool(item.get("is_statutory", False)) # E.g., TDS, PF, GST
            discount_pct = float(item.get("discount_percentage", 0.0))

            # SCORING ALGORITHM:
            # 1. Statutory dues (taxes, payroll) get maximum emergency weight (10,000 points)
            # 2. Overdue bills get higher priority based on how many days past due they are
            # 3. Early payment discounts add bonus incentive weight
            score = 0.0
            reasons = []

            if is_statutory:
                score += 10000.0
                reasons.append("Statutory commitment (High compliance risk)")

            if days_until_due < 0:
                overdue_days = abs(days_until_due)
                score += 5000.0 + (overdue_days * 100)
                reasons.append(f"Overdue by {overdue_days} days")
            elif days_until_due == 0:
                score += 3000.0
                reasons.append("Due today")
            else:
                # Due in the future: closer due date = higher priority
                score += max(0.0, 2000.0 - (days_until_due * 50))
                reasons.append(f"Due in {days_until_due} days")

            if discount_pct > 0:
                score += discount_pct * 500.0
                reasons.append(f"Offers {discount_pct}% early-payment discount")

            scored_payables.append({
                **item,
                "priority_score": round(score, 2),
                "explanation": " | ".join(reasons)
            })

        # Sort descending by priority score (highest score = pay first)
        scored_payables.sort(key=lambda x: x["priority_score"], reverse=True)

        # CASH-CONSTRAINED OPTIMIZATION MODE
        selected_payouts = []
        total_allocated_paise = 0

        if available_cash_paise is not None:
            remaining_cash = available_cash_paise
            for item in scored_payables:
                cost = int(item["amount_paise"])
                if remaining_cash >= cost:
                    selected_payouts.append(item)
                    remaining_cash -= cost
                    total_allocated_paise += cost
                else:
                    # Budget exhausted for lower priority items
                    pass
        else:
            selected_payouts = scored_payables
            total_allocated_paise = sum(int(i["amount_paise"]) for i in scored_payables)

        return {
            "available_cash_paise": available_cash_paise,
            "total_allocated_paise": total_allocated_paise,
            "total_allocated_display": f"₹{total_allocated_paise / 100:,.2f}",
            "ranked_payables": scored_payables,
            "optimized_payout_plan": selected_payouts
        }
import random
from decimal import Decimal

class FinOSEvaluationHarness:
    @staticmethod
    def generate_synthetic_dataset(num_records: int = 1000, planted_errors: int = 50) -> dict:
        """
        CONCEPT: SYNTHETIC EVALUATION HARNESS (F15)
        Generates synthetic financial records with planted discrepancies 
        to test matching engine precision and recall before pilot launch.
        """
        dataset = {
            "bank_transactions": [],
            "settlements": [],
            "expected_discrepancies": planted_errors
        }

        for i in range(num_records):
            gross = random.randint(100000, 5000000) # In paise
            fee = int(gross * 0.02)
            gst = int(fee * 0.18)
            net = gross - fee - gst

            # Plant an error in a subset of records
            if i < planted_errors:
                net -= random.choice([500, 1000, 5000]) # Planted shortfall/mismatch

            dataset["settlements"].append({
                "settlement_id": f"settle_syn_{i}",
                "gross_amount_paise": gross,
                "fee_paise": fee,
                "gst_on_fee_paise": gst,
                "net_amount_paise": net
            })
            
            dataset["bank_transactions"].append({
                "reference": f"settle_syn_{i}",
                "credit_paise": net,
                "narration": f"UPI/RAZORPAY/SETTLEMENT/syn_{i}"
            })

        return dataset
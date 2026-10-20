class DataTierDetectorService:
    @staticmethod
    ancar_analyze_columns(columns: list[str]) -> dict:
        """
        CONCEPT: CAPABILITY-SPECIFIC READINESS (Feature F17)
        Inspects raw file headers to classify the dataset into Data Tiers (1, 2, or 3)
        and provides guided mapping prompts for graceful degradation.
        """
        cleaned_cols = [c.strip().lower() for c in columns if c]
        
        # Check for due date markers
        has_due_date = any(any(k in col for k in ["due date", "duedate", "payment term", "maturity"]) for col in cleaned_cols)
        
        # Check for discount/terms markers
        has_discounts = any(any(k in col for k in ["discount", "terms", "rebate", "penalty"]) for col in cleaned_cols)
        
        # Check for basic transaction markers (date, amount/debit/credit)
        has_basic_txn = any("date" in col for col in cleaned_cols) and any(any(k in col for k in ["amount", "debit", "credit", "withdrawal", "deposit"]) for col in cleaned_cols)

        if not has_basic_txn:
            return {
                "data_tier": 0,
                "status": "INVALID",
                "missing_columns": ["date", "amount/debit/credit"],
                "guided_prompt": "Critical transaction columns missing. Please re-map your columns."
            }

        if has_discounts and has_due_date:
            return {
                "data_tier": 3,
                "status": "ENTERPRISE_READY",
                "unlocked_features": ["Reconciliation", "Payables Priority Engine", "Advanced Scoring"],
                "guided_prompt": "Tier 3 dataset detected. Full enterprise intelligence unlocked."
            }
        elif has_due_date:
            return {
                "data_tier": 2,
                "status": "ADVANCED_READY",
                "unlocked_features": ["Reconciliation", "Payables Priority Engine"],
                "guided_prompt": "Tier 2 dataset detected. Payables Priority Engine unlocked."
            }
        else:
            return {
                "data_tier": 1,
                "status": "BASIC_READY",
                "unlocked_features": ["Reconciliation"],
                "module_locked": "Payables Priority Engine",
                "guided_prompt": "Add due dates to your file upload to unlock the Payables Priority Engine."
            }
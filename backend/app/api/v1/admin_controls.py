@router.get("/overview", status_code=status.HTTP_200_OK)
async def get_admin_governance_overview(
    current_user: UserModel = Depends(require_role([UserRole.ADMIN, UserRole.FINANCE_USER]))
):
    """Retrieves all 9 admin control policies and derived intelligence datasets safely."""
    async with get_tenant_db(str(current_user.organization_id)) as db:
        org_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == current_user.organization_id))
        org = org_res.scalars().first()

        # Fetch overrides safely
        overrides = {}
        try:
            overrides_res = await db.execute(
                select(VendorPolicyOverrideModel).where(VendorPolicyOverrideModel.organization_id == current_user.organization_id)
            )
            overrides = {o.vendor_name: o for o in overrides_res.scalars().all()}
        except Exception:
            overrides = {}

        # Derived Vendor Intelligence
        raw_vendors = [
            {"name": "Sharma Traders Pvt Ltd", "spend_pct": 24.5, "frequency": 8, "recurring_val": 100000.0, "dependency": "HIGH", "disputes": 0, "replacement": "HIGH", "credit_terms": "Net 30 (2/10 Early)"},
            {"name": "Gupta Industries", "spend_pct": 18.2, "frequency": 5, "recurring_val": 75000.0, "dependency": "HIGH", "disputes": 0, "replacement": "MEDIUM", "credit_terms": "Net 15"},
            {"name": "Mehta Traders", "spend_pct": 12.0, "frequency": 3, "recurring_val": 100000.0, "dependency": "MEDIUM", "disputes": 0, "replacement": "LOW", "credit_terms": "Net 30"},
            {"name": "Disputed Packaging Corp", "spend_pct": 6.5, "frequency": 2, "recurring_val": 50000.0, "dependency": "LOW", "disputes": 1, "replacement": "LOW", "credit_terms": "Under Dispute"}
        ]

        vendor_policies = []
        for v in raw_vendors:
            derived = IntelligenceEngine.calculate_vendor_criticality(
                spend_concentration_pct=v["spend_pct"],
                purchase_frequency_per_quarter=v["frequency"],
                recurring_invoice_val_inr=v["recurring_val"],
                supply_dependency=v["dependency"],
                dispute_count=v["disputes"],
                replacement_difficulty=v["replacement"]
            )
            has_override = v["name"] in overrides
            confirmed_crit = overrides[v["name"]].confirmed_criticality if has_override else derived["classification"]
            vendor_policies.append({
                "vendor_name": v["name"],
                "credit_terms": v["credit_terms"],
                "derived_score": derived["score"],
                "derived_criticality": derived["classification"],
                "confirmed_criticality": confirmed_crit,
                "is_overridden": has_override,
                "override_reason": overrides[v["name"]].override_reason if has_override else None,
                "contributing_factors": derived["contributing_factors"]
            })

        # Derived Debtor Intelligence
        raw_customers = [
            {"name": "Nova Retail Ltd", "outstanding": 135000.0, "days_overdue": 28, "delay_habit": 25, "broken_promises": 2, "dispute": False},
            {"name": "Rahul Enterprises", "outstanding": 75000.0, "days_overdue": 5, "delay_habit": 18, "broken_promises": 1, "dispute": False},
            {"name": "Bright Brands", "outstanding": 60000.0, "days_overdue": 14, "delay_habit": 12, "broken_promises": 0, "dispute": False},
            {"name": "Amit Traders", "outstanding": 40000.0, "days_overdue": 2, "delay_habit": 3, "broken_promises": 0, "dispute": False}
        ]

        customer_intelligence = []
        for c in raw_customers:
            debtor_score = IntelligenceEngine.calculate_debtor_collection_priority(
                outstanding_inr=c["outstanding"],
                days_overdue=c["days_overdue"],
                habitual_late_days=c["delay_habit"],
                broken_promises=c["broken_promises"],
                has_active_dispute=c["dispute"]
            )
            customer_intelligence.append({
                "customer_name": c["name"],
                "outstanding_display": f"₹{c['outstanding']:,.2f}",
                "days_overdue": c["days_overdue"],
                "priority_score": debtor_score["score"],
                "collection_priority": debtor_score["priority"],
                "recommended_action": debtor_score["action"],
                "risk_factors": debtor_score["factors"]
            })

        # Fetch Audit Trail safely
        audit_records = []
        try:
            audit_res = await db.execute(
                select(AuditEventModel)
                .where(AuditEventModel.organization_id == current_user.organization_id)
                .order_by(desc(AuditEventModel.timestamp))
                .limit(20)
            )
            audit_records = [
                {
                    "id": str(a.id),
                    "action": a.action,
                    "table_name": a.table_name,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                    "details": a.new_value_json
                }
                for a in audit_res.scalars().all()
            ]
        except Exception:
            audit_records = []

        return {
            "company_settings": {
                "name": getattr(org, "name", "FinOS Workspace"),
                "gstin": getattr(org, "gstin", "27ABCDE1234F1Z5") or "27ABCDE1234F1Z5",
                "pan": getattr(org, "pan", "ABCDE1234F") or "ABCDE1234F",
                "financial_year_start": getattr(org, "financial_year_start", "04-01") or "04-01",
                "business_type": "MSME / D2C Enterprise",
                "owner_email": current_user.email
            },
            "cash_policy": {
                "available_cash_source": "HDFC Bank Current Account Closing",
                "emergency_reserve_floor_inr": (int(getattr(org, "emergency_reserve_paise", 40000000) or 40000000)) / 100,
                "reserve_policy_mode": getattr(org, "reserve_policy_mode", "NON_NEGOTIABLE") or "NON_NEGOTIABLE"
            },
            "payment_policy": {
                "approval_threshold_inr": 50000.0,
                "payment_run_dates": [10, 25],
                "min_discount_threshold_pct": 1.50,
                "discount_policy_source": "HISTORY_DERIVED"
            },
            "vendor_policies": vendor_policies,
            "customer_intelligence": customer_intelligence,
            "audit_trail": audit_records
        }
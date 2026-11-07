import io, csv
from datetime import datetime
from app.engine.universal_parser import UniversalFileParser
from app.services.normalizer import NormalizerService

class InvoiceAdapter:
    @staticmethod
    def parse_vendor_invoices(file_bytes: bytes, filename: str, source_file_id: str) -> list[dict]:
        raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        parsed = []
        row_idx = 0

        for raw_r in raw_rows:
            row_idx += 1
            # Clean headers: lowercase and strip spaces
            r = {str(k).strip().lower(): str(v).strip() for k, v in raw_r.items() if k}

            # Substring-tolerant vendor lookup (handles 'vendorvendor name', 'supplier', etc.)
            vendor = None
            for k, v in r.items():
                if any(sub in k for sub in ["vendor", "supplier", "party"]):
                    vendor = v
                    break
            if not vendor:
                vendor = r.get("name") or f"Vendor-{row_idx}"

            # Substring-tolerant invoice number lookup
            inv_no = None
            for k, v in r.items():
                if any(sub in k for sub in ["invoice", "bill", "inv"]):
                    inv_no = v
                    break
            if not inv_no:
                inv_no = f"INV-{row_idx:04d}"

            # Substring-tolerant due date lookup
            raw_due_date = None
            for k, v in r.items():
                if any(sub in k for sub in ["due", "payment due", "maturity"]):
                    raw_due_date = v
                    break

            # Invoice date lookup
            raw_inv_date = None
            for k, v in r.items():
                if "date" in k and "due" not in k:
                    raw_inv_date = v
                    break

            # Amount lookup
            raw_amount = "0"
            for k, v in r.items():
                if any(sub in k for sub in ["amount", "payable", "total", "gross", "balance"]):
                    raw_amount = v
                    break

            # Discount lookup
            raw_discount = "0"
            for k, v in r.items():
                if "discount" in k:
                    raw_discount = v
                    break

            criticality = r.get("criticality") or r.get("priority") or "STANDARD"
            status = r.get("status") or r.get("payment_status") or "CONFIRMED"

            try:
                inv_date = NormalizerService.parse_date(raw_inv_date) if raw_inv_date else datetime.utcnow().strftime("%Y-%m-%d")
                due_date = NormalizerService.parse_date(raw_due_date) if raw_due_date else inv_date
                net_paise = NormalizerService.amount_to_paise(raw_amount)
                clean_disc = str(raw_discount).replace("%", "").strip()
                discount_pct = float(clean_disc) if clean_disc else 0.0

                parsed.append({
                    "source_file_id": source_file_id,
                    "vendor_name": str(vendor).strip(),
                    "invoice_number": str(inv_no).strip(),
                    "invoice_date": inv_date,
                    "due_date": due_date,
                    "gross_amount_paise": net_paise,
                    "tds_amount_paise": 0,
                    "net_payable_paise": net_paise,
                    "discount_percentage": discount_pct,
                    "criticality": str(criticality).upper().strip(),
                    "payment_status": str(status).upper().strip(),
                    "row_index": row_idx
                })
            except Exception as e:
                print(f"Row {row_idx} parse error:", e)
                continue

        return parsed

from app.engine.universal_parser import UniversalFileParser
from app.services.normalizer import NormalizerService

class TallyAdapter:
    @staticmethod
    def parse_export(file_bytes: bytes, filename: str, source_file_id: str) -> dict:
        """
        CONCEPT: ACCOUNTING BOOKS INGESTION & DUAL-ENGINE EXTRACTION
        Parses Tally daybook/ledger exports (CSV or Excel), normalizes amounts into 
        signed integer paise, extracts canonical ledger entries for Check 2 reconciliation, 
        AND automatically extracts purchase vouchers to drive the F16 Payables Engine.
        """
        raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        
        parsed_ledgers = []
        extracted_bills = []
        row_index = 0

        for row in raw_rows:
            row_index += 1
            
            raw_date = row.get("Date") or row.get("Voucher Date") or row.get("date")
            voucher_type = row.get("Voucher Type") or row.get("voucher_type") or "Journal"
            voucher_number = row.get("Voucher No.") or row.get("Voucher Number") or row.get("voucher_number") or f"TALLY-VCH-{row_index}"
            ledger_name = row.get("Particulars") or row.get("Ledger Name") or row.get("party") or row.get("Name")
            raw_debit = row.get("Debit") or row.get("debit") or "0"
            raw_credit = row.get("Credit") or row.get("credit") or "0"

            if not raw_date or not ledger_name:
                continue
            
            cleaned_ledger_name = NormalizerService.clean_string(ledger_name)
            if "GRAND TOTAL" in cleaned_ledger_name or "INTERIM TOTAL" in cleaned_ledger_name or "TOTAL" == cleaned_ledger_name:
                continue

            try:
                voucher_date = NormalizerService.parse_date(raw_date)
                debit_paise = NormalizerService.amount_to_paise(raw_debit)
                credit_paise = NormalizerService.amount_to_paise(raw_credit)

                net_amount_paise = credit_paise if credit_paise > 0 else -debit_paise

                # 1. Canonical Ledger Entry for Check 2 Bank/Books Reconciliation
                record = {
                    "source_file_id": source_file_id,
                    "voucher_date": voucher_date,
                    "voucher_type": str(voucher_type).strip(),
                    "ledger_name": cleaned_ledger_name,
                    "amount_paise": net_amount_paise,
                    "raw_row_index": row_index
                }
                parsed_ledgers.append(record)

                # 2. Native Payables Intelligence: Extract Purchase vouchers into Vendor Bills
                if str(voucher_type).strip().lower() in ["purchase", "bill"]:
                    purchase_amt = debit_paise if debit_paise > 0 else abs(net_amount_paise)
                    if purchase_amt > 0:
                        extracted_bills.append({
                            "source_file_id": source_file_id,
                            "vendor_name": cleaned_ledger_name,
                            "invoice_number": str(voucher_number).strip(),
                            "invoice_date": voucher_date,
                            "due_date": voucher_date,  # Default or extended via payment terms
                            "amount_paise": purchase_amt,
                            "tax_paise": 0,
                            "payment_terms": "Net 30",
                            "payment_status": "UNPAID"
                        })

            except Exception as e:
                raise ValueError(f"Error parsing Tally export at row {row_index}: {str(e)}")

        return {
            "ledger_entries": parsed_ledgers,
            "vendor_bills": extracted_bills
        }
        
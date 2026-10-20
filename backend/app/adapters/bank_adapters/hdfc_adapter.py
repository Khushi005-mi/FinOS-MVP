from app.engine.universal_parser import UniversalFileParser
from app.services.normalizer import NormalizerService

class HDFCBankAdapter:
    @staticmethod
    def parse_statement(file_bytes: bytes, filename: str, source_file_id: str) -> list[dict]:
        """
        CONCEPT: HDFC BANK ADAPTER
        Ingests raw HDFC bank statement bytes (CSV or Excel), normalizes dates 
        and amounts into integer paise, and outputs canonical transaction records.
        """
        # 1. Use Universal Parser to convert CSV/Excel into standardized row dicts
        raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        
        parsed_records = []
        row_index = 0

        for row in raw_rows:
            row_index += 1
            
            # Flexible column header lookups (handles minor variations in HDFC exports)
            raw_date = row.get("Date") or row.get("Txn Date") or row.get("Transaction Date")
            raw_narration = row.get("Narration") or row.get("Particulars") or row.get("Description")
            raw_ref = row.get("Chq/Ref Number") or row.get("Ref No.") or row.get("Reference")
            raw_debit = row.get("Withdrawal Amt") or row.get("Debit Amount") or row.get("Debit") or "0"
            raw_credit = row.get("Deposit Amt") or row.get("Credit Amount") or row.get("Credit") or "0"
            raw_balance = row.get("Closing Balance") or row.get("Balance") or "0"

            # Skip empty rows
            if not raw_date or not raw_narration:
                continue

            try:
                # 2. NORMALIZE VIA NORMALIZER SERVICE
                normalized_date = NormalizerService.parse_date(raw_date)
                cleaned_narration = NormalizerService.clean_string(raw_narration)
                
                debit_paise = NormalizerService.amount_to_paise(raw_debit)
                credit_paise = NormalizerService.amount_to_paise(raw_credit)
                balance_paise = NormalizerService.amount_to_paise(raw_balance)

                record = {
                    "source_file_id": source_file_id,
                    "date": normalized_date,
                    "narration": cleaned_narration,
                    "debit_paise": debit_paise,
                    "credit_paise": credit_paise,
                    "balance_paise": balance_paise,
                    "reference": str(raw_ref).strip() if raw_ref else None,
                    "raw_row_index": row_index
                }
                
                parsed_records.append(record)
                
            except Exception as e:
                raise ValueError(f"Error parsing HDFC statement at row {row_index}: {str(e)}")

        return parsed_records
from app.engine.universal_parser import UniversalFileParser
from app.services.normalizer import NormalizerService

class TallyAdapter:
    @staticmethod
    def parse_export(file_bytes: bytes, filename: str, source_file_id: str) -> list[dict]:
        """
        CONCEPT: ACCOUNTING BOOKS INGESTION & NOISE FILTERING
        Parses Tally daybook/ledger exports (CSV or Excel), strips sub-totals,
        normalizes amounts into signed integer paise, and builds canonical ledger entries.
        """
        # 1. Use Universal File Parser to ingest CSV/Excel into standardized row dicts
        raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        
        parsed_ledgers = []
        row_index = 0

        for row in raw_rows:
            row_index += 1
            
            # Extract standard Tally export fields with flexible fallbacks
            raw_date = row.get("Date") or row.get("Voucher Date") or row.get("date")
            voucher_type = row.get("Voucher Type") or row.get("voucher_type") or "Journal"
            ledger_name = row.get("Particulars") or row.get("Ledger Name") or row.get("party") or row.get("Name")
            raw_debit = row.get("Debit") or row.get("debit") or "0"
            raw_credit = row.get("Credit") or row.get("credit") or "0"

            # Skip empty rows or rows missing vital dates/ledgers
            if not raw_date or not ledger_name:
                continue
            
            # Filter out Tally summary noise words in particulars
            cleaned_ledger_name = NormalizerService.clean_string(ledger_name)
            if "GRAND TOTAL" in cleaned_ledger_name or "INTERIM TOTAL" in cleaned_ledger_name or "TOTAL" == cleaned_ledger_name:
                continue

            try:
                # 2. NORMALIZE DATES & AMOUNTS (Signed Integer Paise)
                voucher_date = NormalizerService.parse_date(raw_date)
                
                debit_paise = NormalizerService.amount_to_paise(raw_debit)
                credit_paise = NormalizerService.amount_to_paise(raw_credit)

                # SIGNED ACCOUNTING CONVENTION:
                # In accounting books, money coming in (Credit) is positive inflow, 
                # money going out (Debit) is negative outflow.
                net_amount_paise = credit_paise if credit_paise > 0 else -debit_paise

                record = {
                    "source_file_id": source_file_id,
                    "voucher_date": voucher_date,
                    "voucher_type": str(voucher_type).strip(),
                    "ledger_name": cleaned_ledger_name,
                    "amount_paise": net_amount_paise,
                    "raw_row_index": row_index  # [LINEAGE] Exact row index in Tally export
                }
                
                parsed_ledgers.append(record)

            except Exception as e:
                raise ValueError(f"Error parsing Tally export at row {row_index}: {str(e)}")

        return parsed_ledgers
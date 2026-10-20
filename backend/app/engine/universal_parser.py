import io
import csv
import pandas as pd

class UniversalFileParser:
    @staticmethod
    def parse_file_to_dicts(file_bytes: bytes, filename: str) -> list[dict]:
        """Parses CSV or Excel into standardized dictionaries."""
        filename_lower = filename.lower()
        
        if filename_lower.endswith(('.xlsx', '.xls')):
            try:
                df = pd.read_excel(io.BytesIO(file_bytes))
                df = df.dropna(how='all')
                return df.fillna("").to_dict(orient="records")
            except Exception as e:
                raise ValueError(f"Failed to parse Excel file: {str(e)}")
                
        elif filename_lower.endswith('.csv'):
            try:
                try:
                    text_stream = file_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    text_stream = file_bytes.decode('latin1')

                csv_reader = csv.DictReader(io.StringIO(text_stream))
                return [row for row in csv_reader]
            except Exception as e:
                raise ValueError(f"Failed to parse CSV file: {str(e)}")
        else:
            raise ValueError("Unsupported file format. Only .csv, .xlsx, and .xls are supported.")

    @staticmethod
    def sniff_file_type(raw_rows: list[dict]) -> str:
        """
        AUTOMATIC FILE TYPE DETECTOR:
        Inspects headers to reliably classify the dataset, eliminating manual dropdown errors.
        """
        if not raw_rows:
            return "UNKNOWN"

        first_row_keys = [str(k).strip().lower() for k in raw_rows[0].keys()]

        # 1. Payment Gateway Check
        if any(k in first_row_keys for k in ["settlement id", "settlement_id", "gross amount", "gross_amount", "net amount"]):
            return "RAZORPAY_GATEWAY"

        # 2. Accounting Ledger Check
        if any(k in first_row_keys for k in ["voucher no.", "voucher no", "voucher type", "particulars"]):
            return "TALLY_LEDGER"

        # 3. Bank Statement Check
        if any(k in first_row_keys for k in ["closing balance", "withdrawal amt", "deposit amt", "chq/ref number"]):
            return "HDFC_BANK"

        # 4. Vendor Invoices Check
        if any(k in first_row_keys for k in ["invoice number", "due date", "vendor"]):
            return "VENDOR_INVOICE"

        return "UNKNOWN"
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import re

class NormalizerService:
    @staticmethod
    def amount_to_paise(amount_str: str | float | Decimal) -> int:
        """
        CONCEPT: ZERO FLOATING-POINT DRIFT
        Converts any monetary representation into integer PAISE.
        Example: "₹1,250.75" -> 125075 paise.
        """
        if amount_str is None or amount_str == "":
            return 0
        
        if isinstance(amount_str, float):
            raise ValueError("Float detected for money. Floats are banned in FinOS.")

        # Clean string: remove currency symbols, commas, spaces
        cleaned = re.sub(r'[^\d.-]', '', str(amount_str))
        
        try:
            dec_val = Decimal(cleaned).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            return int(dec_val * Decimal('100'))
        except Exception as e:
            raise ValueError(f"Failed to normalize amount '{amount_str}': {str(e)}")

    @staticmethod
    def parse_date(date_str: str) -> str:
        """
        CONCEPT: DETERMINISTIC DATE FORMATTING
        Standardizes financial dates into strict ISO format: YYYY-MM-DD.
        """
        if not date_str:
            raise ValueError("Date string cannot be empty")
        
        date_str = str(date_str).strip()
        
        formats = [
            "%Y-%m-%d",  # 2026-10-02
            "%d/%m/%Y",  # 02/10/2026
            "%m/%d/%Y",  # 10/02/2026
            "%d-%m-%Y",  # 02-10-2026
            "%d-%b-%Y",  # 02-Oct-2026
            "%Y/%m/%d"   # 2026/02/10
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
                
        raise ValueError(f"Unable to parse date format for string: '{date_str}'")

    @staticmethod
    def clean_string(val: str) -> str:
        """
        CONCEPT: STRING NORMALIZATION
        Strips extra whitespace, normalizes casing for counterparty matching.
        """
        if not val:
            return ""
        cleaned = re.sub(r'\s+', ' ', str(val)).strip().upper()
        return cleaned
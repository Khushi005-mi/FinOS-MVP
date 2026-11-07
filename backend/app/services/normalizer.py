from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import re

class Normalizer:
    """
    Zero-Floating-Point Drift Normalizer:
    - Converts currency amounts strictly to integer paise (NUMERIC(20,0)).
    - Normalizes diverse date formats into ISO standard (YYYY-MM-DD).
    - Cleans and canonicalizes narration, party names, and references.
    """

    @staticmethod
    def clean_string(val: str | None) -> str:
        """Sanitizes text, removes extraneous whitespace and non-printable characters."""
        if val is None:
            return ""
        s = str(val).strip()
        s = re.sub(r'[\r\n\t]+', ' ', s)
        s = re.sub(r'\s+', ' ', s)
        return s

    @staticmethod
    def amount_to_paise(amount_str: str | float | int | Decimal) -> Decimal:
        """Converts any currency representation into integer paise."""
        if amount_str is None or amount_str == "":
            return Decimal("0")
        
        if isinstance(amount_str, (int, float, Decimal)):
            d = Decimal(str(amount_str))
        else:
            cleaned = re.sub(r'[^\d.-]', '', str(amount_str))
            if not cleaned or cleaned == "-":
                return Decimal("0")
            d = Decimal(cleaned)

        paise = (d * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return paise

    @staticmethod
    def parse_date(date_str: str | datetime) -> str:
        """Normalizes multiple Indian and International date formats to ISO YYYY-MM-DD."""
        if not date_str:
            return datetime.today().strftime("%Y-%m-%d")
        
        if hasattr(date_str, "strftime"):
            return date_str.strftime("%Y-%m-%d")

        date_str = str(date_str).strip()
        
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", 
            "%Y/%m/%d", "%d %b %Y", "%d-%b-%Y",
            "%d/%m/%y", "%d-%m-%y"
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
                
        return datetime.today().strftime("%Y-%m-%d")

# Universal compatibility aliases
NormalizerService = Normalizer
normalizer_service = Normalizer

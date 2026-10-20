from app.engine.universal_parser import UniversalFileParser
from app.services.normalizer import NormalizerService

class RazorpayAdapter:
    @staticmethod
    def parse_settlement(file_bytes: bytes, filename: str, source_file_id: str) -> list[dict]:
        raw_rows = UniversalFileParser.parse_file_to_dicts(file_bytes, filename)
        parsed_settlements = []
        row_index = 0

        for row in raw_rows:
            row_index += 1
            settlement_id = row.get("Settlement ID") or row.get("settlement_id") or row.get("Payout ID")
            raw_date = row.get("Settlement Date") or row.get("settlement_date") or row.get("Date")
            raw_gross = row.get("Gross Amount") or row.get("gross_amount") or row.get("Amount") or "0"
            raw_fee = row.get("Fee") or row.get("fee") or row.get("MDR") or "0"
            raw_gst = row.get("GST on Fee") or row.get("gst_on_fee") or "0"
            raw_refunds = row.get("Refund Amount") or row.get("refund_amount") or "0"
            raw_holds = row.get("Hold Amount") or row.get("hold_amount") or "0"
            raw_net = row.get("Net Amount") or row.get("net_amount") or row.get("Net Payout") or "0"

            if not settlement_id or not raw_date:
                continue

            try:
                settlement_date = NormalizerService.parse_date(raw_date)
                gross_paise = NormalizerService.amount_to_paise(raw_gross)
                fee_paise = NormalizerService.amount_to_paise(raw_fee)
                gst_paise = NormalizerService.amount_to_paise(raw_gst)
                refunds_paise = NormalizerService.amount_to_paise(raw_refunds)
                holds_paise = NormalizerService.amount_to_paise(raw_holds)
                net_paise = NormalizerService.amount_to_paise(raw_net)

                record = {
                    "source_file_id": source_file_id,
                    "settlement_id": str(settlement_id).strip(),
                    "gross_amount_paise": gross_paise,
                    "fee_paise": fee_paise,
                    "gst_on_fee_paise": gst_paise,
                    "refunds_paise": refunds_paise,
                    "holds_paise": holds_paise,
                    "net_amount_paise": net_paise,
                    "settlement_date": settlement_date,
                    "raw_row_index": row_index
                }
                parsed_settlements.append(record)
            except Exception as e:
                raise ValueError(f"Error parsing Razorpay settlement at row {row_index}: {str(e)}")

        return parsed_settlements
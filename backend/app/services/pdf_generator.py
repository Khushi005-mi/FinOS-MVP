import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class EvidencePackGenerator:
    @staticmethod
    def generate_evidence_pdf(
        org_name: str,
        gstin: str,
        period_label: str,
        metrics: dict,
        discrepancies: list[dict],
        source_hashes: list[dict]
    ) -> bytes:
        """
        CONCEPT: PROGRAMMATIC AUDIT-GRADE PDF GENERATION (F10)
        Builds a structured, professional PDF evidence pack for auditors and lenders,
        embedding source file SHA-256 hashes and verification summaries.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle', parent=styles['Heading1'], fontSize=20, leading=24,
            textColor=colors.HexColor('#0F172A'), spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle', parent=styles['Normal'], fontSize=10, leading=14,
            textColor=colors.HexColor('#64748B'), spaceAfter=15
        )
        section_heading = ParagraphStyle(
            'SectionHeading', parent=styles['Heading2'], fontSize=14, leading=18,
            textColor=colors.HexColor('#1E293B'), spaceBefore=15, spaceAfter=8
        )
        body_style = ParagraphStyle(
            'ReportBody', parent=styles['Normal'], fontSize=9, leading=12,
            textColor=colors.HexColor('#334155')
        )

        # --- 1. HEADER SECTION ---
        story.append(Paragraph("FINOS AUDIT EVIDENCE PACK", title_style))
        story.append(Paragraph(f"<b>Company:</b> {org_name} &nbsp;&nbsp;|&nbsp;&nbsp; <b>GSTIN:</b> {gstin or 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Period:</b> {period_label}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#CBD5E1'), spaceAfter=15))

        # --- 2. EXECUTIVE SUMMARY TABLE ---
        story.append(Paragraph("1. Executive Reconciliation Summary", section_heading))
        summary_data = [
            ["Total Transactions Processed", f"{metrics.get('total_transactions', 0):,}"],
            ["Auto-Match Rate", metrics.get('match_rate', '0.0%')],
            ["Open Exceptions Count", str(metrics.get('open_exceptions_count', 0))],
            ["Total Rupees at Risk", f"₹{metrics.get('rupees_at_risk', 0):,.2f}"]
        ]
        summary_table = Table(summary_data, colWidths=[250, 290])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0'))
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        # --- 3. SOURCE FILE CRYPTOGRAPHIC VAULT HASHES ---
        story.append(Paragraph("2. Immutable Source Provenance & SHA-256 Hashes", section_heading))
        story.append(Paragraph("Every figure in this report links cryptographically to the untouched raw source files vaulted below:", body_style))
        story.append(Spacer(1, 8))

        hash_headers = ["File Name", "Source Type", "SHA-256 Cryptographic Fingerprint"]
        hash_rows = [[h.get('filename'), h.get('file_type'), h.get('sha256_hash')] for h in source_hashes]
        if not hash_rows:
            hash_rows = [["No source files registered in vault.", "", ""]]

        hash_table = Table([hash_headers] + hash_rows, colWidths=[150, 100, 290])
        hash_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1'))
        ]))
        story.append(hash_table)
        story.append(Spacer(1, 15))

        # --- 4. OPEN DISCREPANCIES EXCEPTION QUEUE ---
        story.append(Paragraph("3. Unresolved Exceptions & Discrepancies", section_heading))
        disc_headers = ["Check Type", "Reason Code", "Amount", "Status"]
        disc_rows = [[d.get('check_type'), d.get('reason_code'), d.get('amount_display'), d.get('status')] for d in discrepancies]
        if not disc_rows:
            disc_rows = [["No open discrepancies found for this period.", "", "", ""]]

        disc_table = Table([disc_headers] + disc_rows, colWidths=[160, 160, 110, 110])
        disc_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1'))
        ]))
        story.append(disc_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
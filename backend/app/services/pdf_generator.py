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
        pan: str,
        period_label: str,
        metrics: dict,
        discrepancies: list[dict],
        source_hashes: list[dict],
        audit_trail: list[dict] = None
    ) -> bytes:
        """
        FinOS Programmatic Audit-Grade PDF Evidence Pack Generator (F10).
        Embeds SHA-256 file provenance, 3-way reconciliation metrics,
        open exceptions, and statutory audit events.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
        )
        story = []
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle', parent=styles['Heading1'], fontSize=18, leading=22,
            textColor=colors.HexColor('#0F172A'), spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle', parent=styles['Normal'], fontSize=9, leading=13,
            textColor=colors.HexColor('#475569'), spaceAfter=12
        )
        section_heading = ParagraphStyle(
            'SectionHeading', parent=styles['Heading2'], fontSize=12, leading=16,
            textColor=colors.HexColor('#1E293B'), spaceBefore=12, spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody', parent=styles['Normal'], fontSize=8, leading=11,
            textColor=colors.HexColor('#334155')
        )
        table_cell_style = ParagraphStyle(
            'TableCell', parent=styles['Normal'], fontSize=7.5, leading=10,
            textColor=colors.HexColor('#1E293B')
        )
        table_head_style = ParagraphStyle(
            'TableHead', parent=styles['Normal'], fontSize=8, leading=10,
            textColor=colors.white, fontName='Helvetica-Bold'
        )

        # --- 1. HEADER SECTION ---
        story.append(Paragraph("FINOS INSTITUTIONAL AUDIT EVIDENCE PACK", title_style))
        story.append(Paragraph(
            f"<b>Company:</b> {org_name} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>GSTIN:</b> {gstin or 'Not Registered'} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>PAN:</b> {pan or 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Audit Period:</b> {period_label}",
            subtitle_style
        ))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#CBD5E1'), spaceAfter=12))

        # --- 2. EXECUTIVE RECONCILIATION & LIQUIDITY SUMMARY ---
        story.append(Paragraph("1. Executive Reconciliation & Cash Position Summary", section_heading))
        summary_data = [
            [Paragraph("Verified Bank Closing Cash", body_style), Paragraph(f"₹{metrics.get('available_bank_cash', 0):,.2f}", body_style)],
            [Paragraph("Emergency Reserve Floor Policy", body_style), Paragraph(f"₹{metrics.get('emergency_reserve', 0):,.2f} ({metrics.get('policy_mode', 'Protected Buffer')})", body_style)],
            [Paragraph("Safe Operational Payment Capacity", body_style), Paragraph(f"₹{metrics.get('safe_capacity', 0):,.2f}", body_style)],
            [Paragraph("Gateway-to-Bank Auto-Match Rate", body_style), Paragraph(f"{metrics.get('match_rate', '0.0%')} ({metrics.get('total_transactions', 0)} transactions evaluated)", body_style)],
            [Paragraph("Open Reconciliation Exceptions", body_style), Paragraph(str(metrics.get('open_exceptions_count', 0)), body_style)],
            [Paragraph("Total Uncredited Money at Risk", body_style), Paragraph(f"₹{metrics.get('rupees_at_risk', 0):,.2f}", body_style)]
        ]
        summary_table = Table(summary_data, colWidths=[240, 300])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 10))

        # --- 3. SOURCE FILE CRYPTOGRAPHIC PROVENANCE ---
        story.append(Paragraph("2. Immutable Source Provenance & SHA-256 Cryptographic Hashes", section_heading))
        story.append(Paragraph(
            "Every metric in this dossier links back to the untouched raw statement files vaulted below:",
            body_style
        ))
        story.append(Spacer(1, 6))

        hash_headers = [
            Paragraph("Filename", table_head_style),
            Paragraph("Source Type", table_head_style),
            Paragraph("Records", table_head_style),
            Paragraph("SHA-256 Hash", table_head_style)
        ]
        hash_rows = []
        for h in source_hashes:
            hash_rows.append([
                Paragraph(str(h.get('filename') or 'statement.csv'), table_cell_style),
                Paragraph(str(h.get('file_type') or 'DATA'), table_cell_style),
                Paragraph(str(h.get('records_count') or 0), table_cell_style),
                Paragraph(str(h.get('sha256_hash') or 'N/A')[:32] + "...", table_cell_style)
            ])
        if not hash_rows:
            hash_rows = [[Paragraph("No source files registered.", table_cell_style), Paragraph("", table_cell_style), Paragraph("", table_cell_style), Paragraph("", table_cell_style)]]

        hash_table = Table([hash_headers] + hash_rows, colWidths=[160, 110, 60, 210])
        hash_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6)
        ]))
        story.append(hash_table)
        story.append(Spacer(1, 10))

        # --- 4. OPEN RECONCILIATION EXCEPTIONS ---
        story.append(Paragraph("3. Unresolved Exceptions & Discrepancies", section_heading))
        disc_headers = [
            Paragraph("Check Type", table_head_style),
            Paragraph("Reason / Variance Description", table_head_style),
            Paragraph("Amount", table_head_style),
            Paragraph("Status", table_head_style)
        ]
        disc_rows = []
        for d in discrepancies:
            disc_rows.append([
                Paragraph(str(d.get('check_type') or 'Check 2'), table_cell_style),
                Paragraph(str(d.get('reason_code') or d.get('description') or 'Variance'), table_cell_style),
                Paragraph(str(d.get('amount_display') or '₹0.00'), table_cell_style),
                Paragraph(str(d.get('status') or 'OPEN'), table_cell_style)
            ])
        if not disc_rows:
            disc_rows = [[Paragraph("Zero open discrepancies detected across active periods.", table_cell_style), Paragraph("Clean Reconciliation", table_cell_style), Paragraph("₹0.00", table_cell_style), Paragraph("VERIFIED", table_cell_style)]]

        disc_table = Table([disc_headers] + disc_rows, colWidths=[120, 250, 90, 80])
        disc_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6)
        ]))
        story.append(disc_table)
        story.append(Spacer(1, 10))

        # --- 5. AUDIT EVENTS COMPLIANCE LOG ---
        if audit_trail:
            story.append(Paragraph("4. Regulatory Audit Trail Log", section_heading))
            audit_headers = [
                Paragraph("Timestamp", table_head_style),
                Paragraph("Action Type", table_head_style),
                Paragraph("Target Table", table_head_style),
                Paragraph("Audit Narrative", table_head_style)
            ]
            audit_rows = []
            for a in audit_trail[:10]:
                audit_rows.append([
                    Paragraph(str(a.get('created_at') or '')[:19], table_cell_style),
                    Paragraph(str(a.get('action') or 'ACTION'), table_cell_style),
                    Paragraph(str(a.get('table_name') or 'N/A'), table_cell_style),
                    Paragraph(str(a.get('details') or '')[:40], table_cell_style)
                ])
            audit_table = Table([audit_headers] + audit_rows, colWidths=[100, 130, 90, 220])
            audit_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6)
            ]))
            story.append(audit_table)

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

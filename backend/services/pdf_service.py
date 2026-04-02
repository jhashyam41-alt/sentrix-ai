"""
PDF generation service for AMLGuard audit log exports.
"""
import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_audit_pdf(logs: list) -> bytes:
    """Generate a PDF report from audit log entries."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = getSampleStyleSheet()
    cell_style = ParagraphStyle("Cell", parent=styles["Normal"], fontSize=7, leading=9)
    header_style = ParagraphStyle(
        "Header", parent=styles["Normal"], fontSize=7, leading=9, textColor=colors.white
    )
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=16, spaceAfter=6)

    elements = [
        Paragraph("AMLGuard \u2014 Audit Log Report", title_style),
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  |  Records: {len(logs)}",
            styles["Normal"],
        ),
        Spacer(1, 12),
    ]

    header_row = [
        Paragraph(h, header_style)
        for h in ["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP"]
    ]
    data = [header_row]

    for log in logs:
        ts = log.get("timestamp", "")[:19].replace("T", " ")
        data.append([
            Paragraph(ts, cell_style),
            Paragraph(log.get("user_name", ""), cell_style),
            Paragraph(log.get("user_role", ""), cell_style),
            Paragraph(log.get("action_type", ""), cell_style),
            Paragraph(log.get("module", ""), cell_style),
            Paragraph(str(log.get("record_id", ""))[:20], cell_style),
            Paragraph(log.get("ip_address", ""), cell_style),
        ])

    col_widths = [1.6 * inch, 1.3 * inch, 1.0 * inch, 1.6 * inch, 0.9 * inch, 1.5 * inch, 1.2 * inch]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d1117")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#1e2530")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    doc.build(elements)
    return buf.getvalue()

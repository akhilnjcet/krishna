"""
Common styles, canvas, and layout helpers for Krishna Engineering Works ERP Documentation.
Built using ReportLab 5.x.
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
)

# ─── COLOR PALETTE ────────────────────────────────────────────────────────────
COLOR_PRIMARY_DARK = colors.HexColor('#0F172A')    # Slate 900
COLOR_PRIMARY_BLUE = colors.HexColor('#1E3A8A')    # Deep Blue
COLOR_ACCENT_BLUE  = colors.HexColor('#2563EB')    # Royal Blue
COLOR_ACCENT_GOLD  = colors.HexColor('#D97706')    # Amber 600
COLOR_SUCCESS      = colors.HexColor('#059669')    # Emerald 600
COLOR_DANGER       = colors.HexColor('#DC2626')    # Rose 600
COLOR_BG_LIGHT     = colors.HexColor('#F8FAFC')    # Slate 50
COLOR_BG_ALT       = colors.HexColor('#F1F5F9')    # Slate 100
COLOR_BORDER       = colors.HexColor('#CBD5E1')    # Slate 300
COLOR_TEXT_MAIN    = colors.HexColor('#1E293B')    # Slate 800
COLOR_TEXT_MUTED   = colors.HexColor('#64748B')    # Slate 500

COMPANY_INFO = {
    'name': 'KRISHNA ENGINEERING WORKS',
    'tagline': 'PRECISION INDUSTRIAL FABRICATION & ENTERPRISE ERP SOLUTIONS',
    'address': 'Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala - 679514',
    'phone': '+91 94479 40835',
    'email': 'contact@krishnaengg.com',
    'web': 'https://krishnaengg.com',
    'version': 'ERP Release 6.4 (2026 Enterprise Edition)'
}

# ─── NUMBERED CANVAS (Page X of Y + Running Headers/Footers) ─────────────────
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # Do not draw running header/footer on cover page (page 1)
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont('Helvetica', 8)
        self.setFillColor(COLOR_TEXT_MUTED)

        # ── Running Header ──
        self.drawString(40, 805, COMPANY_INFO['name'])
        self.drawRightString(555, 805, getattr(self, 'doc_title', 'ERP Software User Manual'))
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(40, 798, 555, 798)

        # ── Running Footer ──
        self.line(40, 42, 555, 42)
        self.drawString(40, 30, f"Confidential & Proprietary • {COMPANY_INFO['version']}")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 30, page_str)

        self.restoreState()


# ─── TYPOGRAPHY & STYLES ──────────────────────────────────────────────────────
def get_custom_styles():
    base = getSampleStyleSheet()

    styles = {
        'CoverTitle': ParagraphStyle(
            'CoverTitle',
            parent=base['Title'],
            fontName='Helvetica-Bold',
            fontSize=26,
            leading=32,
            textColor=COLOR_PRIMARY_DARK,
            alignment=1, # Center
            spaceAfter=10
        ),
        'CoverSubtitle': ParagraphStyle(
            'CoverSubtitle',
            parent=base['Normal'],
            fontName='Helvetica',
            fontSize=13,
            leading=18,
            textColor=COLOR_ACCENT_BLUE,
            alignment=1,
            spaceAfter=25
        ),
        'CoverMeta': ParagraphStyle(
            'CoverMeta',
            parent=base['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=14,
            textColor=COLOR_TEXT_MUTED,
            alignment=1
        ),
        'Heading1_Custom': ParagraphStyle(
            'Heading1_Custom',
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=COLOR_PRIMARY_BLUE,
            spaceBefore=16,
            spaceAfter=8,
            keepWithNext=True
        ),
        'Heading2_Custom': ParagraphStyle(
            'Heading2_Custom',
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=COLOR_PRIMARY_DARK,
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        ),
        'Heading3_Custom': ParagraphStyle(
            'Heading3_Custom',
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=COLOR_ACCENT_GOLD,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True
        ),
        'Body_Custom': ParagraphStyle(
            'Body_Custom',
            fontName='Helvetica',
            fontSize=9,
            leading=13.5,
            textColor=COLOR_TEXT_MAIN,
            spaceAfter=6
        ),
        'Bullet_Custom': ParagraphStyle(
            'Bullet_Custom',
            fontName='Helvetica',
            fontSize=9,
            leading=13.5,
            textColor=COLOR_TEXT_MAIN,
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=3
        ),
        'StepNumber': ParagraphStyle(
            'StepNumber',
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=13.5,
            textColor=COLOR_ACCENT_BLUE,
            leftIndent=18,
            firstLineIndent=-14,
            spaceAfter=4
        ),
        'TableText': ParagraphStyle(
            'TableText',
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=COLOR_TEXT_MAIN
        ),
        'TableTextBold': ParagraphStyle(
            'TableTextBold',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=COLOR_TEXT_MAIN
        ),
        'TableHeader': ParagraphStyle(
            'TableHeader',
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.white
        ),
        'AlertText': ParagraphStyle(
            'AlertText',
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=COLOR_TEXT_MAIN
        ),
        'CodeSnippet': ParagraphStyle(
            'CodeSnippet',
            fontName='Courier',
            fontSize=7.5,
            leading=10,
            textColor=COLOR_PRIMARY_DARK
        ),
        'BadgeText': ParagraphStyle(
            'BadgeText',
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=9,
            textColor=colors.white,
            alignment=1
        )
    }
    return styles


# ─── REUSABLE FLOWABLE GENERATORS ─────────────────────────────────────────────
def make_callout(text, title="IMPORTANT NOTICE", callout_type="info", styles=None):
    if styles is None:
        styles = get_custom_styles()

    if callout_type == "danger":
        bg_col = colors.HexColor('#FEF2F2')
        border_col = COLOR_DANGER
        title_col = COLOR_DANGER
        icon = "⚠ WARNING:"
    elif callout_type == "success":
        bg_col = colors.HexColor('#F0FDF4')
        border_col = COLOR_SUCCESS
        title_col = COLOR_SUCCESS
        icon = "✔ VERIFIED:"
    elif callout_type == "alert":
        bg_col = colors.HexColor('#FFFBEB')
        border_col = COLOR_ACCENT_GOLD
        title_col = COLOR_ACCENT_GOLD
        icon = "★ OPERATIONAL PRECAUTION:"
    else: # info
        bg_col = colors.HexColor('#EFF6FF')
        border_col = COLOR_ACCENT_BLUE
        title_col = COLOR_ACCENT_BLUE
        icon = "ℹ SYSTEM GUIDANCE:"

    title_p = Paragraph(f"<b>{icon} {title}</b>", ParagraphStyle('CalloutTitle', parent=styles['Body_Custom'], fontName='Helvetica-Bold', fontSize=8.5, textColor=title_col, spaceAfter=3))
    body_p = Paragraph(text, styles['AlertText'])

    t = Table([[title_p], [body_p]], colWidths=[515])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_col),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('LINEBEFORE', (0,0), (0,-1), 4, border_col),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t


def make_kv_table(data_rows, col_widths=[140, 375], styles=None):
    if styles is None:
        styles = get_custom_styles()

    formatted = []
    for row in data_rows:
        label = Paragraph(f"<b>{row[0]}</b>", styles['TableTextBold'])
        val = Paragraph(str(row[1]), styles['TableText'])
        formatted.append([label, val])

    t = Table(formatted, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), COLOR_BG_ALT),
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t


def make_grid_table(headers, rows, col_widths=None, styles=None):
    if styles is None:
        styles = get_custom_styles()

    if col_widths is None:
        total = 515
        w = total / len(headers)
        col_widths = [w] * len(headers)

    h_row = [Paragraph(f"<b>{h}</b>", styles['TableHeader']) for h in headers]
    body = []
    for r in rows:
        b_row = [Paragraph(str(c), styles['TableText']) for c in r]
        body.append(b_row)

    table_data = [h_row] + body
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY_DARK),
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, COLOR_BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t

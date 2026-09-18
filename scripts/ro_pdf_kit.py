#!/usr/bin/env python3
"""Shared ReportLab toolkit for the Romanian OPSQAI document set.

Aurora Noir look: navy near-black covers, violet/blue accents, light pages.
DejaVu is registered so Romanian diacritics render correctly.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def _fc(query: str) -> str | None:
    try:
        return subprocess.check_output(["fc-match", "-f", "%{file}", query], text=True).strip()
    except Exception:
        return None


for _name, _query in [
    ("Body", "DejaVu Sans"),
    ("Body-Bold", "DejaVu Sans:bold"),
    ("Body-Italic", "DejaVu Sans:italic"),
    ("Body-BoldItalic", "DejaVu Sans:bold:italic"),
    ("Mono", "DejaVu Sans Mono"),
]:
    _path = _fc(_query)
    if _path:
        pdfmetrics.registerFont(TTFont(_name, _path))
registerFontFamily(
    "Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-BoldItalic"
)

# ── Aurora Noir palette ───────────────────────────────────────────────────
NOIR = colors.HexColor("#080B18")
NAVY = colors.HexColor("#111a33")
VIOLET = colors.HexColor("#6D4AFF")
BLUE = colors.HexColor("#2F6BFF")
INK = colors.HexColor("#161B2E")
MUTED = colors.HexColor("#6B7280")
LINE = colors.HexColor("#E2E5EF")
SOFT = colors.HexColor("#F3F4FB")
CREAM = colors.HexColor("#FBF8F1")
WARN = colors.HexColor("#FFF6E5")
WARN_LINE = colors.HexColor("#E7B95A")

PAGE_W, PAGE_H = A4
MARGIN = 19 * mm
AVAIL = PAGE_W - 2 * MARGIN

H1 = ParagraphStyle("H1", fontName="Body-Bold", fontSize=22, leading=27, textColor=VIOLET, spaceAfter=7)
H2 = ParagraphStyle("H2", fontName="Body-Bold", fontSize=14, leading=19, textColor=NAVY, spaceBefore=13, spaceAfter=5)
H3 = ParagraphStyle("H3", fontName="Body-Bold", fontSize=11, leading=15.5, textColor=BLUE, spaceBefore=9, spaceAfter=3)
BODY = ParagraphStyle("Body", fontName="Body", fontSize=10.2, leading=15.2, textColor=INK, spaceAfter=5)
LEAD = ParagraphStyle("Lead", fontName="Body", fontSize=11.6, leading=17.4, textColor=INK, spaceAfter=8)
BULLET = ParagraphStyle("Bullet", parent=BODY, leftIndent=11, bulletIndent=2, spaceAfter=3)
QUOTE = ParagraphStyle(
    "Quote", fontName="Body-Italic", fontSize=10.4, leading=15.8, textColor=NAVY,
    leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=9, backColor=CREAM, borderPadding=10,
)
NOTE = ParagraphStyle(
    "Note", fontName="Body", fontSize=10, leading=15, textColor=INK,
    leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=10, backColor=WARN,
    borderColor=WARN_LINE, borderWidth=0.6, borderPadding=10,
)
CODE = ParagraphStyle(
    "Code", fontName="Mono", fontSize=8.3, leading=12, textColor=NAVY,
    backColor=SOFT, borderPadding=8, spaceBefore=8, spaceAfter=12,
)
SMALL = ParagraphStyle("Small", fontName="Body", fontSize=8.4, leading=11.8, textColor=MUTED, spaceAfter=4)
TBL_H = ParagraphStyle("TblH", fontName="Body-Bold", fontSize=8.8, leading=11.8, textColor=colors.white)
TBL_C = ParagraphStyle("TblC", fontName="Body", fontSize=8.8, leading=12.2, textColor=INK)

COVER_TITLE = ParagraphStyle("CT", fontName="Body-Bold", fontSize=31, leading=36, textColor=colors.white)
COVER_SUB = ParagraphStyle("CS", fontName="Body", fontSize=12.6, leading=19, textColor=colors.HexColor("#C9CEE6"))
COVER_EYE = ParagraphStyle("CE", fontName="Body-Bold", fontSize=9.4, leading=13, textColor=colors.HexColor("#9F8CFF"))
COVER_FOOT = ParagraphStyle("CF", fontName="Body", fontSize=8.8, leading=13, textColor=colors.HexColor("#8C93B0"))

CONTACT = "baristefan@opsqai.de"


def h1(t):
    return Paragraph(t, H1)


def h2(t):
    return Paragraph(t, H2)


def h3(t):
    return Paragraph(t, H3)


def p(t, style=BODY):
    return Paragraph(t, style)


def lead(t):
    return Paragraph(t, LEAD)


def note(t):
    return Paragraph(t, NOTE)


def small(t):
    return Paragraph(t, SMALL)


def code(lines):
    if isinstance(lines, str):
        lines = [lines]
    body = "<br/>".join(x.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") for x in lines)
    return Paragraph(body, CODE)


def bullets(items):
    return [Paragraph(f"\u2022&nbsp;&nbsp;{i}", BULLET) for i in items]


def numbered(items):
    return [Paragraph(f"<b>{n}.</b>&nbsp;&nbsp;{i}", BULLET) for n, i in enumerate(items, 1)]


def table(headers, rows, widths=None, header_color=NAVY):
    if widths is None:
        widths = [AVAIL / len(headers)] * len(headers)
    else:
        total = sum(widths)
        widths = [w / total * AVAIL for w in widths]
    data = [[Paragraph(str(x), TBL_H) for x in headers]]
    for row in rows:
        data.append([Paragraph(str(c), TBL_C) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), header_color),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def callout(title, body, color=VIOLET):
    inner = [Paragraph(f"<b>{title}</b>", ParagraphStyle("CoT", fontName="Body-Bold", fontSize=10.4,
                                                        leading=14.6, textColor=color))]
    if isinstance(body, str):
        body = [body]
    for b in body:
        inner.append(Paragraph(b, BODY))
    t = Table([[inner]], colWidths=[AVAIL])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("LINEBEFORE", (0, 0), (0, -1), 2.2, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return t


def metrics_row(items):
    """items: list of (big, label)."""
    big_style = ParagraphStyle("MB", fontName="Body-Bold", fontSize=17, leading=21, textColor=VIOLET)
    lbl_style = ParagraphStyle("ML", fontName="Body", fontSize=8.6, leading=12, textColor=MUTED)
    cells = []
    for big, label in items:
        cells.append([Paragraph(big, big_style), Paragraph(label, lbl_style)])
    inner = [
        Table([[c] for c in cell], colWidths=[AVAIL / len(items) - 10]) for cell in cells
    ]
    t = Table([inner], colWidths=[AVAIL / len(items)] * len(items))
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


class Doc(BaseDocTemplate):
    """Cover page + content pages with footer."""

    def __init__(self, path: Path, footer: str, **kw):
        super().__init__(
            str(path), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=MARGIN, bottomMargin=17 * mm,
            title=kw.pop("doc_title", "OPSQAI"), author="OPSQAI", **kw,
        )
        self.footer_text = footer
        cover_frame = Frame(MARGIN, 42 * mm, AVAIL, PAGE_H - 78 * mm, id="cover")
        body_frame = Frame(MARGIN, 17 * mm, AVAIL, PAGE_H - MARGIN - 24 * mm, id="body")
        self.addPageTemplates(
            [
                PageTemplate(id="cover", frames=[cover_frame], onPage=self._cover_bg),
                PageTemplate(id="body", frames=[body_frame], onPage=self._body_bg),
            ]
        )

    def _cover_bg(self, canv, doc):
        canv.saveState()
        canv.setFillColor(NOIR)
        canv.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # aurora glow bands
        for i, (col, alpha) in enumerate(
            [(VIOLET, 0.16), (BLUE, 0.13), (VIOLET, 0.09)]
        ):
            canv.setFillColor(col)
            canv.setFillAlpha(alpha)
            canv.circle(PAGE_W * (0.18 + 0.3 * i), PAGE_H * (0.88 - 0.06 * i), 62 * mm + i * 14 * mm,
                        stroke=0, fill=1)
        canv.setFillAlpha(1)
        canv.setFillColor(VIOLET)
        canv.rect(0, PAGE_H - 6, PAGE_W, 6, stroke=0, fill=1)
        canv.setFont("Body-Bold", 11)
        canv.setFillColor(colors.white)
        canv.drawString(MARGIN, 26 * mm, "OPSQAI")
        canv.setFont("Body", 8.6)
        canv.setFillColor(colors.HexColor("#8C93B0"))
        canv.drawRightString(PAGE_W - MARGIN, 26 * mm, CONTACT + "  ·  opsqai.de")
        canv.restoreState()

    def _body_bg(self, canv, doc):
        canv.saveState()
        canv.setFillColor(VIOLET)
        canv.rect(0, PAGE_H - 3.2, PAGE_W, 3.2, stroke=0, fill=1)
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.4)
        canv.line(MARGIN, 14.5 * mm, PAGE_W - MARGIN, 14.5 * mm)
        canv.setFont("Body", 7.8)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN, 11 * mm, self.footer_text)
        canv.drawRightString(PAGE_W - MARGIN, 11 * mm, str(canv.getPageNumber()))
        canv.restoreState()


def build(path: Path, *, eyebrow: str, title: str, subtitle: str,
          cover_footnote: str, footer: str, story: list) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = Doc(path, footer, doc_title=title)
    flow = [
        Spacer(1, 26 * mm),
        Paragraph(eyebrow.upper(), COVER_EYE),
        Spacer(1, 7 * mm),
        Paragraph(title, COVER_TITLE),
        Spacer(1, 6 * mm),
        Paragraph(subtitle, COVER_SUB),
        Spacer(1, 12 * mm),
        Paragraph(cover_footnote, COVER_FOOT),
        NextPageTemplate("body"),
        PageBreak(),
    ]
    flow.extend(story)
    doc.build(flow)
    return path


__all__ = [
    "AVAIL", "BODY", "BULLET", "CODE", "CONTACT", "CREAM", "Doc", "KeepTogether", "LEAD",
    "LINE", "MUTED", "NAVY", "NOIR", "PageBreak", "Paragraph", "SMALL", "SOFT", "Spacer",
    "Table", "TableStyle", "VIOLET", "BLUE", "build", "bullets", "callout", "code", "h1",
    "h2", "h3", "lead", "metrics_row", "note", "numbered", "p", "small", "table",
]

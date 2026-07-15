#!/usr/bin/env python3
"""
Generates the four OPSQAI reality-based PDFs into /mnt/documents/.

  1. OPSQAI-Sales-Playbook.pdf
  2. OPSQAI-Product-Overview.pdf
  3. OPSQAI-Self-Hosted-Administrator-Guide.pdf
  4. OPSQAI-Internal-Platform-Guide.pdf

Content is derived only from the project's own docs and code (see plan).
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, ListFlowable, ListItem, Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

OUT_DIR = Path("/mnt/documents")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------- Fonts ----------
def _fc(name):
    try:
        return subprocess.check_output(["fc-match", "-f", "%{file}", name], text=True).strip()
    except Exception:
        return None

_REG = _fc("DejaVu Sans")
_BOLD = _fc("DejaVu Sans:bold")
_ITAL = _fc("DejaVu Sans:italic")
_BI = _fc("DejaVu Sans:bold:italic")
_MONO = _fc("DejaVu Sans Mono") or _REG
if _REG: pdfmetrics.registerFont(TTFont("Body", _REG))
if _BOLD: pdfmetrics.registerFont(TTFont("Body-Bold", _BOLD))
if _ITAL: pdfmetrics.registerFont(TTFont("Body-Italic", _ITAL))
if _BI: pdfmetrics.registerFont(TTFont("Body-BoldItalic", _BI))
if _MONO: pdfmetrics.registerFont(TTFont("Mono", _MONO))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-BoldItalic")

# ---------- Palette ----------
NOIR = colors.HexColor("#0B0B0F")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6B7280")
LINE = colors.HexColor("#E5E7EB")
BG = colors.HexColor("#F8FAFC")
GOLD = colors.HexColor("#C9A24B")
ACCENT = colors.HexColor("#1E40AF")
GREEN = colors.HexColor("#059669")
RED = colors.HexColor("#B91C1C")

# ---------- Styles ----------
def make_styles(theme="light"):
    body_color = INK if theme == "light" else colors.whitesmoke
    S = {}
    S["H1"] = ParagraphStyle("H1", fontName="Body-Bold", fontSize=24, leading=30,
                             textColor=NOIR, spaceAfter=6, spaceBefore=0)
    S["H2"] = ParagraphStyle("H2", fontName="Body-Bold", fontSize=16, leading=22,
                             textColor=NOIR, spaceBefore=14, spaceAfter=6)
    S["H3"] = ParagraphStyle("H3", fontName="Body-Bold", fontSize=12, leading=16,
                             textColor=ACCENT, spaceBefore=10, spaceAfter=4)
    S["Body"] = ParagraphStyle("Body", fontName="Body", fontSize=10, leading=15,
                               textColor=body_color, spaceAfter=6, alignment=0)
    S["Small"] = ParagraphStyle("Small", fontName="Body", fontSize=8.5, leading=12,
                                textColor=MUTED)
    S["Mono"] = ParagraphStyle("Mono", fontName="Mono", fontSize=8.5, leading=12,
                               textColor=INK, backColor=BG, borderPadding=6,
                               leftIndent=0, rightIndent=0)
    S["Bullet"] = ParagraphStyle("Bullet", parent=S["Body"], leftIndent=12, bulletIndent=2, spaceAfter=2)
    S["Kicker"] = ParagraphStyle("Kicker", fontName="Body-Bold", fontSize=8.5, leading=12,
                                 textColor=GOLD, spaceAfter=2)
    S["CoverTitle"] = ParagraphStyle("CoverTitle", fontName="Body-Bold", fontSize=32, leading=38,
                                     textColor=colors.whitesmoke)
    S["CoverSub"] = ParagraphStyle("CoverSub", fontName="Body", fontSize=13, leading=18,
                                   textColor=colors.HexColor("#CADCFC"))
    S["CoverMeta"] = ParagraphStyle("CoverMeta", fontName="Body", fontSize=9, leading=13,
                                    textColor=GOLD)
    S["Callout"] = ParagraphStyle("Callout", parent=S["Body"], leftIndent=10, rightIndent=10,
                                  textColor=INK, backColor=colors.HexColor("#FFF7E6"),
                                  borderColor=GOLD, borderWidth=0, borderPadding=8,
                                  spaceBefore=6, spaceAfter=6)
    S["TableHead"] = ParagraphStyle("TH", fontName="Body-Bold", fontSize=9.5, leading=13,
                                    textColor=colors.whitesmoke)
    S["TableCell"] = ParagraphStyle("TC", fontName="Body", fontSize=9, leading=12, textColor=INK)
    return S

STY = make_styles()

# ---------- Helpers ----------
def p(text, style="Body"):
    return Paragraph(text, STY[style])

def bullets(items, style="Bullet"):
    return ListFlowable(
        [ListItem(Paragraph(t, STY[style]), leftIndent=10, value="•") for t in items],
        bulletType="bullet", bulletFontName="Body", bulletFontSize=9,
        leftIndent=14, bulletOffsetY=-1,
    )

def numbers(items):
    return ListFlowable(
        [ListItem(Paragraph(t, STY["Body"])) for t in items],
        bulletType="1", bulletFontName="Body-Bold", bulletFontSize=10, leftIndent=20,
    )

def hr(space=6):
    class HR(Flowable):
        def __init__(self, w=170*mm): self.w = w
        def wrap(self, aw, ah): return (self.w, 1)
        def draw(self):
            self.canv.setStrokeColor(LINE); self.canv.setLineWidth(0.6)
            self.canv.line(0, 0, self.w, 0)
    return [Spacer(1, space), HR(), Spacer(1, space)]

def callout(title, body):
    t = Table(
        [[Paragraph(f"<b>{title}</b>", STY["Body"])],
         [Paragraph(body, STY["Body"])]],
        colWidths=[170*mm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#FFF7E6")),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LINEBEFORE", (0,0), (0,-1), 3, GOLD),
        ("BOX", (0,0), (-1,-1), 0.3, colors.HexColor("#F3E7C7")),
    ]))
    return t

def code_block(text):
    lines = text.rstrip().split("\n")
    rows = [[Paragraph(f'<font face="Mono" size="8.5">{ln.replace(" ", "&nbsp;")}</font>', STY["Body"])] for ln in lines]
    if not rows: rows = [[Paragraph("&nbsp;", STY["Body"])]]
    t = Table(rows, colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#0F172A")),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("TEXTCOLOR", (0,0), (-1,-1), colors.HexColor("#E5E7EB")),
    ]))
    # rebuild rows with correct color
    rows2 = []
    for ln in lines:
        rows2.append([Paragraph(
            f'<font face="Mono" size="8.5" color="#E5E7EB">{ln.replace(" ", "&nbsp;").replace("<","&lt;").replace(">","&gt;")}</font>',
            ParagraphStyle("m", fontName="Mono", fontSize=8.5, leading=12, textColor=colors.HexColor("#E5E7EB"))
        )])
    t = Table(rows2 or [[Paragraph("&nbsp;", STY["Body"])]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#0F172A")),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t

def data_table(header, rows, col_widths=None):
    body = [[Paragraph(f'<font color="white"><b>{h}</b></font>', STY["Body"]) for h in header]]
    for r in rows:
        body.append([Paragraph(str(c), STY["TableCell"]) for c in r])
    t = Table(body, colWidths=col_widths, repeatRows=1)
    ts = TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NOIR),
        ("TEXTCOLOR", (0,0), (-1,0), colors.whitesmoke),
        ("GRID", (0,0), (-1,-1), 0.25, LINE),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, BG]),
    ])
    t.setStyle(ts)
    return t

# ---------- Diagrams ----------
class ArchDiagram(Flowable):
    """Three-surface architecture: MC, Portal, Self-Hosted."""
    def __init__(self, w=170*mm, h=70*mm):
        self.w, self.h = w, h
    def wrap(self, aw, ah): return (self.w, self.h)
    def draw(self):
        c = self.canv
        w, h = self.w, self.h
        # boxes
        boxes = [
            ("Management Center", "opsqai.de · OPSQAI staff only", 4, GOLD),
            ("Customer Portal", "opsqai.de · customer contacts", 4, ACCENT),
            ("Self-Hosted Install", "Customer Windows Server", 4, GREEN),
        ]
        bw = (w - 20) / 3
        for i, (title, sub, _, col) in enumerate(boxes):
            x = i * (bw + 10)
            c.setFillColor(colors.white)
            c.setStrokeColor(col); c.setLineWidth(1.2)
            c.roundRect(x, 10, bw, h-20, 6, stroke=1, fill=1)
            c.setFillColor(col); c.setFont("Body-Bold", 11)
            c.drawString(x+10, h-22, title)
            c.setFillColor(MUTED); c.setFont("Body", 8)
            c.drawString(x+10, h-34, sub)
            c.setFillColor(INK); c.setFont("Body", 8)
        # bullets in each
        contents = [
            ["Companies · Installations", "Licenses · Signing keys", "Releases · Bundles", "Support · Audit"],
            ["Installer downloads", "Activation bundles", "Release notes · Docs", "Subscription · Support"],
            ["AI Chat · Knowledge Base", "FAQ · Academy · Audit", "Users · Organization", "Modules · Updates"],
        ]
        for i, lines in enumerate(contents):
            x = i * (bw + 10) + 10
            y = h - 44
            for ln in lines:
                c.drawString(x, y, "• " + ln)
                y -= 11

class RagFlow(Flowable):
    def __init__(self, w=170*mm, h=48*mm):
        self.w, self.h = w, h
    def wrap(self, aw, ah): return (self.w, self.h)
    def draw(self):
        c = self.canv
        steps = ["Ingest", "Chunk", "Embed", "Store\n(pgvector)", "Retrieve\n+ ACL", "Generate", "Audit"]
        n = len(steps)
        gap = 6
        bw = (self.w - gap*(n-1)) / n
        for i, s in enumerate(steps):
            x = i*(bw+gap)
            c.setFillColor(NOIR); c.setStrokeColor(GOLD); c.setLineWidth(0.8)
            c.roundRect(x, 8, bw, self.h-16, 4, stroke=1, fill=1)
            c.setFillColor(colors.whitesmoke); c.setFont("Body-Bold", 9)
            for j, line in enumerate(s.split("\n")):
                c.drawCentredString(x+bw/2, self.h/2 - 2 + (len(s.split('\n'))-1)*5 - j*11, line)
            if i < n-1:
                c.setStrokeColor(GOLD); c.setLineWidth(1.2)
                cy = self.h/2
                c.line(x+bw, cy, x+bw+gap, cy)
                c.line(x+bw+gap-2, cy-2, x+bw+gap, cy)
                c.line(x+bw+gap-2, cy+2, x+bw+gap, cy)

class JourneyStrip(Flowable):
    def __init__(self, steps, w=170*mm, h=32*mm, color=ACCENT):
        self.steps, self.w, self.h, self.color = steps, w, h, color
    def wrap(self, aw, ah): return (self.w, self.h)
    def draw(self):
        c = self.canv
        n = len(self.steps)
        gap = 4
        bw = (self.w - gap*(n-1)) / n
        for i, s in enumerate(self.steps):
            x = i*(bw+gap)
            c.setFillColor(colors.white); c.setStrokeColor(self.color); c.setLineWidth(1)
            c.roundRect(x, 4, bw, self.h-8, 4, stroke=1, fill=1)
            c.setFillColor(self.color); c.setFont("Body-Bold", 8)
            c.drawCentredString(x+bw/2, self.h-13, f"STEP {i+1}")
            c.setFillColor(INK); c.setFont("Body", 8.5)
            # wrap title into two lines if needed
            words = s.split()
            lines, cur = [], ""
            for wd in words:
                trial = (cur+" "+wd).strip()
                if c.stringWidth(trial, "Body", 8.5) > bw-10:
                    lines.append(cur); cur = wd
                else:
                    cur = trial
            if cur: lines.append(cur)
            for j, ln in enumerate(lines[:3]):
                c.drawCentredString(x+bw/2, self.h/2 - 8 - j*10, ln)

class UIMockup(Flowable):
    """Stylized wireframe of a real UI surface, labeled with its route."""
    def __init__(self, title, route, sections, w=170*mm, h=70*mm):
        self.title, self.route, self.sections = title, route, sections
        self.w, self.h = w, h
    def wrap(self, aw, ah): return (self.w, self.h)
    def draw(self):
        c = self.canv
        # browser frame
        c.setFillColor(colors.HexColor("#111827"))
        c.roundRect(0, 0, self.w, self.h, 6, stroke=0, fill=1)
        # title bar
        c.setFillColor(colors.HexColor("#1F2937"))
        c.roundRect(0, self.h-14, self.w, 14, 6, stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#EF4444")); c.circle(8, self.h-7, 2.2, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#F59E0B")); c.circle(16, self.h-7, 2.2, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#10B981")); c.circle(24, self.h-7, 2.2, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#9CA3AF")); c.setFont("Mono", 7)
        c.drawString(34, self.h-9, self.route)
        # content area
        c.setFillColor(colors.white)
        c.rect(6, 6, self.w-12, self.h-22, stroke=0, fill=1)
        # sidebar
        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.rect(6, 6, 34, self.h-22, stroke=0, fill=1)
        c.setFillColor(NOIR); c.setFont("Body-Bold", 8)
        c.drawString(10, self.h-24, "OPSQAI")
        c.setFillColor(MUTED); c.setFont("Body", 7)
        for i, item in enumerate(["Chat", "Knowledge", "FAQ", "Academy", "Audit", "Users", "Admin"]):
            c.drawString(10, self.h-36-i*9, "• " + item)
        # header
        c.setFillColor(NOIR); c.setFont("Body-Bold", 11)
        c.drawString(48, self.h-26, self.title)
        c.setFillColor(MUTED); c.setFont("Body", 7.5)
        c.drawString(48, self.h-36, f"Route: {self.route}")
        # content sections
        y = self.h - 46
        for label, kind in self.sections:
            if kind == "row":
                c.setFillColor(colors.HexColor("#F8FAFC"))
                c.roundRect(48, y-14, self.w-58, 12, 2, stroke=0, fill=1)
                c.setFillColor(INK); c.setFont("Body", 8)
                c.drawString(52, y-10, label)
                y -= 16
            elif kind == "card":
                c.setFillColor(colors.HexColor("#F1F5F9"))
                c.roundRect(48, y-24, self.w-58, 22, 3, stroke=0, fill=1)
                c.setFillColor(INK); c.setFont("Body-Bold", 8.5)
                c.drawString(54, y-12, label)
                y -= 28
            elif kind == "btn":
                c.setFillColor(GOLD)
                c.roundRect(48, y-14, 70, 12, 2, stroke=0, fill=1)
                c.setFillColor(NOIR); c.setFont("Body-Bold", 8)
                c.drawString(54, y-10, label)
                y -= 18

class FlowDiagram(Flowable):
    """Horizontal boxes with arrows."""
    def __init__(self, nodes, w=170*mm, h=28*mm, color=NOIR, fill=colors.white):
        self.nodes, self.w, self.h = nodes, w, h
        self.color, self.fill = color, fill
    def wrap(self, aw, ah): return (self.w, self.h)
    def draw(self):
        c = self.canv
        n = len(self.nodes)
        gap = 10
        bw = (self.w - gap*(n-1)) / n
        for i, s in enumerate(self.nodes):
            x = i*(bw+gap)
            c.setFillColor(self.fill); c.setStrokeColor(self.color); c.setLineWidth(0.8)
            c.roundRect(x, 4, bw, self.h-8, 4, stroke=1, fill=1)
            c.setFillColor(self.color); c.setFont("Body-Bold", 8.5)
            # wrap
            words = s.split()
            lines, cur = [], ""
            for wd in words:
                trial = (cur+" "+wd).strip()
                if c.stringWidth(trial, "Body-Bold", 8.5) > bw-8:
                    lines.append(cur); cur = wd
                else: cur = trial
            if cur: lines.append(cur)
            for j, ln in enumerate(lines[:3]):
                c.drawCentredString(x+bw/2, self.h/2 + 4 - j*10, ln)
            if i < n-1:
                c.setStrokeColor(GOLD); c.setLineWidth(1.4)
                cy = self.h/2
                c.line(x+bw+1, cy, x+bw+gap-1, cy)
                c.line(x+bw+gap-3, cy-2.5, x+bw+gap-1, cy)
                c.line(x+bw+gap-3, cy+2.5, x+bw+gap-1, cy)

# ---------- Document scaffold ----------
class DocBuilder:
    def __init__(self, path: Path, title: str, subtitle: str, kicker: str):
        self.path = path
        self.title = title
        self.subtitle = subtitle
        self.kicker = kicker
        self.story = []

    def cover(self):
        # Cover page rendered via onPage handler
        self.story.append(PageBreak())

    def _page_bg(self, canv, doc):
        if doc.page == 1:
            # full-bleed cover
            canv.saveState()
            canv.setFillColor(NOIR)
            canv.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
            # gold rule
            canv.setStrokeColor(GOLD); canv.setLineWidth(1.2)
            canv.line(20*mm, A4[1]-40*mm, 40*mm, A4[1]-40*mm)
            canv.setFillColor(GOLD); canv.setFont("Body-Bold", 9)
            canv.drawString(20*mm, A4[1]-46*mm, self.kicker.upper())
            canv.setFillColor(colors.whitesmoke); canv.setFont("Body-Bold", 30)
            # title wrap
            words = self.title.split()
            lines, cur = [], ""
            for w in words:
                trial = (cur+" "+w).strip()
                if canv.stringWidth(trial, "Body-Bold", 30) > 170*mm:
                    lines.append(cur); cur = w
                else: cur = trial
            if cur: lines.append(cur)
            y = A4[1]-70*mm
            for ln in lines:
                canv.drawString(20*mm, y, ln); y -= 36
            canv.setFillColor(colors.HexColor("#CADCFC")); canv.setFont("Body", 12)
            # subtitle wrap
            words = self.subtitle.split()
            lines, cur = [], ""
            for w in words:
                trial = (cur+" "+w).strip()
                if canv.stringWidth(trial, "Body", 12) > 170*mm:
                    lines.append(cur); cur = w
                else: cur = trial
            if cur: lines.append(cur)
            y -= 8
            for ln in lines:
                canv.drawString(20*mm, y, ln); y -= 16
            canv.setFillColor(GOLD); canv.setFont("Body", 8.5)
            canv.drawString(20*mm, 22*mm, "OPSQAI · opsqai.de")
            canv.drawRightString(A4[0]-20*mm, 22*mm, "Confidential · Reality-based document · 2026")
            canv.restoreState()
        else:
            canv.saveState()
            # header
            canv.setFillColor(NOIR); canv.setFont("Body-Bold", 8.5)
            canv.drawString(20*mm, A4[1]-12*mm, "OPSQAI")
            canv.setFillColor(MUTED); canv.setFont("Body", 8.5)
            canv.drawRightString(A4[0]-20*mm, A4[1]-12*mm, self.kicker)
            canv.setStrokeColor(LINE); canv.setLineWidth(0.3)
            canv.line(20*mm, A4[1]-14*mm, A4[0]-20*mm, A4[1]-14*mm)
            # footer
            canv.setFillColor(MUTED); canv.setFont("Body", 8)
            canv.drawString(20*mm, 12*mm, self.title)
            canv.drawRightString(A4[0]-20*mm, 12*mm, f"Page {doc.page}")
            canv.restoreState()

    def build(self):
        doc = BaseDocTemplate(
            str(self.path), pagesize=A4,
            leftMargin=20*mm, rightMargin=20*mm,
            topMargin=20*mm, bottomMargin=18*mm,
            title=self.title, author="OPSQAI",
        )
        frame_content = Frame(20*mm, 18*mm, A4[0]-40*mm, A4[1]-38*mm,
                              id="content", showBoundary=0)
        frame_cover = Frame(20*mm, 18*mm, A4[0]-40*mm, A4[1]-38*mm,
                            id="cover", showBoundary=0)
        doc.addPageTemplates([
            PageTemplate(id="Cover", frames=[frame_cover], onPage=self._page_bg),
            PageTemplate(id="Body", frames=[frame_content], onPage=self._page_bg),
        ])
        # first "story" element is a PageBreak into Body template
        story = [PageBreak()] + self.story
        # Ensure body template used after cover
        for i, el in enumerate(story):
            if isinstance(el, PageBreak) and i == 0:
                pass
        doc.build(story)


# ============================================================
# CONTENT BUILDERS
# ============================================================

def build_product_overview():
    b = DocBuilder(OUT_DIR/"OPSQAI-Product-Overview.pdf",
                   "OPSQAI Product Overview",
                   "Enterprise Operational AI — Windows Self-Hosted. What it is, how it works, why it exists.",
                   "Product Overview")
    S = b.story

    # section: In one sentence
    S += [p("What is OPSQAI?", "H1"),
          p("OPSQAI is a self-hosted, license-gated Enterprise AI platform that turns a company's own operational knowledge — SOPs, technical documentation, training material, FAQs, internal requests — into a governed, auditable AI surface that employees query in natural language.", "Body"),
          Spacer(1, 6),
          callout("The essential distinction",
                  "The <b>Windows installation is the product</b>. OPSQAI Cloud (Management Center and Customer Portal) exists only for licensing, releases, installer distribution and customer support. Customers own their data, their embeddings, and their AI provider.")]

    S += hr()

    S += [p("The problem", "H2"),
          p("Enterprises in logistics, manufacturing, warehouse and production share the same pattern:", "Body"),
          bullets([
              "Operational knowledge lives across shared drives, wikis, ticketing systems, and people's heads.",
              "New joiners take months to become productive on the actual procedures.",
              "Auditors ask \"how do you know the current SOP was followed?\" and no one can answer without a scavenger hunt.",
              "Public LLMs cannot be pointed at this knowledge, because the data can never leave the company boundary.",
          ]),
          p("The solution", "H2"),
          p("OPSQAI keeps the entire pipeline — ingestion, embeddings, retrieval, generation, audit — <b>inside the customer's own install</b>, with a governance surface (roles, audit log, SOP acknowledgements, retraining events) built in.", "Body")]

    S += [p("Three surfaces, one product", "H2"),
          ArchDiagram(),
          Spacer(1, 4),
          p("Same codebase, three deployments, enforced at both UI and server layer (<font face='Mono'>OPSQAI_MODE=mc</font> vs <font face='Mono'>selfhost</font>). One <font face='Mono'>install_id</font> per customer install anchors licensing and disaster recovery. Communication is one-directional: the install pulls from the Management Center; the MC never pushes.", "Body")]

    S += [PageBreak(),
          p("How the AI works", "H2"),
          RagFlow(),
          Spacer(1, 4),
          p("Every completion is grounded by retrieval over the customer's own Knowledge Base. When retrieval returns nothing relevant, the system answers <b>&quot;no answer&quot;</b> — it does not hallucinate. Every completion lands in <font face='Mono'>ai_audits</font> with input hash, output hash, model, latency, token counts and the retrieval chunks used.", "Body"),
          p("Who it is for", "H2"),
          bullets([
              "Logistics operators — dispatchers, planners, freight forwarders querying procedures and rates.",
              "Manufacturing sites — line supervisors and quality engineers running SOP and safety lookups.",
              "Warehouses — WMS-adjacent teams asking about inbound/outbound rules and hazard handling.",
              "Production teams — grounded guidance on equipment procedures and change orders.",
              "Regulated services — where auditability, EU data residency and provider choice are hard constraints.",
          ])]

    S += [p("Modules", "H2"),
          p("<b>Basic Platform</b> (always available on every install): platform administration, audit log, docs viewer, setup wizard, Doctor self-diagnostics, Recovery.", "Body"),
          p("<b>Premium Modules</b> (unlocked per module license):", "Body"),
          data_table(
              ["Module", "Purpose"],
              [
                  ["Knowledge Base", "Document ingestion, chunking, retrieval"],
                  ["Chat", "Grounded chat over knowledge with source citations"],
                  ["FAQ", "Curated FAQ with retrieval fallback"],
                  ["Academy", "Lessons, chapters, quizzes, certificates"],
                  ["SOPs", "Versioned SOPs with acknowledgement tracking"],
                  ["Brand", "Brand asset library and tone rules"],
                  ["Internal Requests", "Internal ticket triage"],
                  ["Workspace", "Session-scoped AI workspace with file artifacts"],
              ],
              col_widths=[45*mm, 125*mm],
          ),
          Spacer(1, 4),
          p("A module unlocks when a valid per-module license is present. Expiry locks the UI and retrieval; existing data is retained.", "Small")]

    S += [PageBreak(),
          p("Why Windows self-hosted", "H2"),
          bullets([
              "Data sovereignty — the customer's PostgreSQL and object storage; the vendor never has a callback channel.",
              "Compatible with existing industrial Windows infrastructure — WinSW-managed services, embedded PostgreSQL, Caddy reverse proxy.",
              "Compliant deployment surface for EU AI Act obligations at the customer's own boundary.",
              "Offline-tolerant — installs verify licenses locally against cached signing keys; activation bundles let the install operate without egress.",
          ]),
          p("Why not SaaS", "H2"),
          bullets([
              "Retrieval never crosses the install boundary (Architecture Decision AD-004).",
              "The Management Center holds no customer infrastructure secrets (AD-009).",
              "Portal lives on MC precisely so it can serve pre-install information — installers, activation bundles — while operational data stays inside the customer.",
              "Every install is single-tenant by design. There is no multi-tenant database on our side.",
          ])]

    S += [p("Why OPSQAI", "H2"),
          data_table(
              ["Property", "How OPSQAI implements it"],
              [
                  ["Signed licenses", "Ed25519 (RFC 8032), per-module tokens, key_id-based rotation"],
                  ["Offline activation", "Signed activation bundle: licenses + signing keys + CRL"],
                  ["Revocation", "Central CRL, delivered via heartbeat or bundle import"],
                  ["Audit trail", "Hash-chained audit_log; ai_audits per completion"],
                  ["Chunk-level ACL", "Retrieval filtered by RBAC + department at query time"],
                  ["Vendor choice", "OpenAI, Azure OpenAI, self-hosted OpenAI-compatible (Ollama, vLLM, LM Studio)"],
                  ["Installer", "Signed Windows installer with Doctor and Recovery modes"],
                  ["No vendor lock-in", "Data, embeddings, and AI provider are all customer-owned"],
              ],
              col_widths=[55*mm, 115*mm],
          )]

    S += [PageBreak(),
          p("What OPSQAI looks like", "H2"),
          UIMockup("AI Chat", "/app/chat",
                   [("Ask a question about a procedure...", "row"),
                    ("Answer with 3 source citations from Knowledge Base", "card"),
                    ("Send", "btn")]),
          Spacer(1, 8),
          UIMockup("Knowledge Base", "/app/knowledge",
                   [("Filter by category, department, criticality", "row"),
                    ("Document: Warehouse Hazard Handling v3.2 — 42 chunks", "card"),
                    ("Document: Cross-dock SOP v1.4 — 18 chunks", "card"),
                    ("Upload", "btn")]),
          Spacer(1, 8),
          UIMockup("AI Audit", "/app/audit",
                   [("2026-07-14 12:44 · chat · gpt-4o-mini · 3 chunks", "row"),
                    ("2026-07-14 12:41 · chat · gpt-4o-mini · 2 chunks", "row"),
                    ("Export as CSV", "btn")])]

    S += [PageBreak(),
          p("Usage examples", "H2"),
          p("The scenarios below describe how the product is used in practice. They are not case studies from named customers.", "Small"),
          p("<b>Logistics dispatcher.</b> Asks: &quot;Which documents are required for a DE→CH road shipment of Class 3 dangerous goods?&quot;. Chat retrieves the relevant chunks from the customer's SOP library, cites them, and answers strictly from the retrieved text.", "Body"),
          p("<b>Warehouse supervisor.</b> Asks Chat about hazmat storage clearances. The retrieval filter respects the supervisor's department; chunks tagged for a different site are not returned.", "Body"),
          p("<b>Manufacturing line lead.</b> Uses Academy to run a certified onboarding for a new hire on the injection line, tracked with quiz scores and certificate issuance.", "Body"),
          p("<b>Production QA.</b> Uses Audit to prove that the SOP version acknowledged by an operator on a given shift matches the version referenced during a chat session.", "Body")]

    S += [p("Security summary", "H2"),
          bullets([
              "Transport: HTTPS everywhere; customer-supplied certificate.",
              "At rest: PostgreSQL data-at-rest is the customer's responsibility (managed PG or column-level via pgcrypto).",
              "Authentication: email/password + Google + optional SAML SSO (Enterprise).",
              "Authorization: RBAC via user_roles + has_role() security-definer function. Roles are never stored on profiles.",
              "Licensing crypto: Ed25519 with key_id-based rotation. Signing private keys never leave the MC.",
              "Break-glass: high-entropy secret hashed with scrypt (N=2^15, r=8, p=1); only the hash is stored.",
              "DR: two independent recovery paths, cryptographically distinct.",
          ])]

    S += [p("AI providers supported", "H2"),
          data_table(
              ["Provider", "Notes"],
              [
                  ["OpenAI", "Customer's own API key. Region pinned by account."],
                  ["Azure OpenAI", "Customer's own resource + deployment names."],
                  ["Self-hosted", "OpenAI-compatible: vLLM, Ollama, LM Studio — base URL + key."],
                  ["Lovable AI Gateway", "Only when the install permits egress to opsqai.de."],
              ],
              col_widths=[45*mm, 125*mm],
          ),
          Spacer(1, 4),
          p("Required model roles: <b>chat</b>, <b>embed</b> (must be consistent across the corpus lifetime), and optional <b>stt / tts</b>. Changing the embedding model requires re-embedding the corpus.", "Small")]

    S += [PageBreak(),
          p("Licensing model", "H2"),
          p("Two axes, no &quot;Starter / Pro / Enterprise&quot; tiers.", "Body"),
          p("<b>Installation License</b> (mandatory, exactly one per install) — carries seat count and maintenance window. Without a valid Installation License, the install boots in Recovery Mode only.", "Body"),
          p("<b>Module License</b> (optional, per module) — one license per module the customer subscribes to. Each has its own <font face='Mono'>expires_at</font> (availability) and <font face='Mono'>maintenance_expires_at</font> (updates and support).", "Body"),
          p("Token format:", "Body"),
          code_block("opsqai.v1.<base64url(payload)>.<base64url(ed25519_signature)>"),
          p("Every token payload includes <font face='Mono'>license_version: 1</font>, <font face='Mono'>kind</font>, <font face='Mono'>install_id</font>, <font face='Mono'>key_id</font>, <font face='Mono'>issued_at</font>, <font face='Mono'>expires_at</font>, <font face='Mono'>maintenance_expires_at</font>. The verifier rejects any unknown <font face='Mono'>license_version</font>.", "Small"),
          p("<b>Annual Maintenance</b> — recurring, typically 15–20% depending on contract. Covers updates and support.", "Body")]

    S += [p("Customer journey", "H2"),
          JourneyStrip(["Purchase &amp; contract",
                        "Portal download",
                        "Windows install",
                        "Activation license",
                        "Configure AI provider",
                        "Production use"]),
          Spacer(1, 4),
          p("The customer's technical contact receives a signed 24-hour download link from the Customer Portal. The installer runs <font face='Mono'>OPSQAI-Setup.exe</font>, brings up the WinSW services (Database, Platform, Worker, Updater, Caddy), and launches the Setup Wizard. The wizard walks through EULA, license, storage, AI provider, SMTP, SSO, backup, and admin creation.", "Body")]

    S += [PageBreak(),
          p("Frequently asked questions", "H2"),
          p("<b>Where does customer data live?</b><br/>Inside the customer's own PostgreSQL and object storage. Not on opsqai.de.", "Body"),
          p("<b>Can OPSQAI access our install?</b><br/>No. There is no callback channel. Recovery is customer-initiated.", "Body"),
          p("<b>What happens if the Management Center is down?</b><br/>Existing installs keep working. Licenses are verified locally against cached signing keys. Only new-license issuance and Bootstrap Recovery Tokens require MC availability.", "Body"),
          p("<b>What happens if a license expires?</b><br/>Module UI is locked; existing data stays intact. Renew, re-import bundle, done.", "Body"),
          p("<b>Do you train on our data?</b><br/>No. The AI provider is chosen by the customer; the training opt-out is governed by the customer's contract with that provider.", "Body"),
          p("<b>Is this multi-tenant?</b><br/>No. Each install is single-tenant by design.", "Body"),
          p("<b>Is there a SaaS version?</b><br/>No. Only the Management Center and Customer Portal run on opsqai.de; they never hold customer operational data.", "Body")]

    b.build()


def build_sales_playbook():
    b = DocBuilder(OUT_DIR/"OPSQAI-Sales-Playbook.pdf",
                   "OPSQAI Sales Playbook",
                   "How we present OPSQAI, handle objections, run demos, and close contracts. Internal use.",
                   "Sales Playbook · Internal")
    S = b.story

    S += [p("Positioning", "H1"),
          callout("One-sentence pitch",
                  "OPSQAI is an <b>Enterprise Operational AI platform delivered as a Windows Self-Hosted product</b>. Customers keep their data, embeddings, and AI provider; OPSQAI Cloud exists only for licensing, releases, and support."),
          p("Who we sell to", "H2"),
          bullets([
              "Industrial SMB and mid-market operators on Windows Server infrastructure.",
              "DACH first (Germany, Austria, Switzerland). English and German are supported UI languages.",
              "Verticals: logistics, manufacturing, warehousing, production, regulated services.",
              "Buyer roles: CTO / Head of IT, Head of Operations, Compliance / QA lead.",
          ])]

    S += [p("Discovery questions", "H2"),
          numbers([
              "Do you run on Windows Server today? On-prem, in your DC, or hosted?",
              "Where does your operational knowledge live now (network drives, SharePoint, wiki, tickets)?",
              "Are you already using an LLM anywhere in operations? What is blocking wider use?",
              "What compliance drivers are relevant (EU AI Act, GDPR, ISO, sector-specific)?",
              "Who owns AI provider choice at your company — a central team or per BU?",
              "What does your backup / DR practice look like today?",
              "How many operational users will actually query the system in year 1?",
          ])]

    S += [p("The three-surface pitch", "H2"),
          ArchDiagram(),
          Spacer(1, 4),
          p("Say: &quot;There are three surfaces. Only the Self-Hosted install runs your data. The Management Center is where <b>we</b> — OPSQAI — issue licenses and packages. The Customer Portal is your window into your contract, downloads and support. Your users never touch our cloud for operations.&quot;", "Body")]

    S += [PageBreak(),
          p("Demo script", "H2"),
          p("Run the demo in exactly this order. Each step is a real surface in the product.", "Small"),
          numbers([
              "<b>Customer Portal — downloads.</b> Show a signed 24-hour link for OPSQAI-Setup.exe. Emphasize per-install packaging.",
              "<b>Windows installer wizard.</b> Show <font face='Mono'>OPSQAI-Setup.exe</font>: prerequisite checks, service install (WinSW services: Database, Platform, Worker, Updater, Caddy), first-boot health probe.",
              "<b>Setup Wizard</b> at <font face='Mono'>/first-run</font>. Walk the 10 steps: EULA → Installation License → Storage → AI provider → SMTP → SSO (skip) → Backup → Test connections → Create Admin → Finish.",
              "<b>AI Chat on Knowledge Base.</b> Ingest one PDF live; ask a question; show source citations.",
              "<b>AI Audit.</b> Open the audit for the previous completion — input hash, output hash, model, retrieval chunks.",
              "<b>License Activation.</b> Show <font face='Mono'>/app/platform/license-activation</font> — paste an offline activation bundle; verify + activate.",
          ]),
          p("Do not improvise features. If a customer asks for something we do not have, note it and move on — say &quot;that is on our roadmap&quot; only when it actually is.", "Small")]

    S += [PageBreak(),
          p("Objection handling", "H2"),
          data_table(
              ["Objection", "How to respond"],
              [
                  ["Why not SaaS?",
                   "Data sovereignty and EU AI Act. Retrieval never crosses the install boundary (AD-004). Chunk-level ACL on every query. No customer operational data at opsqai.de."],
                  ["Why Windows?",
                   "Matches customer infrastructure in our target verticals. Real Windows services via WinSW: Database, Platform, Worker, Updater, Caddy. Embedded PostgreSQL managed with pg_ctl."],
                  ["Are we locked in?",
                   "No. You own the data, the embeddings, and the AI provider account. Supported providers: OpenAI, Azure OpenAI, self-hosted OpenAI-compatible (Ollama, vLLM, LM Studio). Switch providers by re-embedding."],
                  ["What if OPSQAI disappears?",
                   "DR anchor is your install_id and your backups (AD-009). MC holds NO infrastructure secrets. Your install keeps running from cached signing keys and its last activation bundle."],
                  ["How do offline updates work?",
                   "Signed release manifests; the updater service applies them; offline import is supported via activation bundles."],
                  ["Which models?",
                   "Any OpenAI-compatible chat + embedding models exposed by the chosen provider. Changing the embedding model requires re-embedding the corpus."],
                  ["Is retrieval trustworthy?",
                   "Grounded prompts, top-k with RBAC + department filter. Retrieval failure returns &quot;no answer&quot; — the system does not hallucinate when nothing is retrieved."],
                  ["Multi-tenant?",
                   "No, single-tenant per install by design."],
              ],
              col_widths=[45*mm, 125*mm],
          )]

    S += [PageBreak(),
          p("Competitor battle cards", "H2"),
          p("Framed by <b>when we win</b>, <b>when we lose</b>, and <b>when we should not sell</b>. Do not disparage competitors — describe fit.", "Small")]

    for name, when_win, when_lose, when_not in [
        ("Microsoft Copilot",
         ["Customer needs sovereignty over data, embeddings and provider.",
          "Customer wants a governance / audit surface over operational SOPs, not general assistance.",
          "Retrieval must respect chunk-level RBAC and department filters."],
         ["Customer is fully committed to Microsoft 365 ecosystem for productivity.",
          "Customer's operational data already sits in Graph / SharePoint and they want generic assistance."],
         ["Customer has no operational SOPs / procedures worth ingesting — Copilot is enough."]),
        ("ChatGPT Enterprise",
         ["Data cannot leave the customer boundary.",
          "Customer requires local Ollama / on-prem inference option.",
          "Customer needs per-completion audit with input/output hashes tied to sources."],
         ["Customer is comfortable sending operational content to OpenAI under enterprise DPA.",
          "Customer wants generic productivity, not a governed operational surface."],
         ["Customer's compliance team has already approved ChatGPT Enterprise and there is no operational governance requirement."]),
        ("Glean",
         ["Customer wants a Windows self-hosted install, not a SaaS index.",
          "Customer wants explicit module licensing and offline activation.",
          "Customer's data connectors are file-based (SOPs, PDFs) rather than SaaS-app-based."],
         ["Customer's knowledge is scattered across many SaaS apps that Glean connects natively.",
          "Customer is fine with SaaS indexing over their tenant."],
         ["Customer's real problem is enterprise search over SaaS apps, not operational SOP retrieval."]),
        ("Guru",
         ["Customer needs grounded AI chat with retrieval and audit — not a knowledge card manager.",
          "Customer needs SOP acknowledgement + Academy in one platform.",
          "Customer needs offline / air-gapped operation."],
         ["Customer only needs a lightweight knowledge card manager tied to Slack.",
          "Customer has no compliance driver and no self-host requirement."],
         ["Customer's team is small (< 25 users), no compliance driver, uses Slack heavily — Guru is a better fit."]),
    ]:
        S += [p(name, "H3"),
              p("<b>When we win.</b>", "Body"),
              bullets(when_win),
              p("<b>When we lose.</b>", "Body"),
              bullets(when_lose),
              p("<b>When NOT to sell OPSQAI.</b>", "Body"),
              bullets(when_not),
              Spacer(1, 4)]

    S += [PageBreak(),
          p("Qualification checklist (before demo)", "H2"),
          p("Every box should be a clear yes. If more than two are no, this is not a fit yet.", "Small"),
          data_table(
              ["Check", "Expected"],
              [
                  ["Windows Server host available", "Yes — 8 vCPU / 32 GB RAM recommended, 100 GB SSD"],
                  ["Local IT contact identified", "Yes — one technical contact who owns the install"],
                  ["Compliance driver named", "EU AI Act, GDPR, ISO, or sector regulation"],
                  ["AI already used somewhere", "Yes/No — if yes, which provider and blockers"],
                  ["Operational documents available", "PDFs / DOCX / MD / HTML for ingestion"],
                  ["UI language", "English or German"],
                  ["Approximate number of users", "10–500 typical"],
                  ["Offline / air-gap requirement", "Yes/No — if yes, plan activation bundle cadence"],
                  ["Backup practice in place", "Yes — nightly backup + monthly restore verification"],
                  ["Budget frame confirmed", "Basic Platform + expected modules + annual maintenance"],
              ],
              col_widths=[75*mm, 95*mm],
          )]

    S += [PageBreak(),
          p("Pricing conversation", "H2"),
          p("Frame the conversation around three components. Do not quote fixed numbers unless the deal is approved by the founder.", "Small"),
          bullets([
              "<b>Basic Platform</b> — always required. Installation License, seats and maintenance window.",
              "<b>Premium Modules</b> — per-module licenses, priced independently. Turn on and off with the license lifecycle.",
              "<b>Annual Maintenance</b> — recurring, typically 15–20% depending on contract. Covers updates and support.",
          ]),
          p("Anchors we <b>can</b> defend on a call:", "Body"),
          bullets([
              "Single-tenant deployment, no per-tenant infra amortization gain for us.",
              "Signed activation bundle, offline operation, no vendor SaaS margin.",
              "Windows-native operational surface — not a wrapper on top of a SaaS index.",
          ])]

    S += [p("Closing checklist", "H2"),
          numbers([
              "Technical contact confirmed (name, email, role).",
              "Install target confirmed (Windows Server version, host location, egress rules).",
              "AI provider chosen (OpenAI / Azure / self-hosted / Lovable Gateway).",
              "Seat count agreed and captured on the Installation License.",
              "Modules agreed and captured as per-module licenses.",
              "Maintenance term agreed (typically 12 months, renewing).",
              "Backup and DR ownership acknowledged in writing (customer-owned).",
              "Contact for support triage confirmed.",
          ]),
          p("Handover to delivery", "H2"),
          p("Once signed, hand the following to delivery so licensing and packaging can proceed:", "Body"),
          bullets([
              "Company legal name + billing contact.",
              "Technical contact for the installation package email.",
              "Preferred install_id slug (e.g. <font face='Mono'>acme-prod-01</font>) — this is stored, not computed, and reused across regenerations.",
              "Seats, module list, maintenance term, contract PDF.",
          ])]

    b.build()


def build_admin_guide():
    b = DocBuilder(OUT_DIR/"OPSQAI-Self-Hosted-Administrator-Guide.pdf",
                   "OPSQAI Self-Hosted Administrator Guide",
                   "For the customer's IT administrator: install, configure, operate, and recover an OPSQAI Windows install.",
                   "Administrator Guide")
    S = b.story

    S += [p("About this guide", "H1"),
          p("This guide is written for the IT administrator responsible for running OPSQAI on the customer's own Windows infrastructure. It covers what OPSQAI is from the administrator's perspective, how to install it, how to configure every subsystem, how to operate it, and how to recover from failure. The Management Center is not covered here — it is not accessible to customers.", "Body"),
          callout("Golden rule",
                  "The Windows install is the product. The customer owns the database, the object storage, the AI provider account, and the backups. OPSQAI never has a callback channel into the install.")]

    S += [p("1. What OPSQAI is (for the administrator)", "H2"),
          bullets([
              "A Windows application composed of five services registered with WinSW: Database (embedded PostgreSQL), Platform (the web app), Worker (background jobs), Updater (signed release manifests), Caddy (TLS reverse proxy).",
              "A single-tenant deployment — one install, one database, one object store.",
              "A licensed application — an <b>Installation License</b> is mandatory; <b>Module Licenses</b> unlock optional modules.",
              "A grounded AI application — retrieval always runs inside the install; completions are audited per call.",
          ])]

    S += [p("2. Prerequisites", "H2"),
          p("<b>Host.</b> Windows Server 2019+ or Windows 10/11 Pro. 8 vCPU / 32 GB RAM recommended (4 vCPU / 16 GB RAM minimum). 100 GB SSD for the database, plus separate storage for the object store.", "Body"),
          p("<b>Network.</b> Outbound HTTPS to <font face='Mono'>opsqai.de</font> (licensing) and to the chosen AI provider. Inbound HTTPS on the port Caddy is bound to (default 443).", "Body"),
          p("<b>Credentials to have ready.</b>", "Body"),
          bullets([
              "PostgreSQL superuser — only needed if you choose the <b>external</b> database mode. Not needed for the default embedded mode.",
              "SMTP host + credentials.",
              "AI provider API key (OpenAI, Azure OpenAI, or self-hosted endpoint URL).",
              "Installation License token issued by OPSQAI.",
              "(Optional) Module License tokens.",
              "Trusted TLS certificate for the install's FQDN, or Caddy-managed certificate.",
          ])]

    S += [PageBreak(),
          p("3. Installation", "H2"),
          p("You receive a signed <font face='Mono'>OPSQAI-Setup.exe</font> download link from the Customer Portal — 24-hour validity, logged for audit.", "Body"),
          p("Two installation modes:", "Body"),
          numbers([
              "<b>Interactive</b> — run <font face='Mono'>OPSQAI-Setup.exe</font> as Administrator. The wizard performs prerequisite checks, installs the services, and starts them.",
              "<b>Unattended (silent)</b> — for fleet rollouts: <font face='Mono'>OPSQAI-Setup.exe /S /CONFIG=C:\\path\\to\\answers.json</font>. See the answers schema in section 4.",
          ]),
          p("After install, the following services are registered with WinSW and started on boot:", "Body"),
          data_table(
              ["Service (WinSW id)", "Purpose"],
              [
                  ["OpsqaiDatabase", "Embedded PostgreSQL + pgvector, managed via pg_ctl"],
                  ["OpsqaiPlatform", "TanStack Start web application"],
                  ["OpsqaiWorker", "Background jobs (ingest, embeddings, exports)"],
                  ["OpsqaiUpdater", "Fetches and verifies signed release manifests"],
                  ["OpsqaiCaddy", "TLS reverse proxy in front of the platform service"],
              ],
              col_widths=[55*mm, 115*mm],
          ),
          Spacer(1, 4),
          callout("Recent fix (July 2026)",
                  "The Database service now uses <font face='Mono'>pg_ctl start</font> instead of spawning <font face='Mono'>postgres.exe</font> directly, because WinSW runs as <font face='Mono'>LocalSystem</font> and PostgreSQL refuses to run under a fully privileged token. A watchdog polls <font face='Mono'>pg_isready</font> every 10 seconds; if PostgreSQL stops, WinSW restarts the service. Startup errors land in <font face='Mono'>C:\\ProgramData\\OPSQAI\\data\\pgsql\\log\\postgres.log</font>.")]

    S += [PageBreak(),
          p("4. Unattended install — answers.json", "H2"),
          code_block('''{
  "installId": "acme-prod-01",
  "company": { "name": "Acme GmbH", "contactEmail": "it@acme.com",
               "timezone": "Europe/Berlin" },
  "admin":   { "email": "admin@acme.com",
               "password": "GeneratedStrongPassword!" },
  "database": { "mode": "embedded" },
  "storage":  { "mode": "local" },
  "ai":       { "provider": "openai", "apiKey": "sk-..." }
}'''),
          p("External database and S3 storage variants:", "Body"),
          code_block('''"database": {
  "mode": "external",
  "external": {
    "host": "db.internal", "port": 5432,
    "database": "opsqai", "username": "opsqai", "password": "..."
  }
},
"storage": {
  "mode": "s3",
  "s3": {
    "endpoint": "https://s3.eu-central-1.amazonaws.com",
    "region":   "eu-central-1",
    "bucket":   "opsqai",
    "accessKey": "...", "secretKey": "..."
  }
}'''),
          p("<font face='Mono'>answers.json</font> contains secrets. Deliver it over a secured channel (SCCM/Intune, Ansible-Vault, GPO with restricted share ACL) and delete it after <font face='Mono'>OPSQAI-Setup.exe</font> exits. Only derived, non-secret fields land in <font face='Mono'>%ProgramData%\\OPSQAI\\config\\config.json</font> (ACL: Administrators + SYSTEM only).", "Small")]

    S += [PageBreak(),
          p("5. Setup Wizard", "H2"),
          p("The wizard opens automatically on first launch at <font face='Mono'>/first-run</font>. It is public while there are zero platform admins, and permanently sealed after step 9 succeeds.", "Body"),
          numbers([
              "Accept EULA (explicit checkbox).",
              "Import Installation License — paste the signed <font face='Mono'>opsqai.v1.…</font> token.",
              "Configure Storage — probe upload / read / delete against the uploads bucket.",
              "Configure AI provider — Lovable Gateway / OpenAI / Azure / OpenAI-compatible (Ollama, vLLM, LM Studio).",
              "Configure SMTP — host, port, from-address; credentials go to <font face='Mono'>secrets.env</font>.",
              "Configure SSO (optional).",
              "Configure Backup — target and credentials.",
              "Test connections — every probe must succeed to advance.",
              "Create Admin — creates the first platform_owner atomically (advisory-locked, race-safe).",
              "Finish — redirects to <font face='Mono'>/auth</font>.",
          ]),
          callout("Secret handling",
                  "AI provider API key, SMTP password, and backup destination credentials are written to <font face='Mono'>secrets.env</font> under a restricted ACL. The database only stores non-secret identifiers (host, port, provider kind, bucket name). Progress is stored as step ids only — no secrets are ever written to <font face='Mono'>platform_config.setup_progress</font>.")]

    S += [PageBreak(),
          p("6. PostgreSQL", "H2"),
          p("<b>Embedded mode (default).</b> An embedded PostgreSQL is managed by the <font face='Mono'>OpsqaiDatabase</font> service via <font face='Mono'>pg_ctl</font>. Data files live under <font face='Mono'>C:\\ProgramData\\OPSQAI\\data\\pgsql\\</font>. Extensions <font face='Mono'>pgvector</font> and <font face='Mono'>pgcrypto</font> are pre-installed.", "Body"),
          p("<b>External mode.</b> Provide a PostgreSQL 15+ endpoint with <font face='Mono'>pgvector</font> and <font face='Mono'>pgcrypto</font> available. Superuser is only needed once, to install the extensions.", "Body"),
          p("7. Object storage", "H2"),
          bullets([
              "<b>Local mode</b> — files under <font face='Mono'>C:\\ProgramData\\OPSQAI\\data\\objects\\</font>.",
              "<b>S3 mode</b> — S3-compatible endpoint. Buckets used: <font face='Mono'>opsqai-documents</font>, <font face='Mono'>opsqai-brand</font>, <font face='Mono'>opsqai-artifacts</font>. The last is regenerable.",
          ])]

    S += [p("8. AI provider", "H2"),
          data_table(
              ["Provider", "Notes"],
              [
                  ["OpenAI", "Customer's own API key. Region pinned by account."],
                  ["Azure OpenAI", "Customer's own resource + deployment names."],
                  ["Self-hosted OpenAI-compatible", "vLLM / Ollama / LM Studio — base URL + key."],
                  ["Lovable AI Gateway", "Only when the install permits egress to opsqai.de."],
              ],
              col_widths=[55*mm, 115*mm],
          ),
          Spacer(1, 4),
          p("Model roles: <b>chat</b>, <b>embed</b> (must remain stable across the corpus lifetime), and optional <b>stt / tts</b>. Every provider adapter exposes <font face='Mono'>probe()</font>; <font face='Mono'>opsqai doctor</font> uses it to report latency and model list.", "Body"),
          callout("Changing the embedding model",
                  "Changing the embedding model requires re-embedding the entire corpus. Plan this as a maintenance window — do not do it silently.")]

    S += [PageBreak(),
          p("9. Users, roles, organization", "H2"),
          p("Authentication uses email/password by default; Google login and SAML SSO are optional. Authorization is RBAC. Roles are stored in a dedicated <font face='Mono'>user_roles</font> table and checked through a security-definer function <font face='Mono'>has_role(user_id, role)</font> — never on the profile row.", "Body"),
          bullets([
              "<b>platform_owner</b> — first admin, full control.",
              "<b>platform_admin</b> — administration of the install.",
              "<b>company_admin</b> / <b>company_manager</b> — manage users, content, and analytics inside their organization.",
              "<b>user</b> — end user (Chat, Knowledge Base, Academy, FAQ).",
          ])]

    S += [p("10. Knowledge Base", "H2"),
          p("Ingest documents (PDF, DOCX, XLSX, HTML, MD, TXT). The pipeline is:", "Body"),
          RagFlow(),
          Spacer(1, 4),
          p("Chunks are stored in <font face='Mono'>document_chunks</font> with a pgvector embedding column. Retrieval is cosine top-k, filtered by RBAC and department. When retrieval returns nothing relevant, the system answers &quot;no answer&quot; — it does not hallucinate.", "Body")]

    S += [p("11. FAQ", "H2"),
          p("Curated FAQ entries answer directly. When no curated entry matches, retrieval falls back to the Knowledge Base with the same grounding rules.", "Body"),
          p("12. Academy", "H2"),
          p("Structured onboarding and training: lessons, chapters, quizzes, and certificates. Progress and quiz scores are persisted per user and available for audit export.", "Body"),
          p("13. AI Audit", "H2"),
          p("Every completion is recorded in <font face='Mono'>ai_audits</font> with input hash, output hash, model, latency, token counts, and the retrieval chunk ids used. Governance-relevant admin actions land in <font face='Mono'>audit_log</font>.", "Body")]

    S += [PageBreak(),
          p("14. Updates", "H2"),
          p("The <font face='Mono'>OpsqaiUpdater</font> service fetches signed release manifests. Preconditions:", "Body"),
          bullets([
              "<font face='Mono'>maintenance_expires_at</font> on the Installation License is in the future.",
              "A verified backup exists in the last 24 hours.",
              "<font face='Mono'>opsqai doctor</font> reports green.",
          ]),
          p("CLI:", "Body"),
          code_block("opsqai update fetch\nopsqai update verify\nopsqai update apply\nopsqai doctor\n\n# Rollback (previous image + pre-update schema snapshot kept 7 days):\nopsqai update rollback"),
          p("Release manifests carry <font face='Mono'>security_relevant: true</font> on releases that address CVEs or hardening issues. These should be applied within the SLA agreed in the contract.", "Small")]

    S += [p("15. Modules — enable / disable", "H2"),
          p("Modules become available automatically when a valid Module License is present. Manual disabling is at <font face='Mono'>/app/admin/platform → Modules</font>.", "Body"),
          data_table(
              ["Event", "Effect"],
              [
                  ["expires_at passed", "Module UI locked, retrieval blocked, existing data intact."],
                  ["maintenance_expires_at passed", "Module keeps running, updates blocked."],
                  ["Revoked", "Immediate lock on next heartbeat or bundle import. Data is not deleted."],
                  ["Renewed", "Access restored on next heartbeat or bundle import."],
              ],
              col_widths=[55*mm, 115*mm],
          )]

    S += [PageBreak(),
          p("16. Backups", "H2"),
          p("<b>Backups are the customer's responsibility.</b> OPSQAI ships reference tooling; the customer runs it, monitors it, and verifies restores.", "Body"),
          p("Reference PostgreSQL backup (embedded mode):", "Body"),
          code_block('pg_dump --format=custom --no-owner --no-privileges \\\n  --file="C:\\Backups\\opsqai-%DATE%.dump" \\\n  "$POSTGRES_URL"'),
          p("Object storage: mirror <font face='Mono'>opsqai-documents</font> and <font face='Mono'>opsqai-brand</font> off-site. <font face='Mono'>opsqai-artifacts</font> is regenerable.", "Body"),
          p("Include <font face='Mono'>licenses.token</font>, <font face='Mono'>platform_config</font>, and <font face='Mono'>license_signing_keys</font> — these anchor DR.", "Body"),
          p("<b>Retention.</b> Daily for 14 days, weekly for 12 weeks, monthly for 12 months. Encrypt at rest before shipping off-site (<font face='Mono'>age</font> or <font face='Mono'>gpg</font>). Never store the encryption key on the same host as the backup.", "Body")]

    S += [p("17. Restore", "H2"),
          p("Stop the platform service, restore the PostgreSQL dump, restart the service, and run Doctor. Full step-by-step is included in the DR runbook shipped with your install.", "Body"),
          p("18. Doctor", "H2"),
          p("<font face='Mono'>opsqai doctor</font> runs in-app at <font face='Mono'>/app/platform/doctor</font> and on the CLI.", "Body"),
          bullets([
              "Database connectivity + extensions present.",
              "Object storage reachable, bucket policy correct.",
              "SMTP handshake.",
              "AI provider probe (latency + model listing).",
              "Installation License present, not expired, not revoked.",
              "Each active Module License valid.",
              "Signing keys and CRL freshness (warn if CRL > 30 days on online installs).",
              "Migration state (all migrations applied).",
              "Disk headroom; latest release manifest vs current installer version.",
          ]),
          p("Exit codes: <b>0</b> all green · <b>1</b> warnings · <b>2</b> red (do NOT apply updates until resolved). Recommended: schedule every 15 minutes and forward exit-2 events to your alerting.", "Body")]

    S += [PageBreak(),
          p("19. License management", "H2"),
          numbers([
              "Go to <font face='Mono'>/app/platform/license-activation</font>.",
              "Paste the Installation License token (starts with <font face='Mono'>opsqai.v1.</font>).",
              "Click <b>Verify</b> — the install checks signature, install_id, and version. Mismatches are rejected.",
              "Click <b>Activate</b> — the token is stored in <font face='Mono'>licenses</font>. If the install was in Recovery Mode, it exits.",
          ]),
          p("<b>Add a Module License.</b> Same page → <b>Add License</b>. The verifier enforces version = 1, kind = module, install_id match, key_id present, not revoked.", "Body"),
          p("<b>Offline activation bundle.</b> If the install cannot reach opsqai.de, download the bundle from the Customer Portal and import it via <b>Import Bundle</b>. The verifier accepts the CRL and all licenses atomically.", "Body")]

    S += [p("20. Troubleshooting", "H2"),
          p("Errors carry stable codes <font face='Mono'>OPSQAI-Exxxx</font>. Reference them when opening a support ticket.", "Small"),
          data_table(
              ["Code", "Symptom", "Fix"],
              [
                  ["E1001", "Boot loops in Recovery Mode", "Activate license at /app/platform/license-activation"],
                  ["E1002", "\"Unknown license_version\"", "Re-issue token from OPSQAI"],
                  ["E1003", "Signature verification failed", "Import fresh activation bundle"],
                  ["E1004", "install_id mismatch", "Confirm install_id in Doctor and reissue"],
                  ["E1005", "CRL stale (> 30 days)", "Restore egress or import fresh bundle"],
                  ["E2001", "pgvector extension missing", "CREATE EXTENSION vector"],
                  ["E2002", "Migration pending", "opsqai update apply"],
                  ["E3001", "AI provider probe failed", "Re-verify in Admin → AI"],
                  ["E3002", "Embedding model mismatch", "Re-embed corpus or revert model"],
                  ["E4001", "SMTP handshake failed", "Verify at Admin → Email"],
                  ["E5001", "Object storage 403", "Fix IAM policy"],
                  ["E6001", "Doctor: update available", "Plan update (section 14)"],
                  ["E6002", "Doctor red on backup age", "Run backup"],
                  ["E9999", "Unknown", "Attach opsqai doctor --json to ticket"],
              ],
              col_widths=[18*mm, 72*mm, 80*mm],
          )]

    S += [PageBreak(),
          p("21. Security posture (customer-facing subset)", "H2"),
          bullets([
              "Transport: HTTPS everywhere; customer-supplied certificate or Caddy-managed.",
              "At rest: PostgreSQL data-at-rest encryption is the customer's responsibility.",
              "Authentication: email/password + Google + optional SAML SSO.",
              "Authorization: RBAC via <font face='Mono'>user_roles</font> + <font face='Mono'>has_role()</font>; roles are never stored on profiles.",
              "Licensing crypto: Ed25519 with key_id-based rotation.",
              "Audit: every governance-relevant action lands in <font face='Mono'>audit_log</font>; every completion in <font face='Mono'>ai_audits</font>.",
          ]),
          p("22. Best practices", "H2"),
          bullets([
              "Run a nightly backup and verify a restore monthly on a scratch host.",
              "Rotate AI provider keys at least annually; the wizard does not persist the previous key.",
              "Monitor Doctor every 15 minutes; alert on exit code 2.",
              "Watch <font face='Mono'>maintenance_expires_at</font> — plan the renewal 60 days in advance.",
              "Keep the activation bundle age below 60 days; refresh proactively via the Customer Portal.",
              "Store your <font face='Mono'>install_id</font> slug in your IT documentation — you will need it for DR.",
              "Never share <font face='Mono'>answers.json</font> or <font face='Mono'>secrets.env</font> outside the install host.",
          ])]

    b.build()


def build_internal_guide():
    b = DocBuilder(OUT_DIR/"OPSQAI-Internal-Platform-Guide.pdf",
                   "OPSQAI Internal Platform Guide",
                   "How OPSQAI is built and operated by the OPSQAI team. Product philosophy, architecture, licensing, installers, updates, and end-to-end delivery.",
                   "Internal · OPSQAI Staff")
    S = b.story

    S += [p("Product philosophy", "H1"),
          p("OPSQAI is designed around a single principle: <b>the customer's operational data never leaves the customer's boundary</b>. Every architectural decision defends that principle.", "Body"),
          bullets([
              "One product, three surfaces: Management Center, Customer Portal, Self-Hosted Windows install.",
              "Same codebase, two deployment modes, enforced at both UI and server layer via <font face='Mono'>OPSQAI_MODE</font>.",
              "Communication is one-directional: install → MC. Never the other way (AD-005).",
              "MC holds no customer infrastructure secrets (AD-009).",
              "Retrieval never crosses the install boundary (AD-004).",
          ]),
          callout("The two products, never mixed",
                  "<b>Self-hosted</b> is the customer's UI. <b>Management Center</b> is the OPSQAI team's UI for administering customers. Never add MC screens to a self-hosted build, and never expose customer screens on the MC. Communication is only via bounded APIs (license, package, telemetry).")]

    S += [p("Architecture at a glance", "H2"),
          ArchDiagram(),
          Spacer(1, 4),
          p("Key architectural decisions (excerpt):", "Body"),
          data_table(
              ["ID", "Decision"],
              [
                  ["AD-001", "Same codebase for MC and self-hosted (mode gate)."],
                  ["AD-002", "Enforced by deployment-mode helper + assertMode() server-side."],
                  ["AD-003", "Customer Portal lives on MC — must serve pre-install info."],
                  ["AD-004", "Retrieval never crosses the install boundary."],
                  ["AD-005", "MC → install communication is one-directional."],
                  ["AD-006", "Per-module signed tokens, NOT a modules[] array."],
                  ["AD-007", "license_version: 1 on day one; verifier rejects unknowns."],
                  ["AD-008", "key_id on every token — enables rotation."],
                  ["AD-009", "MC holds NO customer infrastructure secrets."],
                  ["AD-018", "Setup Wizard progress = step ids only, never secrets."],
                  ["AD-019", "Doctor is both an in-app panel and a CLI."],
                  ["AD-020", "installer_version decoupled from application version."],
              ],
              col_widths=[20*mm, 150*mm],
          )]

    S += [PageBreak(),
          p("Management Center", "H2"),
          p("Hosted at opsqai.de. Accessible to OPSQAI staff only. Owns:", "Body"),
          bullets([
              "Customer registry — companies, technical contacts, ownership.",
              "License installations — <font face='Mono'>license_installs</font> rows with human-readable <font face='Mono'>install_id</font> slugs.",
              "Licenses — Installation and Module tokens under <font face='Mono'>/app/platform/licenses</font>.",
              "Signing keys — <font face='Mono'>license_signing_keys</font>, Ed25519 keypairs, active + rotation flags.",
              "Releases — installer versions, application versions, signed release manifests.",
              "Activation bundles — periodic re-issue including CRL and current signing key set.",
              "Ownership transfer flow — <font face='Mono'>license-transfer.functions.ts</font>, audit trail on both sides.",
              "Support triage — heartbeat status, doctor bundle intake, audit log.",
          ]),
          p("MC routes (typical):", "Body"),
          data_table(
              ["Route", "Purpose"],
              [
                  ["/app/platform/companies", "Customer registry"],
                  ["/app/platform/licenses", "Issue, package, regenerate, revoke"],
                  ["/app/platform/signing-keys", "Key lifecycle and rotation"],
                  ["/app/platform/releases", "Manifests and channel management"],
                  ["/app/platform/support", "Ticket triage"],
                  ["/app/platform/audit", "Cross-tenant audit log (MC scope)"],
              ],
              col_widths=[70*mm, 100*mm],
          )]

    S += [PageBreak(),
          p("Customer Portal", "H2"),
          p("A slice of the MC exposing per-customer resources. A customer contact never sees another customer's data.", "Body"),
          bullets([
              "Installer downloads (24-hour signed links, audit-logged).",
              "Activation bundles (JSON, Ed25519-signed, 90-day validity).",
              "Documentation, release notes.",
              "Subscription state and support routing.",
          ]),
          p("Portal auth is decoupled from install auth (AD-003): the portal must serve pre-install information — activation bundles for a brand-new install — so it cannot rely on the install for identity.", "Small")]

    S += [p("Self-Hosted internals", "H2"),
          p("The Windows install runs as five WinSW-managed services:", "Body"),
          data_table(
              ["Service", "Executable / role"],
              [
                  ["OpsqaiDatabase", "Node bootstrap → pg_ctl-managed embedded PostgreSQL with pgvector and pgcrypto"],
                  ["OpsqaiPlatform", "TanStack Start server (SSR + server functions)"],
                  ["OpsqaiWorker", "Ingest, embed, exports, scheduled tasks"],
                  ["OpsqaiUpdater", "Fetch and verify signed release manifests"],
                  ["OpsqaiCaddy", "TLS reverse proxy in front of the platform service"],
              ],
              col_widths=[40*mm, 130*mm],
          ),
          Spacer(1, 4),
          p("Bootstrap is a Go binary (<font face='Mono'>installer/</font>) that verifies prerequisites, seeds config, starts services, waits on health, and opens the Setup Wizard. The service manager (<font face='Mono'>opsqai-windows/tools/service-manager</font>) is the operator-side CLI for the install.", "Body"),
          callout("Recent stability fix",
                  "The database service now invokes <font face='Mono'>pg_ctl start</font> under a restricted token instead of spawning <font face='Mono'>postgres.exe</font> as LocalSystem. A watchdog polls <font face='Mono'>pg_isready</font> every 10s; on unexpected stop, Node exits non-zero and WinSW restarts. Errors captured in <font face='Mono'>C:\\ProgramData\\OPSQAI\\data\\pgsql\\log\\postgres.log</font>.")]

    S += [PageBreak(),
          p("Licensing internals", "H2"),
          p("Token format:", "Body"),
          code_block("opsqai.v1.<base64url(payload)>.<base64url(ed25519_signature)>"),
          p("Payload always includes <font face='Mono'>license_version: 1</font>, <font face='Mono'>kind</font>, <font face='Mono'>install_id</font>, <font face='Mono'>key_id</font>, <font face='Mono'>issued_at</font>, <font face='Mono'>expires_at</font>, <font face='Mono'>maintenance_expires_at</font>. Two axes: Installation License + per-Module Licenses. No SKU tiers.", "Body"),
          p("Issue flow (MC):", "Body"),
          FlowDiagram(["Validate payload (Zod)", "Load active signing key (highest key_id)", "Sign Ed25519", "Insert into licenses", "Write audit_log"]),
          Spacer(1, 4),
          p("Verify flow (install):", "Body"),
          FlowDiagram(["Parse envelope", "Reject unknown license_version", "Look up key_id", "Verify Ed25519", "Match install_id + CRL", "Return LicenseVerdict"])]

    S += [p("Signing key lifecycle", "H2"),
          bullets([
              "Ed25519 (RFC 8032). Private keys held only in the Management Center.",
              "Multiple active keys can coexist (<font face='Mono'>license_signing_keys.active = true</font>).",
              "Rotation cadence: annual, or immediately upon suspected compromise.",
              "Dual-signing window: ≥ 90 days overlap so offline installs pick up the new key via their next activation bundle before the old one is deactivated.",
              "Emergency rotation (compromise): all outstanding tokens signed by the compromised key are added to the CRL; a fresh activation bundle is generated for every install and pushed via the Customer Portal.",
          ]),
          p("Revocation", "H2"),
          bullets([
              "Central CRL held on the MC, Ed25519-signed.",
              "CRL is included in every activation bundle.",
              "Installs refresh CRL via heartbeat (online) or bundle import (offline).",
              "Doctor warns when CRL age > 30 days.",
          ])]

    S += [PageBreak(),
          p("install_id — chosen once, never derived", "H2"),
          p("<font face='Mono'>install_id</font> is a human-readable slug (e.g. <font face='Mono'>edeka-prod-01</font>), assigned when the <font face='Mono'>license_installs</font> row is created and validated by <font face='Mono'>InstallIdSchema</font>. It is <b>stored, not computed</b> — never derived from order_id or any other field. It is the same slug used by licenses, heartbeat, CRL and activation bundle across all phases.", "Body"),
          p("Regeneration is idempotent because <font face='Mono'>generateInstallationPackage</font> reads the existing install_id from <font face='Mono'>license_installs</font> and reuses it — the same order always produces the same identity as long as the row exists.", "Small"),
          p("Recovery if the license_installs row is lost", "H2"),
          numbers([
              "Retrieve the original slug from audit log (installation_package.generated entries), the customer's own copy of the ZIP (<font face='Mono'>.env.template</font> or the activation bundle), or the Customer Portal audit trail.",
              "Re-create <font face='Mono'>license_installs</font> with the <b>exact same</b> slug via the standard provisioning flow.",
              "Regenerate the installation package. The customer's existing deployment continues to validate against the same identity.",
              "If the slug cannot be recovered from any source → <b>hard reset</b>. This is a two-sided operation, not just an MC action: the customer must update <font face='Mono'>OPSQAI_INSTALL_ID</font> in their config, replace the activation bundle, and restart. Support must not assume &quot;regenerate = done&quot;.",
          ])]

    S += [PageBreak(),
          p("Installer generation flow", "H2"),
          p("Platform admin opens <font face='Mono'>/app/platform/licenses</font>, clicks <b>Package</b> on the install row, chooses an installer version (empty = latest Stable), and clicks <b>Generate package</b>. The technical contact receives a signed 24-hour download link; every download is logged with actor, IP, user-agent, and expiry into <font face='Mono'>installation_package_downloads</font>.", "Body"),
          FlowDiagram(["MC: Package clicked", "Read install_id from license_installs", "Embed signed activation bundle", "Sign download URL (24h)", "Deliver via email + Portal"]),
          Spacer(1, 4),
          p("By default, regeneration adds the previous bundle to the CRL — it stops activating new installs on the next heartbeat. The audit log records <font face='Mono'>installation_package.generated</font> with <font face='Mono'>previous_bundle_revoked = true</font>.", "Body"),
          p("Escape hatch: check <b>Keep previous bundle valid</b> when the customer is restoring from their own backup and must keep the old bundle working. Surfaced with an explicit warning.", "Small"),
          callout("Zero infrastructure secrets in the ZIP",
                  "The generated ZIP holds NO customer infrastructure secrets (AD-009). <font face='Mono'>POSTGRES_PASSWORD</font> and object storage credentials are placeholders; the bundled bootstrap generates strong random values on first boot on a customer-owned data volume.")]

    S += [PageBreak(),
          p("Update system", "H2"),
          bullets([
              "Signed release manifests (Ed25519). The updater service verifies and applies.",
              "Preconditions: maintenance in future, verified backup within 24h, Doctor green.",
              "Rollback: previous image + pre-update schema snapshot are kept 7 days.",
              "<font face='Mono'>installer_version</font> is decoupled from application version (AD-020); manifests declare both.",
              "Offline update flow (roadmap): signed activation bundles + offline import.",
              "Unattended install + group-policy deployment (roadmap).",
          ]),
          p("Release management", "H2"),
          bullets([
              "Channels: Stable, Beta.",
              "Manifest carries <font face='Mono'>security_relevant: true</font> when addressing CVEs or hardening.",
              "Release notes surfaced in the Customer Portal.",
              "Pre-release checklist in <font face='Mono'>docs/engineering/08-pre-release-checklist.md</font>.",
          ])]

    S += [p("Module system", "H2"),
          bullets([
              "One signed token per module (AD-006). No <font face='Mono'>modules[]</font> arrays.",
              "Enabling: valid Module License present, <font face='Mono'>expires_at</font> in the future.",
              "expires_at passed → UI locked, retrieval blocked, data intact.",
              "maintenance_expires_at passed → module keeps running, updates blocked.",
              "Revoked → immediate lock on next heartbeat / bundle import. Data retained indefinitely.",
              "Purge: Admin → Modules → Purge (audit-logged) when the customer fully off-boards from a module.",
          ])]

    S += [PageBreak(),
          p("Operational playbooks", "H1"),

          p("Deliver a new customer", "H2"),
          FlowDiagram(["Prospect", "Contract", "Company + license_installs", "Issue Installation License", "Generate installation package", "Portal handover", "Customer install", "Support &amp; updates"], h=32*mm),
          Spacer(1, 4),
          bullets([
              "Capture legal name, billing contact, technical contact from sales handover.",
              "Choose <font face='Mono'>install_id</font> slug together with the customer (short, stable, human-readable).",
              "Create the <font face='Mono'>license_installs</font> row and issue the Installation License.",
              "Add Module Licenses per contract.",
              "Generate the package — technical contact receives the signed link.",
              "Verify heartbeat lands within 72h of delivery; open a check-in ticket if not.",
          ])]

    S += [p("Issue a license (UI, CLI, programmatic)", "H2"),
          p("<b>UI.</b> <font face='Mono'>/app/platform/licenses → Issue</font>.", "Body"),
          p("<b>CLI (offline).</b>", "Body"),
          code_block("opsqai-mc license issue \\\n  --install-id <uuid> --kind install \\\n  --seats 100 --maintenance 2027-07-11"),
          p("<b>Programmatic.</b> <font face='Mono'>issueLicense</font> server function under <font face='Mono'>src/lib/licenses.functions.ts</font>. Requires <font face='Mono'>platform_admin</font>.", "Body")]

    S += [p("Generate installation package", "H2"),
          numbers([
              "Open <font face='Mono'>/app/platform/licenses</font>.",
              "Click <b>Package</b> on the install row.",
              "Choose installer version (empty = latest Stable, pinned = whatever is saved on the license).",
              "Click <b>Generate package</b>.",
              "The technical contact receives a 24-hour download link by email; the URL is also opened in the current tab.",
          ]),
          p("Regeneration follows the same flow. Default: previous bundle added to the CRL. To keep an older bundle valid (e.g. customer restoring their own backup), check <b>Keep previous bundle valid</b> before clicking <b>Regenerate</b>. Programmatic entry point: <font face='Mono'>generateInstallationPackage</font> in <font face='Mono'>src/lib/installation-package.functions.ts</font>.", "Small")]

    S += [PageBreak(),
          p("Revocation propagation", "H2"),
          bullets([
              "MC toggles <font face='Mono'>licenses.revoked = true</font>. CRL is pushed.",
              "Next heartbeat (online) delivers the CRL update; the module locks.",
              "Next bundle import (offline) delivers the CRL update; the module locks.",
              "Data is not deleted. Renewal restores access on the next heartbeat / bundle import.",
          ])]

    S += [p("Support triage", "H2"),
          bullets([
              "Check the last heartbeat time and Doctor output attached to the ticket.",
              "Cross-reference the customer's <font face='Mono'>install_id</font> and license state.",
              "For DR situations, follow the DR runbook in <font face='Mono'>docs/engineering/runbooks/</font>.",
              "Log every action in the MC audit log.",
          ])]

    S += [p("Access control", "H2"),
          data_table(
              ["Role", "Where it applies", "What it can do"],
              [
                  ["platform_owner", "Self-hosted install", "Full control of the install. First admin created by wizard."],
                  ["platform_admin", "Self-hosted install", "Administer the install (users, integrations, health)."],
                  ["MC platform_admin", "Management Center", "Issue licenses, generate packages, rotate keys, audit."],
                  ["MC support", "Management Center", "Read-only cross-customer view for triage."],
                  ["company_admin", "Self-hosted install", "Manage users, content, analytics within an organization."],
                  ["user", "Self-hosted install", "End-user access to modules per RBAC."],
              ],
              col_widths=[35*mm, 45*mm, 90*mm],
          )]

    S += [PageBreak(),
          p("End-to-end flow", "H1"),
          FlowDiagram(["Prospect", "Contract", "License", "Installer", "Portal", "Self-Hosted", "Support", "Updates"], h=32*mm),
          Spacer(1, 6),
          p("The dotted lines below are important:", "Body"),
          bullets([
              "The MC does NOT push into a running install. The install pulls from the MC over signed HTTPS (heartbeat, release manifests, activation bundles).",
              "The Portal serves signed 24-hour installer links and activation bundles. It never proxies runtime traffic.",
              "The Self-Hosted install owns the AI provider connection. The MC does not know the customer's AI provider credentials.",
              "Support tickets carry <font face='Mono'>opsqai doctor --json</font> output; OPSQAI staff cannot log in to the customer install.",
          ])]

    S += [p("Internal Workspace (system docs regeneration)", "H2"),
          p("The MC hosts an <b>OPSQAI Internal</b> workspace containing regeneratable system documentation. <font face='Mono'>regenerateSystemKnowledge</font> in <font face='Mono'>src/lib/system-docs.functions.ts</font> materializes catalog entries into <font face='Mono'>knowledge_documents</font> + embedded <font face='Mono'>document_chunks</font> for the system company. Requires <font face='Mono'>platform_admin</font>. Body hashes are stored in <font face='Mono'>system_doc_catalog</font> so re-embedding only runs when content changes (or <font face='Mono'>force = true</font>).", "Body"),
          p("Onboarding a new OPSQAI hire", "H2"),
          numbers([
              "Read this guide end to end.",
              "Read <font face='Mono'>docs/architecture-book/</font> and <font face='Mono'>docs/security-documentation/</font> in full.",
              "Read <font face='Mono'>docs/engineering/</font> — release process, migrations, pre-release checklist.",
              "Shadow one full delivery cycle (Prospect → Contract → License → Package → Install → First heartbeat).",
              "Shadow one support ticket end to end.",
              "Get <font face='Mono'>platform_admin</font> on MC only after passing an internal review with the founder.",
          ])]

    b.build()


# ============================================================
# MAIN
# ============================================================
def main():
    build_product_overview()
    build_sales_playbook()
    build_admin_guide()
    build_internal_guide()
    for pdf in ["OPSQAI-Product-Overview.pdf",
                "OPSQAI-Sales-Playbook.pdf",
                "OPSQAI-Self-Hosted-Administrator-Guide.pdf",
                "OPSQAI-Internal-Platform-Guide.pdf"]:
        path = OUT_DIR / pdf
        print(f"OK: {path} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()

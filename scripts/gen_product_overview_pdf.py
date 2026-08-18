#!/usr/bin/env python3
"""
Generates public/OPSQAI_Product_Overview.pdf — the downloadable A4 product
overview served from the /product-overview page.

Content mirrors the website page (no invented functionality, no internal
implementation details). Brand: deep green field, gold rules, Sovereign Mark.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "OPSQAI_Product_Overview.pdf"

W, H = A4
M = 20 * mm

BG = colors.HexColor("#04211A")
BG_ALT = colors.HexColor("#062A21")
GOLD = colors.HexColor("#C9A24C")
GOLD_SOFT = colors.HexColor("#E0C27E")
GOLD_LINE = colors.HexColor("#3A3520")
CREAM = colors.HexColor("#F2EDE3")
CREAM_DIM = colors.HexColor("#A8B3AC")


def _font(spec: str, name: str) -> str:
    path = subprocess.check_output(["fc-match", "-f", "%{file}", spec], text=True).strip()
    pdfmetrics.registerFont(TTFont(name, path))
    return name


BODY = _font("DejaVu Sans", "OQBody")
BOLD = _font("DejaVu Sans:bold", "OQBold")
SERIF = _font("DejaVu Serif:italic", "OQSerif")


# --------------------------------------------------------------------------- #
# primitives
# --------------------------------------------------------------------------- #
def page_bg(c, alt: bool = False) -> None:
    c.setFillColor(BG_ALT if alt else BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(GOLD_LINE)
    c.setLineWidth(0.6)
    c.rect(M * 0.55, M * 0.55, W - M * 1.1, H - M * 1.1, stroke=1, fill=0)


def mark(c, cx: float, cy: float, r: float) -> None:
    """Sovereign Mark: octagon frame, nodes, OQ monogram."""
    pts = []
    for i in range(8):
        a = math.radians(22.5 + i * 45)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    c.setStrokeColor(GOLD)
    c.setLineWidth(r * 0.045)
    p = c.beginPath()
    p.moveTo(*pts[0])
    for pt in pts[1:]:
        p.lineTo(*pt)
    p.close()
    c.drawPath(p, stroke=1, fill=0)

    c.setLineWidth(r * 0.02)
    c.setStrokeColor(GOLD_LINE)
    p2 = c.beginPath()
    inner = [(cx + r * 0.86 * math.cos(math.radians(22.5 + i * 45)),
              cy + r * 0.86 * math.sin(math.radians(22.5 + i * 45))) for i in range(8)]
    p2.moveTo(*inner[0])
    for pt in inner[1:]:
        p2.lineTo(*pt)
    p2.close()
    c.drawPath(p2, stroke=1, fill=0)

    c.setFillColor(GOLD)
    for i in range(8):
        a = math.radians(i * 45)
        c.circle(cx + r * 0.78 * math.cos(a), cy + r * 0.78 * math.sin(a), r * 0.035,
                 stroke=0, fill=1)

    c.setFont(SERIF, r * 0.82)
    c.drawCentredString(cx, cy - r * 0.29, "OQ")


def eyebrow(c, x: float, y: float, text: str) -> float:
    c.setFillColor(GOLD)
    c.setFont(BOLD, 7.4)
    c.drawString(x, y, " ".join(text.upper()))
    c.setStrokeColor(GOLD_LINE)
    c.setLineWidth(0.6)
    c.line(x, y - 5, W - M, y - 5)
    return y - 18


def heading(c, x: float, y: float, text: str, size: float = 21) -> float:
    c.setFillColor(CREAM)
    c.setFont(BOLD, size)
    c.drawString(x, y, text)
    return y - size - 6


def wrap(c, text: str, font: str, size: float, max_w: float) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def para(c, x: float, y: float, text: str, max_w: float, size: float = 9.6,
         color=CREAM_DIM, leading: float = 14, font: str | None = None) -> float:
    f = font or BODY
    c.setFillColor(color)
    c.setFont(f, size)
    for line in wrap(c, text, f, size, max_w):
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(c, x: float, y: float, items: list[str], max_w: float,
            size: float = 9, leading: float = 13.2) -> float:
    for it in items:
        c.setFillColor(GOLD)
        c.setFont(BODY, size)
        c.drawString(x, y, "·")
        y = para(c, x + 9, y, it, max_w - 9, size=size, color=CREAM, leading=leading)
        y -= 1.5
    return y


def card(c, x: float, y_top: float, w: float, h: float) -> None:
    c.setFillColor(colors.HexColor("#062A21"))
    c.setStrokeColor(GOLD_LINE)
    c.setLineWidth(0.6)
    c.rect(x, y_top - h, w, h, stroke=1, fill=1)


def footer(c, page: int, total: int, label: str = "OPSQAI · Product Overview") -> None:
    c.setStrokeColor(GOLD_LINE)
    c.setLineWidth(0.6)
    c.line(M, M * 0.95, W - M, M * 0.95)
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 7.2)
    c.drawString(M, M * 0.95 - 10, label)
    c.drawRightString(W - M, M * 0.95 - 10, f"opsqai.de   ·   {page} / {total}")


TOTAL = 8


# --------------------------------------------------------------------------- #
# pages
# --------------------------------------------------------------------------- #
def page_cover(c) -> None:
    page_bg(c)
    mark(c, W / 2, H - 78 * mm, 22 * mm)

    c.setFillColor(CREAM)
    c.setFont(BOLD, 34)
    c.drawCentredString(W / 2, H - 108 * mm, "O P S Q A I")
    c.setFillColor(GOLD)
    c.setFont(BODY, 9.6)
    c.drawCentredString(W / 2, H - 118 * mm, " ".join("OPERATIONAL INTELLIGENCE PLATFORM"))

    c.setStrokeColor(GOLD_LINE)
    c.line(W / 2 - 45 * mm, H - 128 * mm, W / 2 + 45 * mm, H - 128 * mm)

    c.setFillColor(CREAM)
    c.setFont(BOLD, 15)
    c.drawCentredString(W / 2, H - 142 * mm, "One workspace for operational knowledge,")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 15)
    c.drawCentredString(W / 2, H - 150 * mm, "AI and intelligence.")

    y = H - 168 * mm
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9.4)
    for line in wrap(
        c,
        "OPSQAI brings company knowledge, AI-assisted workflows, learning and operational "
        "insights together in one connected platform — available Cloud or Self-Hosted.",
        BODY, 9.4, 130 * mm,
    ):
        c.drawCentredString(W / 2, y, line)
        y -= 14

    labels = ["Knowledge", "AI", "Learning", "Intelligence", "Management", "Deployment"]
    bw = (W - 2 * M) / 6
    for i, lab in enumerate(labels):
        x = M + i * bw
        c.setStrokeColor(GOLD_LINE)
        c.rect(x, 34 * mm, bw, 12 * mm, stroke=1, fill=0)
        c.setFillColor(GOLD)
        c.setFont(BODY, 6.6)
        c.drawCentredString(x + bw / 2, 39 * mm, lab.upper())

    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 7.4)
    c.drawCentredString(W / 2, 26 * mm, "opsqai.de   ·   Product Overview")


def page_challenge(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "The challenge")
    y = heading(c, M, y, "Operational knowledge is rarely")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 21)
    c.drawString(M, y, "where people need it.")
    y -= 34

    y = para(
        c, M, y,
        "In most organizations, procedures, SOPs, FAQs and operational documents are spread "
        "across shared drives, wikis, ticket systems and individual inboxes. The knowledge "
        "exists — finding the approved, current version at the moment of work does not.",
        W - 2 * M, size=10.2, leading=15.4,
    )
    y -= 12

    items = [
        ("Fragmented knowledge",
         "Documents live in different systems with no shared structure, ownership or lifecycle."),
        ("Difficult access to procedures",
         "Employees are not sure which document is approved, current or relevant to their situation."),
        ("Repeated questions",
         "The same operational questions are answered again and again by a few experienced colleagues."),
        ("Onboarding friction",
         "New employees depend heavily on informal knowledge transfer to become productive."),
        ("Limited visibility",
         "Management has little insight into what knowledge is missing, outdated or creating friction."),
    ]
    for title, body in items:
        card(c, M, y, W - 2 * M, 21 * mm)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 9.4)
        c.drawString(M + 8, y - 13, title)
        para(c, M + 8, y - 27, body, W - 2 * M - 16, size=9, leading=12.6)
        y -= 25 * mm

    footer(c, 2, TOTAL)


def page_what(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "What is OPSQAI")
    y = heading(c, M, y, "One connected operational")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 21)
    c.drawString(M, y, "workspace.")
    y -= 32

    y = para(
        c, M, y,
        "OPSQAI connects the knowledge an organization already has with the people who need it, "
        "while helping teams identify missing, outdated or difficult-to-access information. "
        "Instead of treating knowledge, learning, AI and management as isolated systems, OPSQAI "
        "brings them into one operational workspace.",
        W - 2 * M, size=10.2, leading=15.4,
    )
    y -= 14

    # hub visual
    cx = W / 2
    box_w, box_h = 46 * mm, 14 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.rect(cx - box_w / 2, y - box_h, box_w, box_h, stroke=1, fill=0)
    c.setFillColor(GOLD)
    c.setFont(BOLD, 13)
    c.drawCentredString(cx, y - box_h + 4.6 * mm, "OPSQAI")
    c.setStrokeColor(GOLD_LINE)
    c.line(cx, y - box_h, cx, y - box_h - 9 * mm)
    y = y - box_h - 9 * mm

    nodes = [
        ("Knowledge", "Knowledge Base, SOPs, FAQs, notes, lifecycle"),
        ("AI", "AI Chat with source-backed answers from approved knowledge"),
        ("Learning", "Academy, courses, assignments and progress"),
        ("Intelligence", "AI Audit, Knowledge Gaps, friction and learning signals"),
        ("Management", "Dashboard, KPIs, users, roles, departments, module access"),
        ("Deployment", "Cloud or Self-Hosted with local AI and offline-capable operation"),
    ]
    col_w = (W - 2 * M) / 2
    row_h = 20 * mm
    for i, (name, body) in enumerate(nodes):
        col, row = i % 2, i // 2
        x = M + col * col_w
        top = y - row * row_h
        card(c, x + 2, top, col_w - 4, row_h - 3 * mm)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 9.2)
        c.drawString(x + 10, top - 12, name)
        para(c, x + 10, top - 25, body, col_w - 24, size=8.6, leading=11.8)

    footer(c, 3, TOTAL)


CAPABILITIES = [
    ("Knowledge", "Bring operational knowledge into a structured workspace.",
     ["Knowledge Base", "SOPs and operational documents", "FAQs and notes",
      "Document lifecycle, age and update visibility", "Version awareness and review signals"],
     "Make approved company knowledge easier to find, manage and maintain."),
    ("AI", "Give employees a natural way to interact with approved company knowledge.",
     ["AI Chat", "Answers based on approved knowledge", "Source-backed responses",
      "Context-aware conversations", "Knowledge Gap detection"],
     "Turn approved knowledge into something employees can use when they need it."),
    ("Learning", "Connect company knowledge with onboarding and employee development.",
     ["Academy", "Courses and learning workflows", "Assignments",
      "Progress tracking", "Knowledge and learning signals"],
     "Help employees learn company processes in a structured way."),
    ("Operational Intelligence", "Understand the health of your knowledge and where attention is needed.",
     ["AI Audit", "Knowledge health signals", "Knowledge Gaps",
      "Friction and learning signals", "Recommendations and suggested actions"],
     "Understand where knowledge is missing, outdated or creating friction."),
    ("Management", "Give management a clearer overview of the operational workspace.",
     ["Management Dashboard and KPIs", "User capacity", "Departments, users and roles",
      "Module access and notifications", "Maintenance visibility"],
     "Make important operational signals easier to see and act on."),
    ("Cloud or Self-Hosted", "OPSQAI supports different deployment models.",
     ["Runs in the customer's own environment", "Local AI engine and local database",
      "Local semantic search", "Offline-capable daily operation",
      "Backup & Recovery, signed offline licensing"],
     "Your knowledge. Your infrastructure. Your AI."),
]


def page_capabilities(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "What OPSQAI can do")
    y = heading(c, M, y, "Six core capability areas.")
    y -= 12

    col_w = (W - 2 * M) / 2
    row_h = 61 * mm
    for i, (title, intro, items, key) in enumerate(CAPABILITIES):
        col, row = i % 2, i // 2
        x = M + col * col_w
        top = y - row * row_h
        card(c, x + 2, top, col_w - 4, row_h - 5 * mm)
        c.setFillColor(GOLD_SOFT)
        c.setFont(BODY, 7)
        c.drawString(x + 10, top - 12, f"0{i + 1}")
        c.setFillColor(CREAM)
        c.setFont(BOLD, 11)
        c.drawString(x + 10, top - 25, title)
        yy = para(c, x + 10, top - 38, intro, col_w - 24, size=8.6, leading=11.6)
        yy -= 3
        yy = bullets(c, x + 10, yy, items, col_w - 24, size=8.4, leading=11.4)
        c.setFillColor(GOLD_SOFT)
        c.setFont(SERIF, 8.6)
        for line in wrap(c, key, SERIF, 8.6, col_w - 24):
            c.drawString(x + 10, yy - 4, line)
            yy -= 11.4

    footer(c, 4, TOTAL)


def page_how(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "How it works")
    y = heading(c, M, y, "From company knowledge to")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 21)
    c.drawString(M, y, "operational clarity.")
    y -= 30

    stages = [
        ("Company knowledge", "SOPs · FAQs · operational documents · approved information"),
        ("OPSQAI knowledge layer", "Structured · versioned · lifecycle-aware · access-controlled"),
        ("AI + Learning + Analysis", "Grounded answers · courses and assignments · AI Audit · gap detection"),
        ("Employees and management",
         "Employees get answers · managers see insights · Knowledge Gaps become visible · "
         "recommended actions can be reviewed"),
    ]
    for i, (label, body) in enumerate(stages):
        h = 24 * mm
        card(c, M, y, W - 2 * M, h)
        c.setFillColor(GOLD)
        c.setFont(BODY, 7)
        c.drawString(M + 10, y - 13, f"0{i + 1}")
        c.setFillColor(CREAM)
        c.setFont(BOLD, 11.5)
        c.drawString(M + 26, y - 13, label)
        para(c, M + 26, y - 28, body, W - 2 * M - 40, size=9, leading=12.4)
        y -= h
        if i < len(stages) - 1:
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.7)
            c.line(W / 2, y - 2, W / 2, y - 7 * mm + 2)
            p = c.beginPath()
            p.moveTo(W / 2 - 2 * mm, y - 7 * mm + 3)
            p.lineTo(W / 2, y - 7 * mm - 1)
            p.lineTo(W / 2 + 2 * mm, y - 7 * mm + 3)
            c.setStrokeColor(GOLD)
            c.drawPath(p, stroke=1, fill=0)
            y -= 9 * mm

    y -= 8 * mm
    c.setFillColor(GOLD_SOFT)
    c.setFont(BOLD, 14)
    c.drawCentredString(W / 2, y, "A stronger operational knowledge system.")

    footer(c, 5, TOTAL)


USE_CASES = [
    ("Find the right procedure",
     "An employee needs to know how to handle a specific operational situation. They ask OPSQAI "
     "and receive guidance based on approved company knowledge and relevant sources."),
    ("Onboard faster",
     "New employees can access structured knowledge, learning content and company procedures "
     "without depending entirely on colleagues for every question."),
    ("Find what is missing",
     "Repeated questions and weakly supported requests can reveal Knowledge Gaps. Management can "
     "review these gaps and create or improve approved knowledge."),
    ("Keep knowledge healthy",
     "Document lifecycle and AI Audit signals help identify information that may require review: "
     "knowledge not reviewed recently, documents unchanged since their initial upload, and areas "
     "where information may be missing."),
    ("Give management better visibility",
     "Dashboards, KPIs, AI Audit and recommendations help management understand knowledge coverage, "
     "Knowledge Gaps, areas requiring support, learning signals, operational friction and "
     "recommended actions."),
]


def page_use_cases(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Use cases")
    y = heading(c, M, y, "What this looks like day to day.")
    y -= 14

    for i, (title, body) in enumerate(USE_CASES):
        h = 30 * mm
        card(c, M, y, W - 2 * M, h)
        c.setFillColor(GOLD)
        c.setFont(BODY, 6.8)
        c.drawString(M + 10, y - 12, f"USE CASE 0{i + 1}")
        c.setFillColor(CREAM)
        c.setFont(BOLD, 11)
        c.drawString(M + 10, y - 25, title)
        para(c, M + 10, y - 39, body, W - 2 * M - 20, size=9, leading=12.4)
        y -= h + 4 * mm

    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 8)
    c.drawString(M, y - 2, "All recommendations remain advisory and require human review.")

    footer(c, 6, TOTAL)


def page_self_hosted(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "OPSQAI Self-Hosted")
    c.setFillColor(CREAM)
    c.setFont(BOLD, 20)
    c.drawString(M, y, "Your knowledge. Your infrastructure.")
    y -= 26
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 20)
    c.drawString(M, y, "Your AI.")
    y -= 30

    y = para(
        c, M, y,
        "OPSQAI Self-Hosted is designed for organizations that want the platform to run inside "
        "their own environment.",
        W - 2 * M, size=10.2, leading=15,
    )
    y -= 10

    items = [
        ("Local deployment", "The application runs on the customer's own Windows machine or infrastructure."),
        ("Local AI", "The Self-Hosted environment uses a local AI engine."),
        ("Local data", "Operational knowledge and application data remain within the customer's environment."),
        ("Offline-capable", "The daily platform workflow can continue without a mandatory Cloud dependency."),
        ("Local knowledge search", "Knowledge retrieval and semantic search operate within the Self-Hosted environment."),
        ("Backup & Recovery", "Local backup and recovery functionality supports the Self-Hosted installation."),
        ("Offline licensing", "Licensing can be cryptographically verified locally."),
        ("Role-based access control", "Access to modules and content follows roles defined inside the installation."),
    ]
    col_w = (W - 2 * M) / 2
    row_h = 26 * mm
    for i, (title, body) in enumerate(items):
        col, row = i % 2, i // 2
        x = M + col * col_w
        top = y - row * row_h
        card(c, x + 2, top, col_w - 4, row_h - 4 * mm)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 9.2)
        c.drawString(x + 10, top - 13, title)
        para(c, x + 10, top - 26, body, col_w - 24, size=8.6, leading=11.6)

    footer(c, 7, TOTAL)


def page_closing(c) -> None:
    page_bg(c)
    mark(c, W / 2, H - 62 * mm, 18 * mm)

    c.setFillColor(CREAM)
    c.setFont(BOLD, 26)
    c.drawCentredString(W / 2, H - 92 * mm, "O P S Q A I")
    c.setFillColor(GOLD)
    c.setFont(BODY, 8.8)
    c.drawCentredString(W / 2, H - 100 * mm, " ".join("OPERATIONAL INTELLIGENCE PLATFORM"))

    c.setStrokeColor(GOLD_LINE)
    c.line(W / 2 - 40 * mm, H - 110 * mm, W / 2 + 40 * mm, H - 110 * mm)

    c.setFillColor(CREAM)
    c.setFont(BOLD, 17)
    c.drawCentredString(W / 2, H - 124 * mm, "See OPSQAI")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 17)
    c.drawCentredString(W / 2, H - 133 * mm, "in action.")

    y = H - 150 * mm
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9.4)
    for line in wrap(
        c,
        "Explore how OPSQAI can connect operational knowledge, AI, learning and management "
        "intelligence in one workspace.",
        BODY, 9.4, 125 * mm,
    ):
        c.drawCentredString(W / 2, y, line)
        y -= 14

    y -= 8 * mm
    box_w = 150 * mm
    card(c, W / 2 - box_w / 2, y, box_w, 30 * mm)
    c.setFillColor(GOLD)
    c.setFont(BOLD, 8.6)
    c.drawCentredString(W / 2, y - 12, "REQUEST A DEMO")
    c.setFillColor(CREAM)
    c.setFont(BODY, 10)
    c.drawCentredString(W / 2, y - 27, "opsqai.de/contact")
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9)
    c.drawCentredString(W / 2, y - 41, "Product overview: opsqai.de/product-overview")

    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 7.4)
    c.drawCentredString(W / 2, 26 * mm, "OPSQAI · Operational Intelligence Platform · opsqai.de")


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = pdfcanvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("OPSQAI — Product Overview")
    c.setAuthor("OPSQAI")
    c.setSubject("Operational Intelligence Platform — Product Overview")

    for fn in (page_cover, page_challenge, page_what, page_capabilities,
               page_how, page_use_cases, page_self_hosted, page_closing):
        fn(c)
        c.showPage()
    c.save()
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

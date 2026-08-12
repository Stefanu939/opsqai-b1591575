#!/usr/bin/env python3
"""
Generates the OPSQAI LinkedIn carousel (English) as a square 1080x1080 PDF.
Output: /mnt/documents/OPSQAI-LinkedIn-Carousel.pdf
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

SHOTS = Path("/tmp/shots/opsqai foto")

# Crop boxes that trim the desktop/wallpaper bleed around each captured window.
CROPS = {
    "ew.png": (5, 0, 886, 612),
    "dsw3.png": (0, 0, 885, 618),
    "ffdsw.png": (5, 3, 887, 618),
    "sdasd.png": (0, 0, 883, 614),
    "sdfghh.png": (2, 0, 879, 612),
    "cchgfds.png": (0, 0, 1258, 810),
    "slkjvccxn.png": (0, 0, 1258, 810),
    "dsggcbd.png": (0, 0, 1260, 810),
    "nvcbvc.png": (0, 0, 1258, 1027),
    "poiuztr.png": (0, 0, 1258, 1027),
    "nvcchggfh.png": (18, 0, 1265, 1028),
    "dvbrer.png": (0, 0, 1258, 818),
}


def load_shot(name: str) -> "Image.Image":
    img = Image.open(SHOTS / name).convert("RGB")
    box = CROPS.get(name)
    return img.crop(box) if box else img
OUT = Path("/mnt/documents/OPSQAI-LinkedIn-Carousel.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

W = H = 1080.0
M = 76.0


def fc(name: str) -> str | None:
    try:
        return subprocess.check_output(["fc-match", "-f", "%{file}", name], text=True).strip()
    except Exception:
        return None


for alias, query in (
    ("Body", "DejaVu Sans"),
    ("Body-Bold", "DejaVu Sans:bold"),
    ("Body-Italic", "DejaVu Sans:italic"),
    ("Mono", "DejaVu Sans Mono"),
):
    path = fc(query)
    if path:
        pdfmetrics.registerFont(TTFont(alias, path))

NOIR = colors.HexColor("#04211A")
NOIR_DEEP = colors.HexColor("#021410")
PANEL = colors.HexColor("#0A3128")
LINE = colors.HexColor("#17513F")
GOLD = colors.HexColor("#C9A24C")
GOLD_SOFT = colors.HexColor("#E4CB8E")
EMERALD = colors.HexColor("#2FBF87")
BONE = colors.HexColor("#F3F1E7")
MUTED = colors.HexColor("#9FB4A9")

c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle("OPSQAI - Windows Self-Hosted is here")
c.setAuthor("OPSQAI")


# ---------- primitives ----------
def bg(dark=True):
    c.setFillColor(NOIR if dark else NOIR_DEEP)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    # subtle top band + gold hairline
    c.setFillColor(PANEL)
    c.rect(0, H - 150, W, 150, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(0, H - 150, W, H - 150)


def mark(x, y, r=20):
    """Octagonal sovereign mark with OQ."""
    import math

    pts = []
    for i in range(8):
        a = math.pi / 8 + i * math.pi / 4
        pts.append((x + r * math.cos(a), y + r * math.sin(a)))
    p = c.beginPath()
    p.moveTo(*pts[0])
    for pt in pts[1:]:
        p.lineTo(*pt)
    p.close()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.6)
    c.drawPath(p, stroke=1, fill=0)
    c.setFillColor(GOLD)
    c.setFont("Body-Bold", r * 0.72)
    c.drawCentredString(x, y - r * 0.26, "OQ")


def header(kicker: str, page: int, total: int):
    mark(M + 20, H - 75, 22)
    c.setFillColor(BONE)
    c.setFont("Body-Bold", 24)
    c.drawString(M + 54, H - 84, "OPSQAI")
    c.setFillColor(GOLD)
    c.setFont("Body-Bold", 12)
    c.drawString(M + 54, H - 104, kicker.upper())
    label = f"{page:02d} / {total:02d}"
    c.setFillColor(MUTED)
    c.setFont("Mono", 14)
    c.drawRightString(W - M, H - 88, label)


def footer(cta: str = "opsqai.de"):
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(M, 92, W - M, 92)
    c.setFillColor(MUTED)
    c.setFont("Body", 14)
    c.drawString(M, 66, cta)
    c.setFillColor(GOLD)
    c.setFont("Body-Bold", 14)
    c.drawRightString(W - M, 66, "Swipe →")


def wrap(text: str, font: str, size: float, max_w: float) -> list[str]:
    out, line = [], ""
    for word in text.split():
        cand = f"{line} {word}".strip()
        if pdfmetrics.stringWidth(cand, font, size) <= max_w:
            line = cand
        else:
            if line:
                out.append(line)
            line = word
    if line:
        out.append(line)
    return out


def title(text: str, y: float, size=54, color=BONE, font="Body-Bold", max_w=None) -> float:
    max_w = max_w or (W - 2 * M)
    for ln in wrap(text, font, size, max_w):
        c.setFillColor(color)
        c.setFont(font, size)
        c.drawString(M, y, ln)
        y -= size * 1.15
    return y


def body(text: str, y: float, size=21, color=MUTED, max_w=None, leading=1.5) -> float:
    max_w = max_w or (W - 2 * M)
    for ln in wrap(text, "Body", size, max_w):
        c.setFillColor(color)
        c.setFont("Body", size)
        c.drawString(M, y, ln)
        y -= size * leading
    return y


def rule(y: float, w=90.0):
    c.setStrokeColor(GOLD)
    c.setLineWidth(4)
    c.line(M, y, M + w, y)


def bullet_list(items, y: float, size=20, gap=16, max_w=None):
    max_w = (max_w or (W - 2 * M)) - 34
    for it in items:
        c.setFillColor(GOLD)
        c.circle(M + 8, y + size * 0.32, 4.5, stroke=0, fill=1)
        lines = wrap(it, "Body", size, max_w)
        for i, ln in enumerate(lines):
            c.setFillColor(BONE if i == 0 else MUTED)
            c.setFont("Body", size)
            c.drawString(M + 34, y, ln)
            y -= size * 1.4
        y -= gap
    return y


def shot(name: str, x: float, y: float, w: float, crop_top: float = 0.0, label: str | None = None):
    """Draw a screenshot scaled to width w, top-aligned at y (top edge)."""
    img = load_shot(name)
    if crop_top:
        img = img.crop((0, int(img.height * crop_top), img.width, img.height))
    ratio = img.height / img.width
    h = w * ratio
    c.setFillColor(PANEL)
    c.roundRect(x - 8, y - h - 8, w + 16, h + 16, 12, stroke=0, fill=1)
    c.drawImage(ImageReader(img), x, y - h, width=w, height=h, mask=None)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(x - 8, y - h - 8, w + 16, h + 16, 12, stroke=1, fill=0)
    if label:
        c.setFillColor(MUTED)
        c.setFont("Body", 14)
        c.drawString(x, y - h - 30, label)
    return y - h - 16


def shot_fit(name: str, x: float, y_top: float, box_w: float, box_h: float, label=None):
    """Fit a screenshot inside a box (contain), centered."""
    img = load_shot(name)
    ratio = img.height / img.width
    w = box_w
    h = w * ratio
    if h > box_h:
        h = box_h
        w = h / ratio
    cx = x + (box_w - w) / 2
    c.setFillColor(PANEL)
    c.roundRect(cx - 8, y_top - h - 8, w + 16, h + 16, 12, stroke=0, fill=1)
    c.drawImage(ImageReader(img), cx, y_top - h, width=w, height=h, mask=None)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(cx - 8, y_top - h - 8, w + 16, h + 16, 12, stroke=1, fill=0)
    if label:
        c.setFillColor(MUTED)
        c.setFont("Body", 14)
        c.drawCentredString(x + box_w / 2, y_top - h - 32, label)
    return y_top - h - 20


def stat_row(items, y_top: float, h=118.0):
    n = len(items)
    gap = 18
    bw = (W - 2 * M - gap * (n - 1)) / n
    for i, (value, label) in enumerate(items):
        x = M + i * (bw + gap)
        c.setFillColor(PANEL)
        c.roundRect(x, y_top - h, bw, h, 10, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.roundRect(x, y_top - h, bw, h, 10, stroke=1, fill=0)
        c.setFillColor(GOLD)
        c.setFont("Body-Bold", 34)
        c.drawString(x + 18, y_top - 54, value)
        c.setFillColor(MUTED)
        c.setFont("Body", 14)
        for j, ln in enumerate(wrap(label, "Body", 14, bw - 36)[:2]):
            c.drawString(x + 18, y_top - 78 - j * 19, ln)
    return y_top - h - 24


TOTAL = 11
PAGE = 0


def page_start(kicker: str, dark=True):
    global PAGE
    PAGE += 1
    bg(dark)
    header(kicker, PAGE, TOTAL)


# ================= SLIDE 1 — COVER =================
PAGE += 1
c.setFillColor(NOIR_DEEP)
c.rect(0, 0, W, H, stroke=0, fill=1)
mark(M + 26, H - 120, 30)
c.setFillColor(BONE)
c.setFont("Body-Bold", 30)
c.drawString(M + 72, H - 132, "OPSQAI")
c.setFillColor(GOLD)
c.setFont("Body-Bold", 14)
c.drawString(M + 72, H - 156, "PRODUCT UPDATE  ·  2026")

y = 800
c.setFillColor(GOLD)
c.setFont("Body-Bold", 20)
c.drawString(M, y, "WINDOWS SELF-HOSTED")
rule(y - 22, 120)
y = title("OPSQAI now runs entirely inside your own building.", y - 90, size=62)
y = body(
    "A native Windows installer. A local AI engine. Zero data leaving your network. "
    "Here is what changed — and how well it actually works.",
    y - 20,
    size=23,
    color=GOLD_SOFT,
    max_w=W - 2 * M - 40,
)
shot_fit("sdfghh.png", M, 470, W - 2 * M, 340)
c.setFillColor(MUTED)
c.setFont("Body", 15)
c.drawString(M, 66, "opsqai.de  ·  AI knowledge & operations platform")
c.setFillColor(GOLD)
c.setFont("Body-Bold", 15)
c.drawRightString(W - M, 66, "Swipe →")
c.showPage()

# ================= SLIDE 2 — WHAT CHANGED =================
page_start("What changed")
y = title("From cloud-only to fully sovereign.", H - 220, size=46)
rule(y + 4, 100)
y = body(
    "OPSQAI used to be a cloud platform. It still is — but there is now a second, "
    "equal product: a self-hosted edition that installs on a Windows machine or server "
    "and runs completely on its own.",
    y - 44,
    size=22,
)
y = bullet_list(
    [
        "Native Windows installer — no Docker, no Linux VM, no cloud account.",
        "Bundled PostgreSQL 16 with pgvector for local semantic search.",
        "Local AI engine (Ollama) — models run on the customer's hardware.",
        "Signed licences (JWT / EdDSA) validated offline.",
    ],
    y - 30,
)
footer("The same product language. Two very different deployments.")
c.showPage()

# ================= SLIDE 3 — INSTALLER =================
page_start("Install experience")
y = title("A 9-step setup wizard that feels like enterprise software.", H - 210, size=42)
y = body(
    "Welcome, licence, system check, options, database, administrator, review, install, finish. "
    "Nothing is written to the machine until every precondition passes.",
    y - 34,
    size=21,
)
shot_fit("ew.png", M, y - 20, (W - 2 * M - 24) / 2, 330, "Step 1 — Welcome")
shot_fit("sdasd.png", M + (W - 2 * M - 24) / 2 + 24, y - 20, (W - 2 * M - 24) / 2, 330, "Step 2 — Licence activation")
footer("Roughly five minutes from download to a running platform.")
c.showPage()

# ================= SLIDE 4 — SYSTEM CHECK =================
page_start("Pre-flight checks")
y = title("Every requirement verified before a single file is written.", H - 205, size=42)
y = body(
    "Windows build, CPU architecture, memory, free disk, bundled PostgreSQL, "
    "port availability and elevation — all validated, all re-runnable.",
    y - 30,
    size=21,
)
shot_fit("dsw3.png", M, y - 24, W - 2 * M, 430, "System check — all checks passed")
footer("Failed installs are the most expensive support tickets. So we removed them.")
c.showPage()

# ================= SLIDE 5 — INSTALL PROGRESS =================
page_start("Deterministic install")
y = title("Seven stages. Visible progress. A real log.", H - 205, size=44)
y = body(
    "PostgreSQL, Windows services, migrations, AI engine warm-up, vector storage and "
    "finalisation — each stage reports its own state and can be inspected live.",
    y - 34,
    size=21,
)
shot_fit("ffdsw.png", M, y - 24, W - 2 * M, 420, "Install — stage-by-stage with detailed log")
footer("Snapshots are taken before migrations, so every step is reversible.")
c.showPage()

# ================= SLIDE 6 — READY =================
page_start("First run")
y = title("Licence activated. AI online. Knowledge base ready.", H - 205, size=44)
y = body(
    "The finish screen is a contract: if it is green, the platform is genuinely healthy — "
    "services installed, database created, administrator seeded, AI engine responding.",
    y - 34,
    size=21,
)
shot_fit("sdfghh.png", M, y - 24, W - 2 * M, 400, "Finish — verified health, not optimism")
footer("A desktop shell then launches the app, health-gated on startup.")
c.showPage()

# ================= SLIDE 7 — WORKSPACE =================
page_start("The workspace")
y = title("One workspace. Light or dark. Both fully self-hosted.", H - 205, size=42)
y = body(
    "Dashboard, AI Chat, Knowledge, FAQ, Academy, AI Audit, Users, Organisation, "
    "Updates and Modules — the complete module set, running locally.",
    y - 30,
    size=21,
)
half = (W - 2 * M - 24) / 2
shot_fit("cchgfds.png", M, y - 24, half, 400, "Light theme")
shot_fit("slkjvccxn.png", M + half + 24, y - 24, half, 400, "Dark theme (Noir & Gold)")
footer("Deployment mode and build hash are always visible in the sidebar.")
c.showPage()

# ================= SLIDE 8 — AI CHAT =================
page_start("Grounded AI, locally")
y = title("Answers with sources, confidence — and no outbound calls.", H - 205, size=40)
y = body(
    "The assistant retrieves from the customer's own SOPs and documents, cites the source, "
    "and reports a confidence level. It answers in the language you ask in.",
    y - 30,
    size=21,
)
shot_fit("dsggcbd.png", M, y - 24, W - 2 * M, 400, "AI Chat — cited source, confidence badge, multilingual")
footer("English in, German out — the same grounded document behind both.")
c.showPage()

# ================= SLIDE 9 — AI AUDIT =================
page_start("AI Audit & recommendations")
y = title("It does not just score you. It tells you what to build next.", H - 205, size=40)
y = body(
    "Every audit run is signed and stored. Alongside the maturity score, the engine derives "
    "recommended actions from unanswered questions, learning friction and knowledge coverage: "
    "a missing SOP, a missing FAQ, a course to assign, a quiz to add.",
    y - 30,
    size=20,
)
shot_fit("nvcbvc.png", M, y - 20, W - 2 * M, 400, "AI Audit — score, friction index, recommended actions")
footer("Compliance evidence and a roadmap, from the same run.")
c.showPage()

# ================= SLIDE 10 — OPERATIONS =================
page_start("Day-to-day operations")
y = title("Knowledge in, people managed, everything auditable.", H - 205, size=42)
y = body(
    "Bulk import and export for FAQ and knowledge (CSV, XLSX, PDF, DOCX — with AI-proposed "
    "Q&A pairs), local user management with role-based access and temporary passwords.",
    y - 30,
    size=21,
)
half = (W - 2 * M - 24) / 2
shot_fit("nvcchggfh.png", M, y - 24, half, 340, "FAQ import — files parsed and reviewed")
shot_fit("dvbrer.png", M + half + 24, y - 24, half, 340, "Users — roles, editing, deactivation")
footer("No cloud round-trip for any of it.")
c.showPage()

# ================= SLIDE 11 — CLOSING =================
PAGE += 1
c.setFillColor(NOIR_DEEP)
c.rect(0, 0, W, H, stroke=0, fill=1)
c.setFillColor(NOIR)
c.rect(0, H - 470, W, 470, stroke=0, fill=1)
c.setStrokeColor(GOLD)
c.setLineWidth(3)
c.line(0, H - 470, W, H - 470)
header("Where it stands", PAGE, TOTAL)
y = title("Installed, activated, running — on the customer's own machine.", H - 230, size=44)
rule(y + 6, 110)
y = stat_row(
    [
        ("100%", "local execution — AI, data, search"),
        ("9", "guided setup steps"),
        ("~5 min", "download to running platform"),
    ],
    y - 40,
)
y = body(
    "OPSQAI Self-Hosted is the same platform our cloud customers use, packaged so that "
    "regulated and data-sensitive organisations never have to send an operational document "
    "outside their own network.",
    y - 20,
    size=22,
    color=GOLD_SOFT,
)
y = bullet_list(
    [
        "Sovereign by default — nothing leaves the building.",
        "Offline licensing with signed, verifiable tokens.",
        "Updates, snapshots and restore built into the product.",
    ],
    y - 30,
    size=20,
)
mark(M + 22, 210, 24)
c.setFillColor(BONE)
c.setFont("Body-Bold", 26)
c.drawString(M + 62, 200, "OPSQAI")
c.setFillColor(GOLD)
c.setFont("Body", 18)
c.drawString(M + 62, 174, "opsqai.de")
c.setStrokeColor(LINE)
c.setLineWidth(1)
c.line(M, 130, W - M, 130)
c.setFillColor(MUTED)
c.setFont("Body", 17)
c.drawString(M, 98, "Curious how this would look inside your operation? Let's talk.")
c.showPage()

c.save()
print(f"written: {OUT}")

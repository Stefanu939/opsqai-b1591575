"""OPSQAI Investor Deck v2 — Enterprise Operational AI Platform. 1920x1080."""
import subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def _register(name, spec):
    path = subprocess.check_output(["fc-match", "-f", "%{file}", spec], text=True).strip()
    pdfmetrics.registerFont(TTFont(name, path))


_register("Body", "DejaVu Sans")
_register("BodyBold", "DejaVu Sans:bold")
_register("BodyItalic", "DejaVu Sans:italic")
_register("Serif", "DejaVu Serif")
_register("SerifBold", "DejaVu Serif:bold")
_register("Mono", "DejaVu Sans Mono")

W, H = 1920, 1080

# Palette — Noir & Gold, enterprise
NAVY = (0.043, 0.071, 0.125)      # #0B1220
NAVY_2 = (0.078, 0.106, 0.169)    # slightly lifted
IVORY = (0.961, 0.945, 0.910)     # #F5F1E8
GOLD = (0.784, 0.635, 0.294)      # #C8A24B
GOLD_SOFT = (0.882, 0.792, 0.541)
SLATE = (0.357, 0.392, 0.447)
INK = (0.078, 0.106, 0.153)
LINE = (0.85, 0.83, 0.78)

OUT = "/mnt/documents/OPSQAI-Investor-Deck-v2.pdf"

c = canvas.Canvas(OUT, pagesize=(W, H))


def bg(dark=True):
    c.setFillColorRGB(*(NAVY if dark else IVORY))
    c.rect(0, 0, W, H, fill=1, stroke=0)


def chrome(idx, total, dark, section):
    c.setFont("SerifBold", 20)
    c.setFillColorRGB(*(GOLD if dark else INK))
    c.drawString(80, H - 60, "OPSQAI")
    wm = pdfmetrics.stringWidth("OPSQAI", "SerifBold", 20)
    c.setFont("Body", 13)
    c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
    c.drawString(80 + wm + 14, H - 60, "· Enterprise Operational AI Platform")
    if section:
        c.setFont("Body", 12)
        c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
        c.drawRightString(W - 80, H - 60, section.upper())
    c.setStrokeColorRGB(*GOLD)
    c.setLineWidth(1)
    c.line(80, H - 80, W - 80, H - 80)
    c.line(80, 70, W - 80, 70)
    c.setFont("Body", 12)
    c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
    c.drawString(80, 45, "OPSQAI · Investor Brief v2 · Confidential")
    c.drawRightString(W - 80, 45, f"{idx:02d} / {total:02d}")


def wrap(text, font, size, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_para(text, x, y, font, size, max_w, leading, color):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    for line in wrap(text, font, size, max_w):
        c.drawString(x, y, line)
        y -= leading
    return y


def title_block(title, kicker, color, max_w=1500):
    c.setFont("Body", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 150, kicker.upper())
    size = 58
    while size > 32:
        lines = wrap(title, "SerifBold", size, max_w)
        if len(lines) <= 2:
            break
        size -= 4
    c.setFont("SerifBold", size)
    c.setFillColorRGB(*color)
    y = H - 210
    for line in lines:
        c.drawString(80, y, line)
        y -= int(size * 1.05)
    c.setFillColorRGB(*GOLD)
    c.rect(80, y + int(size * 0.6), 80, 3, fill=1, stroke=0)
    return y


TOTAL = 17


# ==================================================================
# 1. Cover
# ==================================================================
def s_cover(i):
    bg(True)
    c.setStrokeColorRGB(*GOLD)
    c.setLineWidth(1)
    c.rect(60, 60, W - 120, H - 120, stroke=1, fill=0)

    c.setFont("Body", 16)
    c.setFillColorRGB(*GOLD)
    c.drawString(140, H - 180, "INVESTOR BRIEF · SEED ROUND · 2026")

    c.setFont("SerifBold", 160)
    c.setFillColorRGB(*IVORY)
    c.drawString(140, H / 2 + 60, "OPSQAI")

    c.setFillColorRGB(*GOLD)
    c.rect(150, H / 2 + 30, 380, 4, fill=1, stroke=0)

    c.setFont("Serif", 40)
    c.setFillColorRGB(*IVORY)
    c.drawString(150, H / 2 - 50, "The operating system for")
    c.drawString(150, H / 2 - 100, "operational knowledge.")

    c.setFont("Body", 20)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(150, H / 2 - 160, "Enterprise Operational AI Platform · Windows Self-Hosted · Sovereign by design.")

    # Right meta rail
    c.setFont("BodyBold", 13)
    c.setFillColorRGB(*GOLD)
    c.drawString(1350, 260, "SEGMENT")
    c.setFont("Serif", 22)
    c.setFillColorRGB(*IVORY)
    c.drawString(1350, 230, "Industrial · Logistics · Manufacturing")

    c.setFont("BodyBold", 13)
    c.setFillColorRGB(*GOLD)
    c.drawString(1350, 190, "DELIVERY")
    c.setFont("Serif", 22)
    c.setFillColorRGB(*IVORY)
    c.drawString(1350, 160, "Self-Hosted · Windows · Offline capable")

    c.setFont("BodyBold", 13)
    c.setFillColorRGB(*GOLD)
    c.drawString(1350, 120, "CONTACT")
    c.setFont("Serif", 22)
    c.setFillColorRGB(*IVORY)
    c.drawString(1350, 90, "stefan@opsqai.de · opsqai.de")
    c.showPage()


# ==================================================================
# 2. Thesis
# ==================================================================
def s_thesis(i):
    bg(True)
    chrome(i, TOTAL, True, "01 · Thesis")
    c.setFont("Body", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 150, "THESIS")

    c.setFont("Serif", 54)
    c.setFillColorRGB(*IVORY)
    lines = [
        "Industrial companies will not put their operational",
        "knowledge into a public AI cloud.",
        "They need an enterprise AI platform they own,",
        "installed inside their own infrastructure.",
    ]
    y = H - 320
    for l in lines:
        c.drawString(80, y, l)
        y -= 72

    c.setStrokeColorRGB(*GOLD)
    c.line(80, 260, 300, 260)
    c.setFont("BodyItalic", 22)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(80, 220, "OPSQAI is not another chatbot.")
    c.drawString(80, 185, "It is the operating system for operational knowledge —")
    c.drawString(80, 150, "delivered as a Windows Self-Hosted enterprise platform.")
    c.showPage()


# ==================================================================
# 3. Product Architecture (the three-legged diagram)
# ==================================================================
def s_architecture(i):
    bg(False)
    chrome(i, TOTAL, False, "02 · Product architecture")
    title_block("Three surfaces. One clear line between vendor and customer.",
                "Product architecture", INK, max_w=1500)

    # Top box: OPSQAI
    top_x, top_y, top_w, top_h = W/2 - 180, H - 460, 360, 90
    c.setFillColorRGB(*NAVY)
    c.rect(top_x, top_y, top_w, top_h, fill=1, stroke=0)
    c.setStrokeColorRGB(*GOLD); c.setLineWidth(1)
    c.rect(top_x, top_y, top_w, top_h, fill=0, stroke=1)
    c.setFont("SerifBold", 34); c.setFillColorRGB(*IVORY)
    c.drawCentredString(W/2, top_y + 50, "OPSQAI")
    c.setFont("Body", 15); c.setFillColorRGB(*GOLD_SOFT)
    c.drawCentredString(W/2, top_y + 22, "Enterprise Operational AI Platform")

    # Three child boxes
    child_y = H - 780
    child_h = 260
    child_w = 460
    gap = (W - 160 - 3 * child_w) / 2
    positions = []
    for j in range(3):
        cx = 80 + j * (child_w + gap)
        positions.append((cx, child_y))
    labels = [
        ("Management Center", "opsqai.de · Internal", "OPSQAI staff only.",
         ["Companies · Licenses", "Installations · Contracts",
          "Releases · Signing Keys", "Activation Bundles",
          "Support · Audit"], NAVY_2),
        ("Customer Portal", "opsqai.de · Customer", "Designated customer contacts.",
         ["Installer downloads", "Update packages",
          "Documentation · Release notes",
          "Subscription & maintenance",
          "Support tickets"], NAVY_2),
        ("Self-Hosted Product", "Windows · Customer network", "The actual product.",
         ["AI Chat · Knowledge Base",
          "FAQ · Academy · AI Audit",
          "Users · Organization",
          "Subscription · Updates · Modules",
          "Runs locally · no SaaS"], (0.15, 0.12, 0.08)),
    ]
    # Connector lines
    c.setStrokeColorRGB(*GOLD); c.setLineWidth(1)
    trunk_y = top_y
    for (cx, cy), _ in zip(positions, labels):
        cxm = cx + child_w / 2
        c.line(cxm, cy + child_h, cxm, trunk_y - 30)
    c.line(positions[0][0] + child_w/2, trunk_y - 30,
           positions[2][0] + child_w/2, trunk_y - 30)
    c.line(W/2, trunk_y - 30, W/2, trunk_y)

    for (cx, cy), (h, sub, tag, bullets, fill) in zip(positions, labels):
        c.setFillColorRGB(*fill)
        c.rect(cx, cy, child_w, child_h, fill=1, stroke=0)
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.75)
        c.rect(cx, cy, child_w, child_h, fill=0, stroke=1)
        c.setFillColorRGB(*GOLD); c.rect(cx, cy + child_h - 4, child_w, 4, fill=1, stroke=0)
        c.setFont("SerifBold", 26); c.setFillColorRGB(*IVORY)
        c.drawString(cx + 24, cy + child_h - 44, h)
        c.setFont("Body", 13); c.setFillColorRGB(*GOLD)
        c.drawString(cx + 24, cy + child_h - 66, sub.upper())
        c.setFont("BodyItalic", 14); c.setFillColorRGB(*GOLD_SOFT)
        c.drawString(cx + 24, cy + child_h - 88, tag)
        c.setFont("Body", 15); c.setFillColorRGB(*IVORY)
        yy = cy + child_h - 118
        for b in bullets:
            c.drawString(cx + 24, yy, "· " + b)
            yy -= 22

    # Boundary caption
    c.setFont("BodyItalic", 16); c.setFillColorRGB(*SLATE)
    c.drawCentredString(W/2, 110, "OPSQAI Cloud is not the product. The product runs inside the customer's own infrastructure.")
    c.showPage()


# ==================================================================
# 4. Management Center
# ==================================================================
def s_mc(i):
    bg(True)
    chrome(i, TOTAL, True, "03 · Management Center")
    title_block("Management Center — the internal control plane.", "Management Center", IVORY, max_w=1400)

    c.setFont("Body", 20); c.setFillColorRGB(*GOLD_SOFT)
    draw_para(
        "The Management Center is an internal OPSQAI platform. It is never sold and never accessible to customers. "
        "It is how our team operates the entire customer estate — from license issuance to release delivery.",
        80, H - 340, "Body", 20, 1000, 30, GOLD_SOFT,
    )

    groups = [
        ("Customers & Contracts", ["Companies", "Installations", "Contracts", "Ownership"]),
        ("Licensing", ["Signing keys", "License issuance", "Activation bundles", "Revocation & CRL"]),
        ("Releases", ["Release pipeline", "Update channels", "Installer distribution"]),
        ("Operations", ["Customer support", "Portal administration", "Audit trail"]),
    ]
    col_w = (W - 160 - 60) / 2
    for j, (h, items) in enumerate(groups):
        cx = 80 + (j % 2) * (col_w + 60)
        cy = H - 550 - (j // 2) * 220
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.6)
        c.line(cx, cy + 40, cx + 200, cy + 40)
        c.setFont("SerifBold", 26); c.setFillColorRGB(*IVORY)
        c.drawString(cx, cy, h)
        c.setFont("Body", 17); c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 40
        for it in items:
            c.drawString(cx, yy, "· " + it)
            yy -= 26

    c.showPage()


# ==================================================================
# 5. Customer Portal
# ==================================================================
def s_portal(i):
    bg(False)
    chrome(i, TOTAL, False, "04 · Customer Portal")
    title_block("Customer Portal — the service layer, never the product.", "Customer Portal", INK, max_w=1400)

    c.setFont("Body", 20); c.setFillColorRGB(*SLATE)
    draw_para(
        "The Customer Portal is a lightweight service surface at opsqai.de. Designated customer contacts use it to download the installer, "
        "collect activation bundles and updates, read documentation, and open support tickets. It never contains the customer's operational data.",
        80, H - 340, "Body", 20, 1400, 30, SLATE,
    )

    services = [
        ("Installer", "Download signed Windows installer packages."),
        ("Updates", "Download signed update bundles per release channel."),
        ("Documentation", "Administrator, security and technical guides."),
        ("Release Notes", "Per-version changelog and upgrade notes."),
        ("Activation Bundle", "Offline-capable, Ed25519-signed license bundle."),
        ("Subscription", "Modules, maintenance windows, renewal status."),
        ("Support", "Ticketing, SLA, escalation."),
        ("Maintenance", "Contract state, renewals, invoices."),
    ]
    col_w = (W - 160 - 90) / 4
    row_h = 130
    for j, (h, d) in enumerate(services):
        cx = 80 + (j % 4) * (col_w + 30)
        cy = H - 620 - (j // 4) * (row_h + 30)
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.6)
        c.rect(cx, cy - 60, col_w, row_h, fill=0, stroke=1)
        c.setFillColorRGB(*GOLD)
        c.rect(cx, cy + 68, 24, 2, fill=1, stroke=0)
        c.setFont("SerifBold", 20); c.setFillColorRGB(*INK)
        c.drawString(cx + 16, cy + 38, h)
        c.setFont("Body", 14); c.setFillColorRGB(*SLATE)
        yy = cy + 12
        for line in wrap(d, "Body", 14, col_w - 32):
            c.drawString(cx + 16, yy, line); yy -= 20

    c.showPage()


# ==================================================================
# 6. Self-Hosted Product
# ==================================================================
def s_selfhosted(i):
    bg(True)
    chrome(i, TOTAL, True, "05 · Self-Hosted")
    title_block("The product runs inside the customer's Windows environment.", "Self-Hosted", IVORY, max_w=1500)

    c.setFont("Body", 20); c.setFillColorRGB(*GOLD_SOFT)
    y = draw_para(
        "OPSQAI is delivered as a native Windows installer. It runs as a set of Windows Services on the customer's own server. "
        "No Docker. No Kubernetes. No Linux. No SaaS dependency. Customer data, embeddings and AI calls stay inside the customer's boundary.",
        80, H - 340, "Body", 20, 1500, 30, GOLD_SOFT,
    )

    # Not this / this columns
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 500, "NOT THIS")
    c.drawString(W/2 + 40, H - 500, "THIS")

    not_this = ["Docker", "Linux", "Kubernetes", "SaaS", "Cloud-hosted app", "Shared tenancy"]
    this = ["Windows Installer", "Native Windows Services", "Local PostgreSQL + pgvector",
            "Local embeddings & storage", "Customer-owned AI keys", "Single tenant, one install"]

    c.setFont("Serif", 22); c.setFillColorRGB(*SLATE)
    yy = H - 540
    for l in not_this:
        c.drawString(80, yy, "—  " + l); yy -= 34

    c.setFont("Serif", 22); c.setFillColorRGB(*IVORY)
    yy = H - 540
    for l in this:
        c.drawString(W/2 + 40, yy, "· " + l); yy -= 34

    c.showPage()


# ==================================================================
# 7. Modules
# ==================================================================
def s_modules(i):
    bg(False)
    chrome(i, TOTAL, False, "06 · Modules")
    title_block("One platform. Modular by license.", "Modules", INK, max_w=1400)

    basic = [
        ("AI Chat", "Grounded, cited answers across the customer corpus."),
        ("Knowledge Base", "SOPs, manuals and technical docs — retrieval backbone."),
        ("FAQ", "Curated Q&A with owners and review cadence."),
        ("Academy", "Lessons, quizzes and certificates for onboarding."),
        ("AI Audit", "Every completion logged with model, sources and hashes."),
        ("Users", "Accounts, roles and permissions."),
        ("Organization", "Departments, sites, ACLs."),
        ("Subscription", "Local view of licensed modules and maintenance."),
    ]
    # Section headers
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 330, "BASIC PLATFORM · INCLUDED")
    c.setStrokeColorRGB(*GOLD); c.line(80, H - 345, 500, H - 345)

    col_w = (W - 160 - 90) / 4
    row_h = 120
    for j, (h, d) in enumerate(basic):
        cx = 80 + (j % 4) * (col_w + 30)
        cy = H - 400 - (j // 4) * (row_h + 25)
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.6)
        c.rect(cx, cy - 55, col_w, row_h, fill=0, stroke=1)
        c.setFont("SerifBold", 20); c.setFillColorRGB(*INK)
        c.drawString(cx + 16, cy + 38, h)
        c.setFont("Body", 14); c.setFillColorRGB(*SLATE)
        yy = cy + 12
        for line in wrap(d, "Body", 14, col_w - 32):
            c.drawString(cx + 16, yy, line); yy -= 20

    # Premium modules
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(80, 235, "PREMIUM MODULES · LICENSED SEPARATELY")
    c.setStrokeColorRGB(*GOLD); c.line(80, 220, 620, 220)
    c.setFont("Body", 18); c.setFillColorRGB(*SLATE)
    c.drawString(80, 180,
        "Additional modules are activated à la carte via signed license upgrades — no reinstall required.")
    c.drawString(80, 150,
        "The module architecture is designed for expansion: new capabilities ship as licensed modules, not forks.")
    c.showPage()


# ==================================================================
# 8. Why Self-Hosted / Delivery model comparison
# ==================================================================
def s_delivery(i):
    bg(False)
    chrome(i, TOTAL, False, "07 · Delivery model")
    title_block("Compare the delivery model — not just the AI.", "Delivery model", INK, max_w=1400)

    headers = ["", "OPSQAI", "Cloud SaaS AI", "DIY RAG", "Enterprise Search"]
    rows = [
        ("Where it runs", "Customer Windows server", "Vendor cloud", "Customer or cloud", "Vendor cloud"),
        ("Data residency", "Customer boundary", "Vendor region", "Depends", "Vendor region"),
        ("Offline capable", "Yes", "No", "Rarely", "No"),
        ("Governance", "Roles + chunk-level ACL", "Workspace", "DIY", "Workspace"),
        ("Audit trail", "Built-in, signed", "Limited", "DIY", "Limited"),
        ("Model choice", "Customer decides", "Vendor decides", "Customer decides", "Vendor decides"),
        ("Licensing", "Per-install + per-module", "Per-seat SaaS", "n/a", "Per-seat SaaS"),
        ("Lock-in", "Low — customer owns data", "High", "Low", "High"),
    ]
    x0, y0 = 80, H - 340
    col_w = (W - 160) / 5
    row_h = 56

    c.setFillColorRGB(*NAVY)
    c.rect(x0, y0 - row_h + 18, W - 160, row_h, fill=1, stroke=0)
    c.setFont("BodyBold", 16); c.setFillColorRGB(*IVORY)
    for j, h in enumerate(headers):
        c.drawString(x0 + j * col_w + 18, y0 - 20, h)

    for r, row in enumerate(rows):
        yy = y0 - row_h - r * row_h
        if r % 2 == 0:
            c.setFillColorRGB(0.94, 0.92, 0.87)
            c.rect(x0, yy - row_h + 18, W - 160, row_h, fill=1, stroke=0)
        for j, cell in enumerate(row):
            if j == 0:
                c.setFont("BodyBold", 14); c.setFillColorRGB(*INK)
            elif j == 1:
                c.setFont("BodyBold", 14); c.setFillColorRGB(0.55, 0.42, 0.13)
            else:
                c.setFont("Body", 14); c.setFillColorRGB(*SLATE)
            c.drawString(x0 + j * col_w + 18, yy - 20, cell)
    c.showPage()


# ==================================================================
# 9. Differentiation
# ==================================================================
def s_diff(i):
    bg(True)
    chrome(i, TOTAL, True, "08 · Differentiation")
    title_block("Where OPSQAI is different — on purpose.", "Differentiation", IVORY, max_w=1400)

    diffs = [
        ("Self-Hosted", "Runs inside the customer's Windows infrastructure."),
        ("Windows Native", "Delivered as a Windows installer, not a Docker image."),
        ("Offline Capable", "Signed activation bundles work without cloud connectivity."),
        ("Governed AI", "Every completion is bounded by role, department and ACL."),
        ("Audit Trail", "Signed, hash-chained logs of every AI interaction."),
        ("Module Licensing", "Capabilities activated per module, not per seat."),
        ("Source Citations", "Every answer carries its retrieved sources."),
        ("Role-based Access", "Permissions applied at chunk level."),
        ("Local Embeddings", "Vectors stored in the customer's own PostgreSQL."),
        ("Customer Owns Data", "OPSQAI never sees operational content."),
        ("Choice of AI Model", "Customer selects Azure, OpenAI, or self-hosted."),
        ("No Lock-in", "Data, models and infrastructure remain portable."),
    ]
    col_w = (W - 160 - 60) / 3
    row_h = 130
    for j, (h, d) in enumerate(diffs):
        cx = 80 + (j % 3) * (col_w + 30)
        cy = H - 380 - (j // 3) * (row_h + 20)
        c.setFillColorRGB(*GOLD); c.rect(cx, cy + 70, 24, 2, fill=1, stroke=0)
        c.setFont("SerifBold", 22); c.setFillColorRGB(*IVORY)
        c.drawString(cx, cy + 40, h)
        c.setFont("Body", 15); c.setFillColorRGB(*GOLD_SOFT)
        yy = cy + 10
        for line in wrap(d, "Body", 15, col_w - 10):
            c.drawString(cx, yy, line); yy -= 22
    c.showPage()


# ==================================================================
# 10. Business Model
# ==================================================================
def s_biz(i):
    bg(True)
    chrome(i, TOTAL, True, "09 · Business model")
    title_block("Three revenue lines. Aligned with how enterprises buy.", "Business model", IVORY, max_w=1400)

    tiers = [
        ("Basic Platform", "One-time", "Includes AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription."),
        ("Premium Modules", "Per module", "Purchased individually. Activated via signed license upgrades. Portfolio expands over time."),
        ("Annual Maintenance", "Recurring", "Software updates, security patches, installer updates, compatibility, priority fixes, support."),
    ]
    col_w = (W - 160 - 60) / 3
    for j, (h, price, d) in enumerate(tiers):
        cx = 80 + j * (col_w + 30)
        cy = H - 400
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(1)
        c.rect(cx, cy - 260, col_w, 340, fill=0, stroke=1)
        c.setFillColorRGB(*GOLD); c.rect(cx, cy + 76, col_w, 4, fill=1, stroke=0)
        c.setFont("BodyBold", 13); c.setFillColorRGB(*GOLD)
        c.drawString(cx + 24, cy + 46, f"LINE 0{j+1}")
        c.setFont("SerifBold", 28); c.setFillColorRGB(*IVORY)
        c.drawString(cx + 24, cy + 6, h)
        c.setFont("SerifBold", 34); c.setFillColorRGB(*GOLD)
        c.drawString(cx + 24, cy - 60, price)
        c.setFont("Body", 16); c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 110
        for line in wrap(d, "Body", 16, col_w - 48):
            c.drawString(cx + 24, yy, line); yy -= 24

    c.setFont("BodyItalic", 18); c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(80, 160,
        "Every install is priced per customer environment. Renewals sit in Annual Maintenance. Growth sits in Premium Modules.")
    c.showPage()


# ==================================================================
# 11. Land & Expand
# ==================================================================
def s_expand(i):
    bg(False)
    chrome(i, TOTAL, False, "10 · Land & expand")
    title_block("Land with one installation. Expand across modules and sites.", "Land & expand", INK, max_w=1500)

    stages = [
        ("01", "Land", "One installation. Basic Platform. Single site."),
        ("02", "Expand modules", "Premium modules activated à la carte."),
        ("03", "Expand sites", "Additional installations at other locations."),
        ("04", "Recurring", "Annual maintenance contracts across every install."),
        ("05", "Services", "Professional services, enterprise support, custom integrations."),
    ]
    step_w = (W - 160) / 5
    y = H - 500
    for j, (n, t, d) in enumerate(stages):
        cx = 80 + j * step_w
        c.setFont("SerifBold", 72); c.setFillColorRGB(*GOLD)
        c.drawString(cx, y, n)
        c.setFont("SerifBold", 26); c.setFillColorRGB(*INK)
        c.drawString(cx, y - 55, t)
        c.setStrokeColorRGB(*GOLD); c.line(cx, y - 72, cx + 50, y - 72)
        c.setFont("Body", 15); c.setFillColorRGB(*SLATE)
        yy = y - 105
        for line in wrap(d, "Body", 15, step_w - 30):
            c.drawString(cx, yy, line); yy -= 22
        if j < len(stages) - 1:
            c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.5)
            c.line(cx + step_w - 40, y + 20, cx + step_w - 10, y + 20)

    c.setFont("BodyItalic", 18); c.setFillColorRGB(*SLATE)
    c.drawString(80, 200,
        "Industrial buyers rarely start big. They start with one plant, one team, one module — then replicate what worked.")
    c.showPage()


# ==================================================================
# 12. Product maturity
# ==================================================================
def s_maturity(i):
    bg(False)
    chrome(i, TOTAL, False, "11 · Maturity")
    title_block("Not a prototype. Production architecture, shipping.", "Maturity", INK, max_w=1500)

    items = [
        ("Windows Installer", "Signed, unattended-capable."),
        ("License System", "Ed25519-signed tokens, CRL, revocation."),
        ("Update Pipeline", "Signed manifests, staged rollouts."),
        ("Module Architecture", "License-gated modules, no reinstall."),
        ("Customer Portal", "Downloads, activation bundles, support."),
        ("Management Center", "Full internal control plane."),
        ("Installer Automation", "GitHub-driven release pipeline."),
        ("Offline Activation", "Signed bundles, 90-day validity."),
        ("Signed Licenses", "Per-install, per-module."),
        ("Audit Trail", "Hash-chained, tamper-evident."),
        ("Production Architecture", "Documented, testable, DR-ready."),
        ("Documentation", "Architecture, security, admin, technical."),
    ]
    col_w = (W - 160 - 60) / 3
    row_h = 100
    for j, (h, d) in enumerate(items):
        cx = 80 + (j % 3) * (col_w + 30)
        cy = H - 380 - (j // 3) * (row_h + 20)
        c.setFillColorRGB(*GOLD); c.rect(cx, cy + 46, 18, 2, fill=1, stroke=0)
        c.setFont("SerifBold", 20); c.setFillColorRGB(*INK)
        c.drawString(cx, cy + 20, h)
        c.setFont("Body", 15); c.setFillColorRGB(*SLATE)
        c.drawString(cx, cy - 6, d)
    c.showPage()


# ==================================================================
# 13. Go-to-market
# ==================================================================
def s_gtm(i):
    bg(True)
    chrome(i, TOTAL, True, "12 · Go-to-market")
    title_block("DACH first. Warehousing, logistics, industry.", "Go-to-market", IVORY, max_w=1400)

    phases = [
        ("Phase 1 · DACH beachhead",
         "Warehouse operators, logistics networks and mid-cap manufacturers in Germany, Austria, Switzerland. "
         "Compliance-driven buyers with existing SOP libraries and clear data-sovereignty requirements."),
        ("Phase 2 · Adjacent verticals",
         "Production, distribution, utilities. Same delivery model, same governance story, adjacent buyer profiles."),
        ("Phase 3 · Europe-wide",
         "Benelux, Nordics, then broader EU. Same installer, same portal, same maintenance rhythm."),
    ]
    y = H - 380
    for h, d in phases:
        c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
        c.drawString(80, y, h.upper())
        c.setStrokeColorRGB(*GOLD); c.line(80, y - 12, 140, y - 12)
        c.setFont("Body", 20); c.setFillColorRGB(*GOLD_SOFT)
        yy = y - 40
        for line in wrap(d, "Body", 20, 1500):
            c.drawString(80, yy, line); yy -= 30
        y = yy - 30

    c.showPage()


# ==================================================================
# 14. Market
# ==================================================================
def s_market(i):
    bg(False)
    chrome(i, TOTAL, False, "13 · Market")
    title_block("Mid-market industrial Europe — bottom-up.", "Market", INK, max_w=1400)

    circles = [
        ("TAM", "€4.8B", 340, 500, 220),
        ("SAM", "€1.1B", 900, 500, 170),
        ("SOM", "€90M", 1400, 500, 120),
    ]
    for label, val, cx, cy, r in circles:
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(1.2)
        c.circle(cx, cy, r, stroke=1, fill=0)
        c.setFont("BodyBold", 16); c.setFillColorRGB(*GOLD)
        c.drawCentredString(cx, cy + 20, label)
        c.setFont("SerifBold", 44); c.setFillColorRGB(*INK)
        c.drawCentredString(cx, cy - 30, val)

    notes = [
        ("TAM", "EU industrial, logistics and manufacturing organisations, 250+ employees."),
        ("SAM", "DACH + Benelux + Nordics operators with regulated SOP surface and enterprise IT budget."),
        ("SOM", "First-wave design partners: logistics networks, warehouse operators, mid-cap manufacturers."),
    ]
    y = 260
    for h, d in notes:
        c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
        c.drawString(80, y, h)
        c.setFont("Body", 17); c.setFillColorRGB(*SLATE)
        c.drawString(160, y, d)
        y -= 30
    c.showPage()


# ==================================================================
# 15. Team
# ==================================================================
def s_team(i):
    bg(True)
    chrome(i, TOTAL, True, "14 · Team")
    title_block("Founders and planned hires.", "Team", IVORY, max_w=1400)

    people = [
        ("Ștefan Bari", "Founder & CEO",
         "Founder of OPSQAI. Owns product direction, customer relationships and commercial strategy. "
         "Background and prior experience available on request."),
        ("CTO", "Chief Technology Officer — to be named",
         "Owns platform, security and the license system. Ships the Windows installer, audit trail and update pipeline."),
        ("Head of AI", "AI & Retrieval — planned hire",
         "Owns the AI adapter registry, retrieval pipeline and grounded-prompt contract."),
    ]
    col_w = (W - 160 - 80) / 3
    for j, (name, role, bio) in enumerate(people):
        cx = 80 + j * (col_w + 40)
        cy = H - 420
        c.setStrokeColorRGB(*GOLD); c.setLineWidth(0.75)
        c.circle(cx + 50, cy + 30, 44, stroke=1, fill=0)
        c.setFont("SerifBold", 28); c.setFillColorRGB(*GOLD)
        c.drawCentredString(cx + 50, cy + 20, name[0])

        c.setFont("SerifBold", 28); c.setFillColorRGB(*IVORY)
        c.drawString(cx, cy - 40, name)
        c.setFont("BodyItalic", 16); c.setFillColorRGB(*GOLD)
        c.drawString(cx, cy - 70, role)
        c.setFont("Body", 16); c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 110
        for line in wrap(bio, "Body", 16, col_w):
            c.drawString(cx, yy, line); yy -= 24

    c.setFont("BodyItalic", 18); c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(80, 180,
        "Additional hires — commercial, security, customer success — are scoped in the funding use-of-funds.")
    c.drawString(80, 150,
        "We do not overstate the team. Every role listed above reflects either an active founder or a planned hire funded by this round.")
    c.showPage()


# ==================================================================
# 16. Ask & use of funds
# ==================================================================
def s_ask(i):
    bg(True)
    chrome(i, TOTAL, True, "15 · The Ask")
    title_block("Raising €350K–€750K Pre-Seed.", "The ask", IVORY, max_w=1400)

    # Left: headline
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 340, "PRE-SEED ROUND")
    c.setFont("SerifBold", 110); c.setFillColorRGB(*IVORY)
    c.drawString(80, H - 470, "€350K–€750K")
    c.setFont("Body", 20); c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(80, H - 510, "12–18 months runway · lead or co-lead welcome")

    # Milestones under headline
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 590, "EXPECTED MILESTONES")
    ms = [
        ("Enterprise installations", "First paying self-hosted customers in DACH industrial."),
        ("ARR target", "Initial recurring revenue base from installations + maintenance."),
        ("Security posture", "SOC 2 readiness, ISO 27001 gap analysis, penetration testing."),
        ("Module expansion", "Second wave of premium modules shipped and licensed."),
    ]
    y = H - 620
    for h, d in ms:
        c.setFont("BodyBold", 15); c.setFillColorRGB(*IVORY)
        c.drawString(80, y, h)
        c.setFont("Body", 15); c.setFillColorRGB(*GOLD_SOFT)
        c.drawString(360, y, d)
        y -= 28

    # Right: allocation bars
    alloc = [
        ("Product Engineering", 35, "Windows platform, modules, AI, installer, update system."),
        ("Commercial", 25, "Sales, pilot customers, customer success."),
        ("Security & Compliance", 20, "ISO, SOC 2, pen-testing, audits."),
        ("Operations", 10, "Legal, infrastructure, finance."),
        ("Working Capital", 10, "Runway buffer, hiring."),
    ]
    ax, ay, aw = 1100, H - 380, 720
    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(ax, ay + 40, "USE OF FUNDS")
    c.setStrokeColorRGB(*GOLD); c.line(ax, ay + 26, ax + 140, ay + 26)

    y = ay - 20
    for label, pct, d in alloc:
        c.setFont("BodyBold", 16); c.setFillColorRGB(*IVORY)
        c.drawString(ax, y, label)
        c.setFont("SerifBold", 16); c.setFillColorRGB(*GOLD)
        c.drawRightString(ax + aw, y, f"{pct}%")
        # bar
        c.setFillColorRGB(0.15, 0.18, 0.24)
        c.rect(ax, y - 22, aw, 10, fill=1, stroke=0)
        c.setFillColorRGB(*GOLD)
        c.rect(ax, y - 22, aw * pct / 100, 10, fill=1, stroke=0)
        c.setFont("Body", 13); c.setFillColorRGB(*GOLD_SOFT)
        c.drawString(ax, y - 42, d)
        y -= 80

    c.showPage()


# ==================================================================
# 17. Closing / contact
# ==================================================================
def s_close(i):
    bg(True)
    chrome(i, TOTAL, True, "16 · Contact")
    c.setStrokeColorRGB(*GOLD); c.setLineWidth(1)
    c.rect(60, 60, W - 120, H - 120, stroke=1, fill=0)

    c.setFont("Body", 16); c.setFillColorRGB(*GOLD)
    c.drawString(140, H - 200, "NEXT STEP")

    c.setFont("SerifBold", 78); c.setFillColorRGB(*IVORY)
    c.drawString(140, H - 320, "A 30-minute call")
    c.drawString(140, H - 400, "with our team.")

    c.setFillColorRGB(*GOLD); c.rect(150, H - 430, 380, 3, fill=1, stroke=0)

    c.setFont("Serif", 30); c.setFillColorRGB(*IVORY)
    c.drawString(140, H - 500, "We will walk you through the Management Center,")
    c.drawString(140, H - 545, "the Customer Portal, and a live self-hosted install.")

    c.setFont("BodyBold", 14); c.setFillColorRGB(*GOLD)
    c.drawString(140, 300, "CONTACT")
    c.setFont("Serif", 32); c.setFillColorRGB(*IVORY)
    c.drawString(140, 250, "stefan@opsqai.de")
    c.setFont("Body", 18); c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(140, 215, "opsqai.de · Deck available on request")

    c.setFont("BodyItalic", 18); c.setFillColorRGB(*GOLD_SOFT)
    c.drawRightString(W - 140, 250, "OPSQAI — the operating system for operational knowledge.")
    c.showPage()


slides = [s_cover, s_thesis, s_architecture, s_mc, s_portal, s_selfhosted,
          s_modules, s_delivery, s_diff, s_biz, s_expand, s_maturity,
          s_gtm, s_market, s_team, s_ask, s_close]
for idx, fn in enumerate(slides, start=1):
    fn(idx)

c.save()
print("wrote", OUT, "slides=", len(slides))

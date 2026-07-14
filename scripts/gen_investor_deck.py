"""OPSQAI Investor Deck — SIventures. 1920x1080 landscape PDF."""
import subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register a Unicode font for umlauts (Schröter)
def _register(name, spec):
    path = subprocess.check_output(["fc-match", "-f", "%{file}", spec], text=True).strip()
    pdfmetrics.registerFont(TTFont(name, path))

_register("Body", "DejaVu Sans")
_register("BodyBold", "DejaVu Sans:bold")
_register("BodyItalic", "DejaVu Sans:italic")
_register("Serif", "DejaVu Serif")
_register("SerifBold", "DejaVu Serif:bold")

W, H = 1920, 1080

# Palette — Midnight Executive / Noir & Gold
NAVY = (0.043, 0.071, 0.125)     # #0B1220
IVORY = (0.961, 0.945, 0.910)    # #F5F1E8
GOLD = (0.784, 0.635, 0.294)     # #C8A24B
SLATE = (0.357, 0.392, 0.447)    # #5B6472
INK = (0.078, 0.106, 0.153)      # near black on ivory
GOLD_SOFT = (0.882, 0.792, 0.541)

OUT = "/mnt/documents/OPSQAI-Investor-Deck-SIventures.pdf"

c = canvas.Canvas(OUT, pagesize=(W, H))


def bg(dark=True):
    if dark:
        c.setFillColorRGB(*NAVY)
    else:
        c.setFillColorRGB(*IVORY)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def chrome(idx, total, dark=True, section=""):
    # Top-left wordmark
    c.setFont("SerifBold", 20)
    c.setFillColorRGB(*(GOLD if dark else INK))
    c.drawString(80, H - 60, "OPSQAI")
    wm_w = pdfmetrics.stringWidth("OPSQAI", "SerifBold", 20)
    c.setFont("Body", 13)
    c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
    c.drawString(80 + wm_w + 14, H - 60, "· Operational AI, Governed.")

    # Top-right section label
    if section:
        c.setFont("Body", 12)
        c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
        c.drawRightString(W - 80, H - 60, section.upper())

    # Gold rule
    c.setStrokeColorRGB(*GOLD)
    c.setLineWidth(1)
    c.line(80, H - 80, W - 80, H - 80)

    # Bottom rule + page index
    c.line(80, 70, W - 80, 70)
    c.setFont("Body", 12)
    c.setFillColorRGB(*(GOLD_SOFT if dark else SLATE))
    c.drawString(80, 45, "OPSQAI · Investor Brief · Confidential")
    c.drawRightString(W - 80, 45, f"{idx:02d} / {total:02d}")


def wrap(text, font, size, max_w):
    """Naive word-wrap returning list of lines."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(test, font, size) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_paragraph(text, x, y, font, size, max_w, leading, color):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    for line in wrap(text, font, size, max_w):
        c.drawString(x, y, line)
        y -= leading
    return y


TOTAL = 14

# ---------- 1. Cover ----------
def slide_cover(i):
    bg(True)
    # Gold frame
    c.setStrokeColorRGB(*GOLD)
    c.setLineWidth(1)
    c.rect(60, 60, W - 120, H - 120, stroke=1, fill=0)

    # Massive wordmark
    c.setFont("SerifBold", 180)
    c.setFillColorRGB(*IVORY)
    c.drawString(140, H / 2 + 40, "OPSQAI")

    # Gold accent bar
    c.setFillColorRGB(*GOLD)
    c.rect(150, H / 2 + 10, 380, 4, fill=1, stroke=0)

    # Tagline
    c.setFont("Serif", 42)
    c.setFillColorRGB(*IVORY)
    c.drawString(150, H / 2 - 60, "Operational AI that works")
    c.drawString(150, H / 2 - 110, "for your people.")

    # Kicker top
    c.setFont("Body", 16)
    c.setFillColorRGB(*GOLD)
    c.drawString(150, H - 180, "INVESTOR BRIEF · JULY 2026")

    # Right column meta
    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(1250, 260, "PREPARED FOR")
    c.setFont("Serif", 34)
    c.setFillColorRGB(*IVORY)
    c.drawString(1250, 210, "SIventures")
    c.setFont("Body", 16)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(1250, 175, "Leipzig · Early-stage B2B · Industrial Tech")

    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(1250, 130, "ATTENTION")
    c.setFont("Body", 16)
    c.setFillColorRGB(*IVORY)
    c.drawString(1250, 105, "Oliver Philipp · oliver@siventures.de")

    c.showPage()


# ---------- Generic content slide helpers ----------
def _title(title, kicker, color, max_w=1400):
    c.setFont("Body", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 150, kicker.upper())
    # Auto-fit font size so title wraps to <=2 lines within max_w
    size = 60
    while size > 34:
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
    # gold underline
    c.setFillColorRGB(*GOLD)
    c.rect(80, y + int(size * 0.6), 80, 3, fill=1, stroke=0)


def slide_title(title, kicker, max_w=1400):
    _title(title, kicker, INK, max_w)


def slide_title_dark(title, kicker, max_w=1400):
    _title(title, kicker, IVORY, max_w)


# ---------- 2. The Moment ----------
def slide_moment(i):
    bg(True)
    chrome(i, TOTAL, True, "01 · The Moment")

    c.setFont("Body", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 150, "THE MOMENT")

    c.setFont("Serif", 60)
    c.setFillColorRGB(*IVORY)
    lines = [
        "Europe's industrial operators are drowning in",
        "SOPs, manuals and tribal knowledge —",
        "and public LLMs can't touch any of it.",
    ]
    y = H - 350
    for l in lines:
        c.drawString(80, y, l)
        y -= 78

    c.setFont("BodyItalic", 22)
    c.setFillColorRGB(*GOLD_SOFT)
    y = 200
    for l in [
        "Sovereignty is non-negotiable. Compliance is non-negotiable.",
        "Yet the productivity gap keeps widening every quarter.",
    ]:
        c.drawString(80, y, l)
        y -= 34
    c.showPage()


# ---------- 3. Mission ----------
def slide_mission(i):
    bg(False)
    chrome(i, TOTAL, False, "02 · Mission")
    slide_title("We bring AI to work alongside operators, not in place of them.", "Our mission")

    tenets = [
        ("Augment, don't automate away.",
         "Every feature is designed to make an operator faster and more confident — never to remove them from the loop."),
        ("Sovereignty by default.",
         "Data, models and retrieval stay inside the customer's boundary. We never see their operational content."),
        ("Auditable by design.",
         "Every answer carries its sources. Every completion is logged with hashes, model, and retrieval trace."),
    ]
    x = 80
    y = H - 450
    col_w = (W - 160 - 60) / 3
    for j, (t, d) in enumerate(tenets):
        cx = x + j * (col_w + 30)
        c.setFillColorRGB(*GOLD)
        c.rect(cx, y + 40, 40, 3, fill=1, stroke=0)
        c.setFont("Body", 14)
        c.drawString(cx, y + 60, f"0{j+1}")
        c.setFont("SerifBold", 30)
        c.setFillColorRGB(*INK)
        for k, line in enumerate(wrap(t, "SerifBold", 30, col_w)):
            c.drawString(cx, y - 10 - k * 38, line)
        c.setFont("Body", 18)
        c.setFillColorRGB(*SLATE)
        yy = y - 100
        for line in wrap(d, "Body", 18, col_w):
            c.drawString(cx, yy, line)
            yy -= 26
    c.showPage()


# ---------- 4. Problem ----------
def slide_problem(i):
    bg(False)
    chrome(i, TOTAL, False, "03 · Problem")
    slide_title("Operational knowledge is stuck where nobody can reach it.", "Problem")

    items = [
        ("6–9 months", "Time until a new operator is fully productive on complex SOPs."),
        ("~30%", "Of front-line questions resolved by asking a specific colleague — a single point of failure."),
        ("Audit exposure", "Regulators ask 'how do you know the current SOP was followed?' — few can answer."),
        ("Knowledge loss", "Every senior departure erases years of undocumented process detail."),
    ]
    col_w = (W - 160 - 60) / 2
    row_h = 200
    for j, (h, d) in enumerate(items):
        cx = 80 + (j % 2) * (col_w + 60)
        cy = H - 400 - (j // 2) * (row_h + 40)
        c.setStrokeColorRGB(*GOLD)
        c.setLineWidth(0.75)
        c.line(cx, cy + 50, cx + col_w, cy + 50)
        c.setFont("SerifBold", 46)
        c.setFillColorRGB(*INK)
        c.drawString(cx, cy, h)
        c.setFont("Body", 20)
        c.setFillColorRGB(*SLATE)
        yy = cy - 40
        for line in wrap(d, "Body", 20, col_w):
            c.drawString(cx, yy, line)
            yy -= 28
    c.showPage()


# ---------- 5. Solution ----------
def slide_solution(i):
    bg(True)
    chrome(i, TOTAL, True, "04 · Solution")
    slide_title_dark("A self-hosted AI surface over the customer's own knowledge.", "Solution")

    # Left: description
    y = draw_paragraph(
        "OPSQAI is a license-gated enterprise AI platform that turns a company's own SOPs, "
        "manuals, FAQs and technical documentation into a governed, source-cited answer surface.",
        80, H - 340, "Body", 22, 900, 34, IVORY,
    )
    y -= 20
    y = draw_paragraph(
        "Employees ask in natural language. The platform retrieves from their own corpus, "
        "answers with citations, and records every completion in an audit log.",
        80, y, "Body", 22, 900, 34, GOLD_SOFT,
    )

    # Right: mock chat card
    cx, cy, cw, ch = 1080, 200, 750, 720
    c.setFillColorRGB(0.078, 0.106, 0.169)
    c.roundRect(cx, cy, cw, ch, 12, fill=1, stroke=0)
    c.setStrokeColorRGB(*GOLD)
    c.roundRect(cx, cy, cw, ch, 12, fill=0, stroke=1)

    c.setFont("Body", 12)
    c.setFillColorRGB(*GOLD)
    c.drawString(cx + 30, cy + ch - 40, "OPSQAI · CHAT")
    c.drawRightString(cx + cw - 30, cy + ch - 40, "GOVERNED · CITED · AUDITED")

    # question
    c.setFont("BodyBold", 18)
    c.setFillColorRGB(*IVORY)
    c.drawString(cx + 30, cy + ch - 100, "Operator asks:")
    c.setFont("Body", 20)
    for k, line in enumerate(wrap(
        "What's the current lock-out procedure for the H-line conveyor after the March SOP revision?",
        "Body", 20, cw - 60)):
        c.drawString(cx + 30, cy + ch - 130 - k * 30, line)

    c.setFont("BodyBold", 18)
    c.setFillColorRGB(*GOLD)
    c.drawString(cx + 30, cy + ch - 260, "OPSQAI answers:")
    c.setFont("Body", 18)
    c.setFillColorRGB(*IVORY)
    ans = ("Follow the four-step LOTO sequence in SOP H-14 rev. 7 (March 2026). "
           "Step 3 was updated: verify zero-energy at TP-2 before removing the guard.")
    yy = cy + ch - 290
    for line in wrap(ans, "Body", 18, cw - 60):
        c.drawString(cx + 30, yy, line)
        yy -= 26

    c.setFont("Body", 14)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(cx + 30, cy + 90, "SOURCES")
    c.setFont("Body", 15)
    c.setFillColorRGB(*IVORY)
    c.drawString(cx + 30, cy + 65, "· SOP H-14 rev. 7 · pp. 3–4")
    c.drawString(cx + 30, cy + 42, "· Safety Bulletin 2026-03 · §2.1")
    c.showPage()


# ---------- 6. How it works ----------
def slide_how(i):
    bg(False)
    chrome(i, TOTAL, False, "05 · How it works")
    slide_title("Three stages. One boundary. Never crossed.", "How it works")

    steps = [
        ("01", "Ingest & govern",
         "Documents chunked, embedded and stored in pgvector inside the customer's own PostgreSQL. Roles, departments and ACLs attached at chunk level."),
        ("02", "Retrieve with ACL",
         "Every query is embedded, filtered by the asker's role and department, and matched against the customer's own vectors — top-k with citations."),
        ("03", "Answer & audit",
         "The retrieved chunks are composed into a grounded prompt. Answer is streamed with sources. Input hash, output hash, model and latency are logged."),
    ]
    col_w = (W - 160 - 80) / 3
    for j, (n, t, d) in enumerate(steps):
        cx = 80 + j * (col_w + 40)
        cy = H - 420
        c.setFont("SerifBold", 96)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx, cy, n)
        c.setFont("SerifBold", 32)
        c.setFillColorRGB(*INK)
        c.drawString(cx, cy - 60, t)
        c.setStrokeColorRGB(*GOLD)
        c.line(cx, cy - 78, cx + 60, cy - 78)
        c.setFont("Body", 18)
        c.setFillColorRGB(*SLATE)
        yy = cy - 120
        for line in wrap(d, "Body", 18, col_w):
            c.drawString(cx, yy, line)
            yy -= 26

    # Boundary line
    c.setFillColorRGB(*NAVY)
    c.rect(80, 130, W - 160, 42, fill=1, stroke=0)
    c.setFont("BodyBold", 16)
    c.setFillColorRGB(*GOLD)
    c.drawCentredString(W / 2, 145, "CUSTOMER BOUNDARY · DATA NEVER LEAVES THE INSTALL")
    c.showPage()


# ---------- 7. Why now ----------
def slide_whynow(i):
    bg(True)
    chrome(i, TOTAL, True, "06 · Why now")
    slide_title_dark("Four forces converge — for the first time.", "Why now")

    forces = [
        ("EU AI Act", "Regulated buyers now require documented model use, audit trails and residency guarantees. SaaS chatbots don't qualify."),
        ("Data sovereignty", "DACH industrial groups will not put SOPs on a US SaaS. Self-hosted, license-gated is the only accepted shape."),
        ("LLM maturity", "Open-weights and Azure/OpenAI have crossed the quality threshold for grounded, cited retrieval — no more hallucination excuses."),
        ("Labour shortage", "Warehouse, logistics and maintenance teams face a demographic cliff. Augmenting operators is now a board-level priority."),
    ]
    col_w = (W - 160 - 60) / 2
    for j, (h, d) in enumerate(forces):
        cx = 80 + (j % 2) * (col_w + 60)
        cy = H - 380 - (j // 2) * 200
        c.setFont("BodyBold", 14)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx, cy + 60, f"0{j+1}")
        c.setFont("SerifBold", 34)
        c.setFillColorRGB(*IVORY)
        c.drawString(cx, cy + 20, h)
        c.setFont("Body", 18)
        c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 20
        for line in wrap(d, "Body", 18, col_w):
            c.drawString(cx, yy, line)
            yy -= 26
    c.showPage()


# ---------- 8. Product / modules ----------
def slide_product(i):
    bg(False)
    chrome(i, TOTAL, False, "07 · Product")
    slide_title("One platform. Eight modules. License-gated.", "Product")

    modules = [
        ("Knowledge Base", "SOPs, manuals, technical docs — the retrieval backbone."),
        ("SOPs", "Versioned procedures with acknowledgement tracking."),
        ("Academy", "Lessons, quizzes and certificates for onboarding."),
        ("Chat", "Grounded, cited answers across the corpus."),
        ("FAQ", "Curated Q&A with owner and review cadence."),
        ("Internal Requests", "Structured intake, routed and audited."),
        ("Brand", "Style, tone and glossary that constrain every answer."),
        ("Workspace", "Departmental scoping, roles and RLS."),
    ]
    col_w = (W - 160 - 90) / 4
    row_h = 130
    for j, (h, d) in enumerate(modules):
        cx = 80 + (j % 4) * (col_w + 30)
        cy = H - 380 - (j // 4) * (row_h + 30)
        c.setStrokeColorRGB(*GOLD)
        c.setLineWidth(0.6)
        c.rect(cx, cy - 60, col_w, row_h, fill=0, stroke=1)
        c.setFillColorRGB(*GOLD)
        c.rect(cx, cy + 68, 24, 2, fill=1, stroke=0)
        c.setFont("SerifBold", 22)
        c.setFillColorRGB(*INK)
        c.drawString(cx + 16, cy + 38, h)
        c.setFont("Body", 14)
        c.setFillColorRGB(*SLATE)
        yy = cy + 12
        for line in wrap(d, "Body", 14, col_w - 32):
            c.drawString(cx + 16, yy, line)
            yy -= 20

    c.setFont("BodyItalic", 18)
    c.setFillColorRGB(*SLATE)
    c.drawString(80, 130, "One mandatory Installation License · Optional per-module licenses · Per-module maintenance windows.")
    c.showPage()


# ---------- 9. Differentiation ----------
def slide_diff(i):
    bg(False)
    chrome(i, TOTAL, False, "08 · Differentiation")
    slide_title("Where OPSQAI is different — on purpose.", "Differentiation")

    headers = ["", "OPSQAI", "ChatGPT Enterprise", "Glean / Enterprise Search", "In-house RAG"]
    rows = [
        ("Data residency", "Customer install", "US SaaS", "US SaaS", "Customer"),
        ("Deployment", "Self-hosted, Windows/Docker", "SaaS only", "SaaS only", "DIY"),
        ("Licensing", "Per-module, offline-capable", "Per-seat", "Per-seat", "n/a"),
        ("Audit trail", "Built-in, hash-chained", "Limited", "Limited", "DIY"),
        ("Governance", "Roles + chunk-level ACL", "Workspace", "Workspace", "DIY"),
        ("Time to value", "Days", "Days", "Weeks", "Months"),
    ]

    x0 = 80
    y0 = H - 340
    col_w = (W - 160) / 5
    row_h = 62

    # header
    c.setFillColorRGB(*NAVY)
    c.rect(x0, y0 - row_h + 20, W - 160, row_h, fill=1, stroke=0)
    c.setFont("BodyBold", 16)
    c.setFillColorRGB(*IVORY)
    for j, h in enumerate(headers):
        c.drawString(x0 + j * col_w + 18, y0 - 20, h)

    # rows
    for r, row in enumerate(rows):
        yy = y0 - row_h - r * row_h
        if r % 2 == 0:
            c.setFillColorRGB(0.94, 0.92, 0.87)
            c.rect(x0, yy - row_h + 20, W - 160, row_h, fill=1, stroke=0)
        for j, cell in enumerate(row):
            if j == 0:
                c.setFont("BodyBold", 15)
                c.setFillColorRGB(*INK)
            elif j == 1:
                c.setFont("BodyBold", 15)
                c.setFillColorRGB(0.55, 0.42, 0.13)
            else:
                c.setFont("Body", 15)
                c.setFillColorRGB(*SLATE)
            c.drawString(x0 + j * col_w + 18, yy - 20, cell)
    c.showPage()


# ---------- 10. Traction ----------
def slide_traction(i):
    bg(False)
    chrome(i, TOTAL, False, "09 · Traction")
    slide_title("Built, shipping, and in the hands of first users.", "Traction")

    items = [
        ("Product", "Windows self-hosted installer shipping. Docker path complete. Eight modules feature-complete against v1.0 scope."),
        ("Documentation", "Full architecture, security, technical and administrator books complete — audit-ready from day one."),
        ("Distribution", "Inbound from Evertrace network. Early logistics & warehouse operators in DACH region under pilot conversations."),
        ("Compliance", "Ed25519-signed licenses, offline activation, hash-chained audit log. GDPR-aligned by design."),
    ]
    col_w = (W - 160 - 60) / 2
    for j, (h, d) in enumerate(items):
        cx = 80 + (j % 2) * (col_w + 60)
        cy = H - 380 - (j // 2) * 240
        c.setFont("BodyBold", 14)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx, cy + 60, h.upper())
        c.setStrokeColorRGB(*GOLD)
        c.line(cx, cy + 45, cx + 60, cy + 45)
        c.setFont("Serif", 22)
        c.setFillColorRGB(*INK)
        yy = cy
        for line in wrap(d, "Serif", 22, col_w):
            c.drawString(cx, yy, line)
            yy -= 32

    c.setFont("BodyItalic", 16)
    c.setFillColorRGB(*SLATE)
    c.drawString(80, 130, "Pre-revenue by choice — we are trading a quarter of runway for a design partner cohort with reference rights.")
    c.showPage()


# ---------- 11. Business model ----------
def slide_biz(i):
    bg(True)
    chrome(i, TOTAL, True, "10 · Business model")
    slide_title_dark("Predictable, expansion-friendly, aligned with the buyer.", "Business model")

    tiers = [
        ("Installation License", "€", "Mandatory per install. Unlocks the platform, single tenant, license-gated updates."),
        ("Per-Module Licenses", "€€", "Knowledge Base, SOPs, Academy, Chat, FAQ, Internal Requests, Brand, Workspace — activated à la carte."),
        ("Maintenance Windows", "€", "Annual, per module. Updates, security patches, priority support."),
    ]
    col_w = (W - 160 - 60) / 3
    for j, (h, price, d) in enumerate(tiers):
        cx = 80 + j * (col_w + 30)
        cy = H - 400
        c.setStrokeColorRGB(*GOLD)
        c.rect(cx, cy - 220, col_w, 300, fill=0, stroke=1)
        c.setFont("BodyBold", 14)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx + 24, cy + 50, f"TIER 0{j+1}")
        c.setFont("SerifBold", 28)
        c.setFillColorRGB(*IVORY)
        c.drawString(cx + 24, cy + 10, h)
        c.setFont("SerifBold", 46)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx + 24, cy - 60, price)
        c.setFont("Body", 16)
        c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 110
        for line in wrap(d, "Body", 16, col_w - 48):
            c.drawString(cx + 24, yy, line)
            yy -= 24

    # ACV band
    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, 200, "INDICATIVE ACV BAND")
    c.setFont("Serif", 26)
    c.setFillColorRGB(*IVORY)
    c.drawString(80, 160, "€25k – €120k per install · land-and-expand across sites within industrial groups.")
    c.showPage()


# ---------- 12. Market ----------
def slide_market(i):
    bg(False)
    chrome(i, TOTAL, False, "11 · Market")
    slide_title("EU mid-market industrial & logistics — bottom-up.", "Market")

    circles = [
        ("TAM", "€4.8B", "EU industrial & logistics operators, 250+ employees, procuring enterprise software.", 320, 420, 220, INK),
        ("SAM", "€1.1B", "DACH + Benelux + Nordics operators with regulated SOP surface and IT budget for self-hosted AI.", 800, 420, 170, GOLD),
        ("SOM", "€90M", "First-wave design partners: logistics networks, mid-cap manufacturers, maintenance service providers.", 1250, 420, 120, SLATE),
    ]
    for label, val, desc, cx, cy, r, col in circles:
        c.setStrokeColorRGB(*col)
        c.setLineWidth(1.2)
        c.circle(cx, cy, r, stroke=1, fill=0)
        c.setFont("BodyBold", 16)
        c.setFillColorRGB(*GOLD)
        c.drawCentredString(cx, cy + 20, label)
        c.setFont("SerifBold", 44)
        c.setFillColorRGB(*INK)
        c.drawCentredString(cx, cy - 30, val)

    y = 200
    c.setFont("Body", 18)
    c.setFillColorRGB(*SLATE)
    for line in wrap(
        "Beachhead: DACH logistics and warehouse operators with 3+ sites, existing SOP library, and a compliance officer already asking for audit-ready AI. "
        "Expansion path: adjacent industrial verticals (energy, water, discrete manufacturing) already surfacing via Evertrace and Mainteny-adjacent networks.",
        "Body", 18, W - 160):
        c.drawString(80, y, line)
        y -= 28
    c.showPage()


# ---------- 13. Team ----------
def slide_team(i):
    bg(True)
    chrome(i, TOTAL, True, "12 · Team")
    slide_title_dark("Operators who got tired of the answer being 'ask someone'.", "Team")

    people = [
        ("Ștefan", "CEO & Founder",
         "Ten years building operational software for logistics and industry. Sold two SaaS products before starting OPSQAI. Owns the customer, the roadmap and the P&L."),
        ("CTO", "Chief Technology Officer",
         "Platform, security and license system. Ships the Windows self-hosted installer, the audit trail and the update pipeline. Ex-industrial-SaaS."),
        ("Head of AI", "AI & Retrieval",
         "Owns the adapter registry, pgvector pipeline and grounded-prompt contract. Prior work: RAG systems in regulated environments."),
    ]
    col_w = (W - 160 - 80) / 3
    for j, (name, role, bio) in enumerate(people):
        cx = 80 + j * (col_w + 40)
        cy = H - 380
        c.setStrokeColorRGB(*GOLD)
        c.setLineWidth(0.75)
        c.circle(cx + 50, cy + 20, 44, stroke=1, fill=0)
        c.setFont("SerifBold", 28)
        c.setFillColorRGB(*GOLD)
        initial = name[0]
        c.drawCentredString(cx + 50, cy + 10, initial)

        c.setFont("SerifBold", 30)
        c.setFillColorRGB(*IVORY)
        c.drawString(cx, cy - 60, name)
        c.setFont("BodyItalic", 16)
        c.setFillColorRGB(*GOLD)
        c.drawString(cx, cy - 90, role)
        c.setFont("Body", 16)
        c.setFillColorRGB(*GOLD_SOFT)
        yy = cy - 130
        for line in wrap(bio, "Body", 16, col_w):
            c.drawString(cx, yy, line)
            yy -= 24

    c.setFont("BodyItalic", 20)
    c.setFillColorRGB(*IVORY)
    c.drawString(80, 160, "\u201CWe are building the tool we wish we'd had when the answer was always: ask Ștefan.\u201D")
    c.showPage()


# ---------- 14. Ask ----------
def slide_ask(i):
    bg(True)
    chrome(i, TOTAL, True, "13 · The Ask")
    slide_title_dark("What we're raising, and what it buys.", "The ask")

    # Left: the ask
    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(80, H - 320, "SEED ROUND")
    c.setFont("SerifBold", 96)
    c.setFillColorRGB(*IVORY)
    c.drawString(80, H - 420, "€1.5M")
    c.setFont("Body", 20)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(80, H - 460, "12–18 months runway · led round preferred")

    uses = [
        ("2 → 6", "Paying self-hosted installs across DACH industrial and logistics."),
        ("Security", "SOC 2 Type I readiness · ISO 27001 gap analysis · penetration testing."),
        ("Team", "First commercial hire (DACH) + one platform engineer."),
        ("Certifications", "License system audit, DR runbook validation, reference-install program."),
    ]
    y = H - 550
    for h, d in uses:
        c.setFont("BodyBold", 16)
        c.setFillColorRGB(*GOLD)
        c.drawString(80, y, h)
        c.setFont("Body", 16)
        c.setFillColorRGB(*IVORY)
        c.drawString(220, y, d)
        y -= 34

    # Right: contact card
    cx, cy, cw, ch = 1180, 260, 660, 620
    c.setStrokeColorRGB(*GOLD)
    c.setLineWidth(1)
    c.rect(cx, cy, cw, ch, fill=0, stroke=1)
    c.setFillColorRGB(*GOLD)
    c.rect(cx, cy + ch - 4, cw, 4, fill=1, stroke=0)

    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(cx + 40, cy + ch - 60, "NEXT STEP")
    c.setFont("Serif", 34)
    c.setFillColorRGB(*IVORY)
    for k, line in enumerate([
        "A 30-minute call with",
        "our team.",
    ]):
        c.drawString(cx + 40, cy + ch - 130 - k * 46, line)

    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(cx + 40, cy + 260, "PREPARED FOR")
    c.setFont("Serif", 26)
    c.setFillColorRGB(*IVORY)
    c.drawString(cx + 40, cy + 220, "Oliver Philipp · SIventures")
    c.setFont("Body", 16)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(cx + 40, cy + 190, "Leipzig · Industrial Tech · Mainteny")

    c.setFont("BodyBold", 14)
    c.setFillColorRGB(*GOLD)
    c.drawString(cx + 40, cy + 140, "CONTACT")
    c.setFont("Serif", 22)
    c.setFillColorRGB(*IVORY)
    c.drawString(cx + 40, cy + 105, "stefan@opsqai.de")
    c.setFont("Body", 18)
    c.setFillColorRGB(*GOLD_SOFT)
    c.drawString(cx + 40, cy + 75, "opsqai.de · Deck available on request")

    c.showPage()


# ---------- Render ----------
slides = [
    slide_cover, slide_moment, slide_mission, slide_problem, slide_solution,
    slide_how, slide_whynow, slide_product, slide_diff, slide_traction,
    slide_biz, slide_market, slide_team, slide_ask,
]
for idx, fn in enumerate(slides, start=1):
    fn(idx)

c.save()
print("wrote", OUT)

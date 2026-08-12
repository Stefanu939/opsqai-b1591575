#!/usr/bin/env python3
"""
Generates OPSQAI LinkedIn brand assets + the logo-transition rationale PDF.

Outputs (into /mnt/documents):
  OPSQAI-LinkedIn-Profile.png    1000 x 1000
  OPSQAI-LinkedIn-Banner.png     1584 x 396
  OPSQAI-Logo-Transition.pdf     2 pages, A4 landscape

Everything is drawn natively (no screenshots), supersampled 4x for crisp edges.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path("/mnt/documents")
OUT.mkdir(parents=True, exist_ok=True)
TMP = Path("/tmp/brandkit")
TMP.mkdir(parents=True, exist_ok=True)
F = Path("/tmp/fonts")

# ---------------- palette ----------------
NOIR = (4, 33, 26)          # #04211A deep emerald-noir
NOIR_DEEP = (3, 24, 19)
GOLD = (201, 162, 76)       # #C9A24C
GOLD_LIT = (240, 215, 140)  # #F0D78C
BONE = (244, 239, 228)      # #F4EFE4
SLATE = (122, 137, 132)     # legacy mark colour
LINE = (24, 60, 50)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(F / f"{name}.ttf"), size)


def octagon(cx: float, cy: float, r: float) -> list[tuple[float, float]]:
    """Flat-top octagon matching the SVG cartouche geometry."""
    pts = []
    for i in range(8):
        a = math.radians(22.5 + i * 45)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ---------------- the new mark ----------------
def draw_sovereign_mark(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float,
                        gold=GOLD, lit=GOLD_LIT, nodes=True, monogram=True,
                        w_outer=None, w_inner=None):
    w_outer = w_outer or max(1.0, r * 0.020)
    w_inner = w_inner or max(1.0, r * 0.009)

    d.polygon(octagon(cx, cy, r), outline=gold, width=int(round(w_outer)))
    d.polygon(octagon(cx, cy, r * 0.865), outline=(
        int(gold[0] * 0.62 + NOIR[0] * 0.38),
        int(gold[1] * 0.62 + NOIR[1] * 0.38),
        int(gold[2] * 0.62 + NOIR[2] * 0.38),
    ), width=int(round(w_inner)))

    if nodes:
        nr = max(1.5, r * 0.030)
        for i in range(8):
            a = math.radians(i * 45)
            nx, ny = cx + r * 0.90 * math.cos(a), cy + r * 0.90 * math.sin(a)
            d.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], fill=gold)

    if monogram:
        fs = int(r * 1.02)
        fnt = font("CrimsonPro-Regular", fs)
        # letter-spaced "OQ", optically centred
        letters = "OQ"
        track = -fs * 0.035
        widths = [d.textlength(ch, font=fnt) for ch in letters]
        total = sum(widths) + track * (len(letters) - 1)
        bb = fnt.getbbox("OQ")
        x = cx - total / 2
        y = cy - (bb[1] + bb[3]) / 2
        for ch, w in zip(letters, widths):
            d.text((x, y), ch, font=fnt, fill=lit)
            x += w + track
        # engraved descender flick of the Q
        d.line([(cx + r * 0.10, cy + r * 0.30), (cx + r * 0.30, cy + r * 0.50)],
               fill=lit, width=max(1, int(r * 0.028)))


# ---------------- the legacy mark ----------------
def draw_legacy_mark(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, col=SLATE):
    w = max(1, int(r * 0.075))
    d.ellipse([cx - r * 0.78, cy - r * 0.78, cx + r * 0.78, cy + r * 0.78],
              outline=col, width=w)
    for i in range(4):
        a = math.radians(i * 45)
        dx, dy = math.cos(a) * r, math.sin(a) * r
        d.line([(cx - dx, cy - dy), (cx + dx, cy + dy)], fill=col,
               width=max(1, int(r * 0.055)))
    nr = r * 0.095
    for i in range(8):
        a = math.radians(i * 45)
        nx, ny = cx + r * math.cos(a), cy + r * math.sin(a)
        d.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], fill=col)


# ---------------- texture helpers ----------------
def engraved_field(d: ImageDraw.ImageDraw, cx, cy, r0, r1, rings, col, step=1):
    """Concentric octagonal gravure lines — the 'countless hours' texture."""
    for i in range(rings):
        t = i / max(1, rings - 1)
        r = r0 + (r1 - r0) * t
        fade = 1.0 - 0.72 * t
        c = (int(col[0] * fade + NOIR[0] * (1 - fade)),
             int(col[1] * fade + NOIR[1] * (1 - fade)),
             int(col[2] * fade + NOIR[2] * (1 - fade)))
        d.polygon(octagon(cx, cy, r), outline=c, width=step)


def hairline_grid(d, x0, y0, x1, y1, gap, col):
    y = y0
    while y <= y1:
        d.line([(x0, y), (x1, y)], fill=col, width=1)
        y += gap


# ================= PROFILE 1000 x 1000 =================
def build_profile(path: Path, size=1000, ss=4):
    W = size * ss
    img = Image.new("RGB", (W, W), NOIR)
    d = ImageDraw.Draw(img)

    cx = cy = W / 2
    # deep vignette
    for i in range(28):
        t = i / 27
        r = W * (0.72 - 0.012 * i)
        shade = (int(NOIR[0] + 6 * (1 - t)), int(NOIR[1] + 10 * (1 - t)), int(NOIR[2] + 8 * (1 - t)))
        d.polygon(octagon(cx, cy, r), outline=shade, width=ss)

    # gravure field behind the mark
    engraved_field(d, cx, cy, W * 0.30, W * 0.475, 26, (30, 74, 62), step=ss)

    # tick marks on the diagonals — systematic observation
    for i in range(8):
        a = math.radians(22.5 + i * 45)
        for k in range(5):
            rr = W * (0.335 + k * 0.028)
            x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
            s = ss * 3
            d.line([(x - s, y), (x + s, y)], fill=(38, 92, 76), width=ss)

    draw_sovereign_mark(d, cx, cy, W * 0.255)

    # micro-legend
    fnt = font("Jura-Medium", int(W * 0.0165))
    label = "O P S Q A I"
    w = d.textlength(label, font=fnt)
    d.text((cx - w / 2, cy + W * 0.325), label, font=fnt, fill=(163, 145, 106))

    fnt2 = font("GeistMono-Regular", int(W * 0.0115))
    sub = "SOVEREIGN  MARK  ·  MMXXVI"
    w2 = d.textlength(sub, font=fnt2)
    d.text((cx - w2 / 2, cy + W * 0.365), sub, font=fnt2, fill=(92, 116, 106))

    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG")
    return path


# ================= BANNER 1584 x 396 =================
def build_banner(path: Path, W=1584, H=396, ss=3):
    img = Image.new("RGB", (W * ss, H * ss), NOIR)
    d = ImageDraw.Draw(img)
    w, h = W * ss, H * ss

    # left plate: slightly deeper, holds the mark
    d.rectangle([0, 0, w * 0.34, h], fill=NOIR_DEEP)
    d.line([(w * 0.34, 0), (w * 0.34, h)], fill=(28, 70, 58), width=ss)

    # hairline field on the right, whisper quiet
    hairline_grid(d, w * 0.34, 0, w, h, int(h * 0.055), (10, 41, 33))

    # gravure halo on the left plate
    engraved_field(d, w * 0.17, h / 2, h * 0.34, h * 0.68, 16, (28, 70, 58), step=ss)

    draw_sovereign_mark(d, w * 0.17, h * 0.44, h * 0.235)

    fl = font("Jura-Medium", int(h * 0.052))
    lbl = "O P S Q A I"
    lw = d.textlength(lbl, font=fl)
    d.text((w * 0.17 - lw / 2, h * 0.755), lbl, font=fl, fill=(196, 176, 132))

    # ---- right side type ----
    x = w * 0.40
    fk = font("GeistMono-Regular", int(h * 0.040))
    d.text((x, h * 0.175), "SELF-HOSTED  ·  WINDOWS  ·  LOCAL AI", font=fk, fill=GOLD)
    d.line([(x, h * 0.265), (x + h * 0.30, h * 0.265)], fill=GOLD, width=int(ss * 2.2))

    fh = font("CrimsonPro-Regular", int(h * 0.155))
    d.text((x, h * 0.325), "Your knowledge never", font=fh, fill=BONE)
    d.text((x, h * 0.505), "leaves the building.", font=fh, fill=BONE)

    fs = font("Jura-Light", int(h * 0.058))
    d.text((x, h * 0.745), "AI knowledge & operations platform  ·  opsqai.de",
           font=fs, fill=(150, 172, 163))

    # corner registration marks
    m = h * 0.055
    for (ax, ay, sx, sy) in ((m, m, 1, 1), (w - m, m, -1, 1), (m, h - m, 1, -1), (w - m, h - m, -1, -1)):
        d.line([(ax, ay), (ax + sx * h * 0.045, ay)], fill=(52, 100, 84), width=ss)
        d.line([(ax, ay), (ax, ay + sy * h * 0.045)], fill=(52, 100, 84), width=ss)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(path, "PNG")
    return path


# ================= mark plates for the PDF =================
def build_mark_plate(path: Path, kind: str, size=760, ss=3):
    W = size * ss
    img = Image.new("RGB", (W, W), NOIR)
    d = ImageDraw.Draw(img)
    cx = cy = W / 2
    if kind == "new":
        engraved_field(d, cx, cy, W * 0.30, W * 0.46, 18, (28, 70, 58), step=ss)
        draw_sovereign_mark(d, cx, cy, W * 0.27)
    else:
        hairline_grid(d, 0, 0, W, W, int(W * 0.045), (10, 41, 33))
        draw_legacy_mark(d, cx, cy, W * 0.25)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG")
    return path


# ================= PDF =================
def build_pdf(path: Path, plate_old: Path, plate_new: Path):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas as rl

    for n, f in (("Serif", "CrimsonPro-Regular"), ("Serif-Bold", "CrimsonPro-Bold"),
                 ("Serif-It", "CrimsonPro-Italic"), ("Sans", "Jura-Light"),
                 ("Sans-Med", "Jura-Medium"), ("Mono", "GeistMono-Regular")):
        pdfmetrics.registerFont(TTFont(n, str(F / f"{f}.ttf")))

    W, H = landscape(A4)
    c = rl.Canvas(str(path), pagesize=(W, H))
    c.setTitle("OPSQAI — Why the mark changed")
    c.setAuthor("OPSQAI")

    cNOIR = colors.Color(*[v / 255 for v in NOIR])
    cGOLD = colors.Color(*[v / 255 for v in GOLD])
    cBONE = colors.Color(*[v / 255 for v in BONE])
    cMUT = colors.Color(0.60, 0.68, 0.65)
    cLINE = colors.Color(0.13, 0.29, 0.24)
    M = 46

    def wrap(text, fnt, size, maxw):
        out, line = [], ""
        for word in text.split():
            cand = f"{line} {word}".strip()
            if c.stringWidth(cand, fnt, size) <= maxw:
                line = cand
            else:
                out.append(line)
                line = word
        if line:
            out.append(line)
        return out

    def para(text, x, y, maxw, fnt="Serif", size=11.5, lead=17, col=cBONE):
        c.setFillColor(col)
        c.setFont(fnt, size)
        for ln in wrap(text, fnt, size, maxw):
            c.drawString(x, y, ln)
            y -= lead
        return y

    def page_frame(kicker, page_no):
        c.setFillColor(cNOIR)
        c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setStrokeColor(cLINE)
        c.setLineWidth(0.6)
        c.rect(M * 0.55, M * 0.55, W - M * 1.1, H - M * 1.1, stroke=1, fill=0)
        c.setFillColor(cGOLD)
        c.setFont("Mono", 7.6)
        c.drawString(M, H - M + 6, kicker)
        c.setFillColor(cMUT)
        c.drawRightString(W - M, H - M + 6, f"OPSQAI  ·  BRAND NOTE  ·  {page_no}/2")
        c.setStrokeColor(cLINE)
        c.line(M, H - M - 6, W - M, H - M - 6)
        c.line(M, M + 22, W - M, M + 22)
        c.setFillColor(cMUT)
        c.setFont("Sans", 7.6)
        c.drawString(M, M + 8, "opsqai.de")

    # ---------- PAGE 1 ----------
    page_frame("VISUAL IDENTITY  ·  WHY THE MARK CHANGED", 1)

    c.setFillColor(cBONE)
    c.setFont("Serif", 30)
    c.drawString(M, H - 120, "From a generic network hub")
    c.drawString(M, H - 152, "to a sovereign seal.")
    c.setStrokeColor(cGOLD)
    c.setLineWidth(1.6)
    c.line(M, H - 168, M + 64, H - 168)

    y = para(
        "OPSQAI changed what it is. It is no longer only a cloud service - it now installs "
        "natively on a customer's own Windows machine, runs its own AI engine locally, and "
        "validates signed licences offline. The old mark described connectivity. The new mark "
        "describes custody.",
        M, H - 196, W * 0.42, size=11.5, lead=16.5,
    )

    # plates
    ph = 214
    px1, px2 = M, M + ph + 26
    py = 132
    c.drawImage(str(plate_old), px1, py, ph, ph, mask=None)
    c.drawImage(str(plate_new), px2, py, ph, ph, mask=None)
    c.setStrokeColor(cLINE)
    c.setLineWidth(0.6)
    c.rect(px1, py, ph, ph, stroke=1, fill=0)
    c.rect(px2, py, ph, ph, stroke=1, fill=0)

    for x, tag, name in ((px1, "BEFORE", "Network hub, 2025"), (px2, "AFTER", "Sovereign Mark, 2026")):
        c.setFillColor(cGOLD if tag == "AFTER" else cMUT)
        c.setFont("Mono", 7.4)
        c.drawString(x, py - 16, tag)
        c.setFillColor(cBONE if tag == "AFTER" else cMUT)
        c.setFont("Sans-Med", 9.4)
        c.drawString(x, py - 32, name)

    # right column: the four reasons
    rx = W * 0.52
    c.setFillColor(cGOLD)
    c.setFont("Mono", 7.6)
    c.drawString(rx, H - 120, "FOUR REASONS")
    c.setStrokeColor(cLINE)
    c.line(rx, H - 130, W - M, H - 130)

    reasons = [
        ("01", "Ownership, not connection",
         "Eight radiating spokes said 'connected to everything'. A closed octagonal cartouche says "
         "the opposite, and truthfully: the platform, the data and the model sit inside one perimeter."),
        ("02", "A seal reads as trust",
         "Regulated buyers recognise seals - certificates, stamps, signed documents. The engraved "
         "octagon borrows that visual grammar because every licence and audit run is cryptographically signed."),
        ("03", "It survives 16 pixels",
         "The old circle collapsed into noise as a Windows tray icon or favicon. The OQ monogram inside "
         "a straight-edged frame stays legible at installer, taskbar and favicon sizes."),
        ("04", "One mark, two products",
         "Cloud and Self-Hosted now share a single seal, separated only by context - never by a second logo."),
    ]
    yy = H - 152
    for num, title, body in reasons:
        c.setFillColor(cGOLD)
        c.setFont("Mono", 8.2)
        c.drawString(rx, yy, num)
        c.setFillColor(cBONE)
        c.setFont("Serif-Bold", 12.5)
        c.drawString(rx + 26, yy, title)
        yy = para(body, rx + 26, yy - 16, W - M - rx - 26, size=10, lead=13.6, col=cMUT)
        yy -= 12

    # ---------- PAGE 2 ----------
    c.showPage()
    page_frame("ANATOMY  ·  HOW THE SEAL IS BUILT", 2)

    c.setFillColor(cBONE)
    c.setFont("Serif", 26)
    c.drawString(M, H - 120, "Anatomy of the Sovereign Mark")
    c.setStrokeColor(cGOLD)
    c.setLineWidth(1.6)
    c.line(M, H - 136, M + 52, H - 136)

    big = 300
    bx, by = M, H - 470
    c.drawImage(str(plate_new), bx, by, big, big, mask=None)
    c.setStrokeColor(cLINE)
    c.setLineWidth(0.6)
    c.rect(bx, by, big, big, stroke=1, fill=0)

    notes = [
        ("Octagonal cartouche", "A closed perimeter. Eight sides for the eight modules that make up the workspace."),
        ("Inner gravure line", "A second, thinner frame - the engraving convention of certificates and banknotes."),
        ("Eight coronet nodes", "The only survivor of the old mark: the network is kept, but contained."),
        ("OQ monogram", "Garamond-class serif, optically centred, with a single engraved flick on the Q."),
        ("Gold on deep emerald", "#C9A24C on #04211A. One accent, one ground, no gradients in application."),
    ]
    nx = bx + big + 40
    yy = H - 176
    for i, (t, b) in enumerate(notes, start=1):
        c.setFillColor(cGOLD)
        c.setFont("Mono", 7.6)
        c.drawString(nx, yy, f"{i:02d}")
        c.setFillColor(cBONE)
        c.setFont("Sans-Med", 11)
        c.drawString(nx + 24, yy, t)
        yy = para(b, nx + 24, yy - 15, W * 0.30, size=10, lead=13.4, col=cMUT)
        yy -= 12

    # usage rules column
    ux = nx + W * 0.32
    c.setFillColor(cGOLD)
    c.setFont("Mono", 7.6)
    c.drawString(ux, H - 176, "USAGE")
    c.setStrokeColor(cLINE)
    c.line(ux, H - 186, W - M, H - 186)
    rules = [
        "Clear space: one full node radius on every side.",
        "Minimum size: 16 px for the seal, 96 px for the lockup.",
        "Gold seal on deep emerald or noir. Mono bone on gold.",
        "Never rotate, never re-colour, never place on photography.",
        "The wordmark may stand alone; the old hub mark is retired.",
    ]
    yy = H - 206
    for r in rules:
        c.setFillColor(cGOLD)
        c.circle(ux + 3, yy + 3.4, 1.7, stroke=0, fill=1)
        yy = para(r, ux + 14, yy, W - M - ux - 14, size=10, lead=13.4, col=cMUT)
        yy -= 7

    # closing line
    c.setFillColor(cBONE)
    c.setFont("Serif-It", 15)
    c.drawString(M, M + 62, "A mark should describe what the product now is - not what it used to be.")

    c.save()
    return path


if __name__ == "__main__":
    prof = build_profile(OUT / "OPSQAI-LinkedIn-Profile.png")
    ban = build_banner(OUT / "OPSQAI-LinkedIn-Banner.png")
    p_old = build_mark_plate(TMP / "mark-old.png", "old")
    p_new = build_mark_plate(TMP / "mark-new.png", "new")
    pdf = build_pdf(OUT / "OPSQAI-Logo-Transition.pdf", p_old, p_new)
    for f in (prof, ban, pdf):
        print("written:", f)

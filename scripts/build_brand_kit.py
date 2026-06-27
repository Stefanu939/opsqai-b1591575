"""Render the OPSQAI brand kit (favicons, PWA icons, OG, social) from the
canonical SVG marks in public/brand/."""
import os, io, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont

RSVG = shutil.which("rsvg-convert") or "/nix/store/fd4yyy6gn26378dadwcj0sf1y7x5n08a-librsvg-2.61.3/bin/rsvg-convert"

def _render(svg_path, w, h):
    out = subprocess.run([RSVG, "-w", str(w), "-h", str(h), "-f", "png", svg_path],
                         check=True, capture_output=True).stdout
    return out

class cairosvg:  # tiny shim so the rest of the script keeps reading cleanly
    @staticmethod
    def svg2png(url=None, output_width=None, output_height=None):
        return _render(url, output_width, output_height)


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "public", "brand")
PUBLIC = os.path.join(ROOT, "public")
ICONS = os.path.join(PUBLIC, "icons")
os.makedirs(BRAND, exist_ok=True); os.makedirs(ICONS, exist_ok=True)

NAVY   = (15, 23, 42, 255)     # #0F172A
INK    = (2, 6, 23, 255)       # #020617
BLUE   = (37, 99, 235, 255)    # #2563EB
TEAL   = (20, 184, 166, 255)
WHITE  = (248, 250, 252, 255)  # #F8FAFC

# ---------------------------------------------------------------------------
# Try to fetch Space Grotesk + Inter from Google for typography in social art
# (fail-soft: fall back to default if unavailable)
def load_font(family_files, size):
    import urllib.request
    cache = "/tmp/opsqai-fonts"; os.makedirs(cache, exist_ok=True)
    for url in family_files:
        name = url.rsplit("/", 1)[-1]
        path = os.path.join(cache, name)
        if not os.path.exists(path):
            try:
                urllib.request.urlretrieve(url, path)
            except Exception:
                continue
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()

SG_URLS = [
    "https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
]
INTER_URLS = [
    "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.otf",
]

def sg(size): return load_font(SG_URLS, size)
def inter(size): return load_font(INTER_URLS, size)

# ---------------------------------------------------------------------------
def svg_to_png(svg_path, out_path, w, h, bg=None):
    png = cairosvg.svg2png(url=svg_path, output_width=w, output_height=h)
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    if bg is not None:
        bg_img = Image.new("RGBA", (w, h), bg)
        bg_img.alpha_composite(img); img = bg_img
    img.save(out_path); return img

# Favicons / app icons / PWA — use the dark-tile favicon.svg already on disk
fav_svg = os.path.join(PUBLIC, "favicon.svg")
mark_svg = os.path.join(BRAND, "logo-mark.svg")

# .ico (multi-size) — render dark tile (so it works on any browser chrome)
sizes_ico = [16, 32, 48, 64]
ico_imgs = [Image.open(io.BytesIO(cairosvg.svg2png(url=fav_svg, output_width=s, output_height=s))).convert("RGBA") for s in sizes_ico]
ico_imgs[0].save(os.path.join(PUBLIC, "favicon.ico"), format="ICO", sizes=[(s, s) for s in sizes_ico])

# PNG favicons
for s in (32, 192, 512):
    svg_to_png(fav_svg, os.path.join(ICONS, f"icon-{s}.png"), s, s)

# Apple touch icon — 180 dark tile
svg_to_png(fav_svg, os.path.join(ICONS, "apple-touch-icon.png"), 180, 180)

# Maskable PWA icon — full-bleed navy with mark inset to safe zone (80% inner)
def maskable(size, out):
    img = Image.new("RGBA", (size, size), NAVY)
    inset = int(size * 0.18)
    mark = Image.open(io.BytesIO(cairosvg.svg2png(
        url=os.path.join(BRAND, "logo-mark.svg"),
        output_width=size - inset*2, output_height=size - inset*2
    ))).convert("RGBA")
    # invert ring strokes to white for visibility on navy
    px = mark.load()
    for y in range(mark.height):
        for x in range(mark.width):
            r,g,b,a = px[x,y]
            if a > 0 and (r,g,b) != BLUE[:3]:
                px[x,y] = (*WHITE[:3], a)
    img.alpha_composite(mark, (inset, inset))
    img.save(out)
maskable(512, os.path.join(ICONS, "icon-512-maskable.png"))
maskable(192, os.path.join(ICONS, "icon-192-maskable.png"))

# ---------------------------------------------------------------------------
# Social + OG composer
def gradient_bg(w, h, top=NAVY, bot=INK):
    img = Image.new("RGB", (w, h), top[:3])
    px = img.load()
    for y in range(h):
        t = y / max(1, h-1)
        px_color = tuple(int(top[i]*(1-t) + bot[i]*t) for i in range(3))
        for x in range(w):
            px[x, y] = px_color
    return img.convert("RGBA")

def composed(w, h, mark_size, mark_pos, wordmark_size, wordmark_pos,
             title=None, title_size=64, title_pos=None, subtitle=None,
             sub_size=28, sub_pos=None, out=None, accent_glow=True):
    bg = gradient_bg(w, h)
    if accent_glow:
        # subtle radial glow top-right with electric blue
        glow = Image.new("RGBA", (w, h), (0,0,0,0))
        gd = ImageDraw.Draw(glow)
        for r in range(int(w*0.5), 0, -20):
            alpha = int(60 * (1 - r/(w*0.5)))
            gd.ellipse([w*0.7 - r, -r*0.4, w*0.7 + r, -r*0.4 + r*2], fill=(*BLUE[:3], max(0, alpha//6)))
        bg.alpha_composite(glow)
    # Mark
    mark_png = cairosvg.svg2png(url=fav_svg, output_width=mark_size, output_height=mark_size)
    mark_img = Image.open(io.BytesIO(mark_png)).convert("RGBA")
    bg.alpha_composite(mark_img, mark_pos)
    d = ImageDraw.Draw(bg)
    if wordmark_size:
        d.text(wordmark_pos, "OPSQAI", font=sg(wordmark_size), fill=WHITE)
    if title:
        d.text(title_pos, title, font=sg(title_size), fill=WHITE)
    if subtitle:
        d.text(sub_pos, subtitle, font=inter(sub_size), fill=(203, 213, 225, 255))
    bg.convert("RGB").save(out, quality=92)
    return bg

# OG image — 1200x630
composed(
    1200, 630,
    mark_size=140, mark_pos=(80, 80),
    wordmark_size=64, wordmark_pos=(240, 110),
    title="Operational Knowledge Intelligence",
    title_size=56, title_pos=(80, 290),
    subtitle="Instant access to company knowledge — for warehouses, logistics & supply chain.",
    sub_size=26, sub_pos=(80, 380),
    out=os.path.join(PUBLIC, "og-image.jpg"),
)

# Social kit
SOC = os.path.join(BRAND, "social"); os.makedirs(SOC, exist_ok=True)

# LinkedIn / IG / FB profile 400x400 & 1080x1080
for size, name in [(400, "linkedin-profile-400.png"), (1080, "instagram-profile-1080.png"),
                   (1024, "app-store-icon-1024.png"), (512, "google-play-icon-512.png"),
                   (1000, "product-hunt-1000.png"), (460, "github-org-460.png")]:
    img = Image.new("RGBA", (size, size), NAVY)
    inset = int(size * 0.18)
    mark = Image.open(io.BytesIO(cairosvg.svg2png(
        url=mark_svg, output_width=size - inset*2, output_height=size - inset*2
    ))).convert("RGBA")
    px = mark.load()
    for y in range(mark.height):
        for x in range(mark.width):
            r,g,b,a = px[x,y]
            if a > 0 and (r,g,b) != BLUE[:3]:
                px[x,y] = (*WHITE[:3], a)
    img.alpha_composite(mark, (inset, inset))
    img.convert("RGB").save(os.path.join(SOC, name), quality=92)

# Banners
banners = [
    ("linkedin-banner-1584x396.png", 1584, 396, "Operational Knowledge Intelligence", "AI knowledge for warehouse & logistics teams."),
    ("linkedin-cover-1128x191.png",  1128, 191, "OPSQAI", "Instant access to company knowledge."),
    ("x-banner-1500x500.png",        1500, 500, "Operational Knowledge Intelligence", "AI knowledge platform for logistics & supply chain."),
    ("facebook-cover-1640x624.png",  1640, 624, "Operational Knowledge Intelligence", "Instant access to company knowledge."),
    ("youtube-banner-2560x1440.png", 2560, 1440,"Operational Knowledge Intelligence", "Enterprise AI for warehouse & logistics teams."),
    ("instagram-story-1080x1920.png",1080, 1920,"Operational",                         "Knowledge\nIntelligence"),
    ("instagram-post-1080x1080.png", 1080, 1080,"Operational",                         "Knowledge Intelligence"),
]
for fname, w, h, title, sub in banners:
    mark_size = int(min(w, h) * 0.18)
    composed(
        w, h,
        mark_size=mark_size, mark_pos=(int(w*0.06), int(h*0.5 - mark_size/2)),
        wordmark_size=int(mark_size * 0.45), wordmark_pos=(int(w*0.06) + mark_size + 18, int(h*0.5 - mark_size*0.22)),
        title=title, title_size=int(h*0.10),
        title_pos=(int(w*0.06), int(h*0.62)),
        subtitle=sub, sub_size=int(h*0.05),
        sub_pos=(int(w*0.06), int(h*0.62) + int(h*0.13)),
        out=os.path.join(SOC, fname),
    )

print("Brand kit rendered:")
for root, _, files in os.walk(BRAND):
    for f in sorted(files):
        p = os.path.join(root, f)
        print(f"  {os.path.relpath(p, ROOT)}  ({os.path.getsize(p)//1024} KB)")

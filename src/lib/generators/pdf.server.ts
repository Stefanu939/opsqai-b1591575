// Server-only: premium executive PDF generator.
// Same API as before — only the visual presentation is elevated.
// Refinements: editorial cover, refined type hierarchy, premium KPI cards,
// chip-tagged callouts, horizontal-rule tables, elegant section dividers,
// page-number footer chip, consistent whitespace.

export type PdfBlock =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | {
      type: "callout";
      kind?:
        | "recommendation"
        | "risk"
        | "opportunity"
        | "key-takeaway"
        | "best-practice"
        | "note"
        | "executive";
      title?: string;
      text: string;
    }
  | { type: "kpis"; items: Array<{ label: string; value: string; sub?: string }> }
  | { type: "divider" }
  | { type: "pagebreak" };

export interface PdfMeta {
  customerName?: string;
  workspaceName?: string;
  documentType?: string;
  version?: string;
  date?: string;
  confidentiality?: string;
  brand?: string;
  revision?: string;
}

export interface PdfSpec {
  title: string;
  subtitle?: string;
  author?: string;
  sections?: Array<{ heading?: string; paragraphs: string[] }>;
  blocks?: PdfBlock[];
  meta?: PdfMeta;
}

// WinAnsi-safe sanitization for pdf-lib StandardFonts.
function sanitize(text: string): string {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u2022\u25CF]/g, "*")
    .replace(/[^\t\n\x20-\xFF]/g, "");
}

export async function generatePdf(spec: PdfSpec): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(spec.title);
  if (spec.author) pdf.setAuthor(spec.author);
  pdf.setProducer("OPSQAI");
  pdf.setCreator("OPSQAI");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // A4
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 64;
  const MARGIN_TOP = 84;
  const MARGIN_BOTTOM = 78;
  const MAX_W = PAGE_W - MARGIN_X * 2;

  // Calm enterprise palette
  const INK = rgb(0.06, 0.09, 0.16);          // #0F1729
  const INK_SOFT = rgb(0.18, 0.22, 0.32);     // #2E3851
  const SUB = rgb(0.314, 0.376, 0.478);       // #50607A
  const MUTED = rgb(0.55, 0.60, 0.69);        // #8C99B0
  const BRAND = rgb(0.227, 0.357, 0.722);     // #3A5BB8
  const BRAND_SOFT = rgb(0.416, 0.510, 0.784);// #6A82C8
  const TEAL = rgb(0.122, 0.580, 0.522);      // #1F9485
  const AMBER = rgb(0.722, 0.525, 0.180);     // #B8862E
  const RED = rgb(0.725, 0.271, 0.271);       // #B94545
  const LINE = rgb(0.894, 0.906, 0.925);      // #E4E7EC
  const LINE_SOFT = rgb(0.945, 0.953, 0.965); // #F1F3F7
  const PANEL_BG = rgb(0.969, 0.973, 0.980);  // #F7F8FA
  const PANEL_DEEP = rgb(0.929, 0.941, 0.961);// #EDEFF4
  const WHITE = rgb(1, 1, 1);

  const meta: Required<PdfMeta> = {
    customerName: spec.meta?.customerName ?? "",
    workspaceName: spec.meta?.workspaceName ?? spec.meta?.customerName ?? "",
    documentType: spec.meta?.documentType ?? spec.title,
    version: spec.meta?.version ?? "1.0",
    date: spec.meta?.date ?? new Date().toISOString().slice(0, 10),
    confidentiality: spec.meta?.confidentiality ?? "Confidential - for the named recipient only",
    brand: spec.meta?.brand ?? "OPSQAI",
    revision: spec.meta?.revision ?? "R1",
  };

  const pages: any[] = [];

  function addContentPage() {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    drawRunningHeader(p);
    return { page: p, y: PAGE_H - MARGIN_TOP };
  }

  function drawRunningHeader(p: any) {
    // Brand mark with accent dot
    p.drawRectangle({ x: MARGIN_X, y: PAGE_H - 38, width: 3, height: 10, color: BRAND });
    p.drawText(sanitize(meta.brand), {
      x: MARGIN_X + 9, y: PAGE_H - 36, size: 9, font: bold, color: INK,
    });
    p.drawText(sanitize(meta.documentType), {
      x: MARGIN_X + 9 + bold.widthOfTextAtSize(sanitize(meta.brand), 9) + 8,
      y: PAGE_H - 36, size: 9, font: regular, color: MUTED,
    });
    if (meta.customerName) {
      const txt = sanitize(meta.customerName);
      const w = regular.widthOfTextAtSize(txt, 9);
      p.drawText(txt, { x: PAGE_W - MARGIN_X - w, y: PAGE_H - 36, size: 9, font: regular, color: SUB });
    }
    p.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 48 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 48 },
      thickness: 0.4, color: LINE,
    });
  }

  function drawFooter(p: any, pageNum: number, total: number) {
    p.drawLine({
      start: { x: MARGIN_X, y: 54 },
      end: { x: PAGE_W - MARGIN_X, y: 54 },
      thickness: 0.4, color: LINE,
    });
    const left = sanitize(meta.confidentiality);
    p.drawText(left, { x: MARGIN_X, y: 38, size: 8, font: italic, color: SUB });
    const mid = sanitize(`v${meta.version} · ${meta.date}`);
    const wMid = regular.widthOfTextAtSize(mid, 8);
    p.drawText(mid, { x: (PAGE_W - wMid) / 2, y: 38, size: 8, font: regular, color: SUB });
    // Page indicator chip
    const right = `${pageNum} / ${total}`;
    const wRight = bold.widthOfTextAtSize(right, 8);
    const chipW = wRight + 16;
    p.drawRectangle({ x: PAGE_W - MARGIN_X - chipW, y: 32, width: chipW, height: 16, color: PANEL_DEEP });
    p.drawText(right, { x: PAGE_W - MARGIN_X - chipW + 8, y: 38, size: 8, font: bold, color: INK_SOFT });
  }

  // -------- COVER PAGE --------
  const cover = pdf.addPage([PAGE_W, PAGE_H]);
  pages.push(cover);
  // Soft top accent band + brand rule
  cover.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: BRAND });
  cover.drawRectangle({ x: 0, y: PAGE_H - 12, width: PAGE_W, height: 4, color: BRAND_SOFT });
  // Side accent column
  cover.drawRectangle({ x: 0, y: 0, width: 6, height: PAGE_H - 12, color: PANEL_BG });

  // Brand mark
  cover.drawRectangle({ x: MARGIN_X, y: PAGE_H - 86, width: 4, height: 18, color: BRAND });
  cover.drawText(sanitize(meta.brand), { x: MARGIN_X + 12, y: PAGE_H - 82, size: 16, font: bold, color: INK });
  cover.drawText(sanitize("Enterprise Document"), {
    x: MARGIN_X + 12 + bold.widthOfTextAtSize(sanitize(meta.brand), 16) + 10,
    y: PAGE_H - 80, size: 10, font: regular, color: MUTED,
  });
  if (meta.customerName) {
    const w = regular.widthOfTextAtSize(sanitize(meta.customerName), 11);
    cover.drawText(sanitize("PREPARED FOR"), {
      x: PAGE_W - MARGIN_X - w, y: PAGE_H - 96, size: 7.5, font: bold, color: MUTED,
    });
    const cw = bold.widthOfTextAtSize(sanitize(meta.customerName), 11);
    cover.drawText(sanitize(meta.customerName), {
      x: PAGE_W - MARGIN_X - cw, y: PAGE_H - 80, size: 11, font: bold, color: INK,
    });
  }

  // Editorial eyebrow + title block (centered vertically-ish)
  {
    const eyebrow = sanitize(meta.documentType.toUpperCase());
    cover.drawText(eyebrow, {
      x: MARGIN_X, y: PAGE_H - 280, size: 10, font: bold, color: BRAND,
    });
    // Accent rule
    cover.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 296 },
      end: { x: MARGIN_X + 48, y: PAGE_H - 296 },
      thickness: 2.5, color: BRAND,
    });

    // Title (wrap)
    const size = 38;
    const words = sanitize(spec.title).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w;
      if (bold.widthOfTextAtSize(cand, size) <= MAX_W) line = cand;
      else { if (line) lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    let yy = PAGE_H - 340;
    for (const ln of lines) {
      cover.drawText(ln, { x: MARGIN_X, y: yy, size, font: bold, color: INK });
      yy -= size * 1.12;
    }
    if (spec.subtitle) {
      // Subtitle wrap
      const subLines = (() => {
        const out: string[] = [];
        const w = sanitize(spec.subtitle).split(/\s+/);
        let l = "";
        for (const wd of w) {
          const c = l ? `${l} ${wd}` : wd;
          if (italic.widthOfTextAtSize(c, 13) <= MAX_W - 20) l = c;
          else { if (l) out.push(l); l = wd; }
        }
        if (l) out.push(l);
        return out;
      })();
      yy -= 14;
      for (const sl of subLines) {
        cover.drawText(sl, { x: MARGIN_X, y: yy, size: 13, font: italic, color: SUB });
        yy -= 18;
      }
    }
  }

  // Metadata block (bottom, editorial)
  {
    const baseY = 200;
    cover.drawLine({
      start: { x: MARGIN_X, y: baseY + 108 },
      end: { x: PAGE_W - MARGIN_X, y: baseY + 108 },
      thickness: 0.6, color: LINE,
    });
    cover.drawText(sanitize("DOCUMENT DETAILS"), {
      x: MARGIN_X, y: baseY + 92, size: 8, font: bold, color: MUTED,
    });

    // Two-column metadata
    const rows: Array<[string, string]> = [
      ["Prepared for", meta.customerName || "-"],
      ["Workspace", meta.workspaceName || "-"],
      ["Document", `${meta.documentType} · ${meta.revision}`],
      ["Version", `v${meta.version}`],
      ["Date", meta.date],
    ];
    const colW = MAX_W / 2;
    const leftRows = rows.slice(0, 3);
    const rightRows = rows.slice(3);
    const drawCol = (items: Array<[string, string]>, x: number) => {
      let yy = baseY + 70;
      for (const [k, v] of items) {
        cover.drawText(sanitize(k.toUpperCase()), { x, y: yy, size: 7.5, font: bold, color: MUTED });
        cover.drawText(sanitize(v), { x, y: yy - 13, size: 10.5, font: bold, color: INK });
        yy -= 32;
      }
    };
    drawCol(leftRows, MARGIN_X);
    drawCol(rightRows, MARGIN_X + colW);

    // Confidentiality strip
    cover.drawRectangle({ x: MARGIN_X, y: 78, width: MAX_W, height: 36, color: PANEL_BG });
    cover.drawRectangle({ x: MARGIN_X, y: 78, width: 4, height: 36, color: AMBER });
    cover.drawText(sanitize("CONFIDENTIAL"), {
      x: MARGIN_X + 16, y: 100, size: 7.5, font: bold, color: AMBER,
    });
    cover.drawText(sanitize(meta.confidentiality), {
      x: MARGIN_X + 16, y: 86, size: 9, font: italic, color: SUB,
    });
  }

  // -------- BLOCK NORMALIZATION --------
  let blocks: PdfBlock[] = [];
  if (spec.blocks && spec.blocks.length) {
    blocks = spec.blocks;
  } else if (spec.sections && spec.sections.length) {
    for (const sec of spec.sections) {
      if (sec.heading) blocks.push({ type: "h1", text: sec.heading });
      for (const p of sec.paragraphs) blocks.push({ type: "p", text: p });
    }
  }

  // -------- TABLE OF CONTENTS --------
  const tocEntries = blocks
    .map((b, i) => (b.type === "h1" || b.type === "h2" ? { i, level: b.type, text: b.text } : null))
    .filter(Boolean) as Array<{ i: number; level: "h1" | "h2"; text: string }>;

  let ctx = addContentPage();
  let h1Counter = 0;
  if (tocEntries.length >= 2) {
    // Eyebrow
    ctx.page.drawText("CONTENTS", { x: MARGIN_X, y: ctx.y, size: 9, font: bold, color: BRAND });
    ctx.y -= 22;
    ctx.page.drawText("Table of Contents", { x: MARGIN_X, y: ctx.y, size: 24, font: bold, color: INK });
    ctx.y -= 14;
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y }, end: { x: MARGIN_X + 56, y: ctx.y },
      thickness: 2.5, color: BRAND,
    });
    ctx.y -= 28;
    let n = 0;
    for (const e of tocEntries) {
      if (ctx.y < MARGIN_BOTTOM + 24) ctx = addContentPage();
      const isH1 = e.level === "h1";
      if (isH1) n++;
      const num = isH1 ? String(n).padStart(2, "0") : "";
      const indent = isH1 ? 0 : 32;
      const label = sanitize(e.text);
      const size = isH1 ? 11.5 : 10;
      if (isH1) {
        ctx.page.drawText(num, { x: MARGIN_X, y: ctx.y, size: 10, font: bold, color: BRAND });
        ctx.page.drawText(label, { x: MARGIN_X + 24, y: ctx.y, size, font: bold, color: INK });
      } else {
        ctx.page.drawText(label, { x: MARGIN_X + indent, y: ctx.y, size, font: regular, color: SUB });
      }
      ctx.y -= isH1 ? 22 : 17;
    }
    ctx = addContentPage();
  }

  // -------- DRAWING PRIMITIVES --------
  const wrap = (text: string, font: any, size: number, width = MAX_W): string[] => {
    const out: string[] = [];
    for (const para of sanitize(text).split("\n")) {
      const words = para.split(/\s+/);
      let line = "";
      for (const w of words) {
        const cand = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(cand, size) <= width) line = cand;
        else { if (line) out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  };

  const ensure = (need: number) => {
    if (ctx.y - need < MARGIN_BOTTOM + 8) ctx = addContentPage();
  };

  const drawParagraph = (text: string, opts: { font?: any; size?: number; color?: any; gap?: number; x?: number; width?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10.5;
    const color = opts.color ?? INK_SOFT;
    const x = opts.x ?? MARGIN_X;
    const width = opts.width ?? MAX_W;
    const lines = wrap(text, font, size, width);
    for (const ln of lines) {
      ensure(size * 1.55);
      ctx.page.drawText(ln, { x, y: ctx.y, size, font, color });
      ctx.y -= size * 1.5;
    }
    ctx.y -= opts.gap ?? 6;
  };

  const drawHeading = (text: string, level: 1 | 2 | 3) => {
    if (level === 1) {
      h1Counter++;
      ensure(80);
      ctx.y -= 10;
      // Eyebrow: section number
      const num = `SECTION ${String(h1Counter).padStart(2, "0")}`;
      ctx.page.drawText(num, { x: MARGIN_X, y: ctx.y, size: 8, font: bold, color: BRAND });
      ctx.y -= 20;
      // Title
      ctx.page.drawText(sanitize(text), { x: MARGIN_X, y: ctx.y, size: 22, font: bold, color: INK });
      ctx.y -= 18;
      // Accent rule
      ctx.page.drawLine({
        start: { x: MARGIN_X, y: ctx.y }, end: { x: MARGIN_X + 40, y: ctx.y },
        thickness: 2.5, color: BRAND,
      });
      ctx.y -= 22;
    } else if (level === 2) {
      ensure(40);
      ctx.y -= 4;
      // Vertical accent bar
      ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - 4, width: 3, height: 16, color: BRAND_SOFT });
      ctx.page.drawText(sanitize(text), { x: MARGIN_X + 12, y: ctx.y, size: 14, font: bold, color: INK });
      ctx.y -= 22;
    } else {
      ensure(28);
      ctx.page.drawText(sanitize(text), { x: MARGIN_X, y: ctx.y, size: 11, font: bold, color: INK_SOFT });
      ctx.y -= 16;
    }
  };

  const calloutTheme = (kind?: string) => {
    switch (kind) {
      case "recommendation": return { bar: BRAND, tag: "RECOMMENDATION", icon: "→" };
      case "risk": return { bar: RED, tag: "RISK", icon: "!" };
      case "opportunity": return { bar: TEAL, tag: "OPPORTUNITY", icon: "+" };
      case "key-takeaway": return { bar: BRAND_SOFT, tag: "KEY TAKEAWAY", icon: "*" };
      case "best-practice": return { bar: TEAL, tag: "BEST PRACTICE", icon: "*" };
      case "executive": return { bar: INK, tag: "EXECUTIVE NOTE", icon: "*" };
      default: return { bar: SUB, tag: "NOTE", icon: "i" };
    }
  };

  const drawCallout = (b: Extract<PdfBlock, { type: "callout" }>) => {
    const theme = calloutTheme(b.kind);
    const innerW = MAX_W - 36;
    const lines = wrap(b.text, regular, 10.5, innerW);
    const titleH = b.title ? 20 : 0;
    const tagH = 18;
    const padTop = 16;
    const padBottom = 16;
    const h = padTop + tagH + titleH + lines.length * 15 + padBottom;
    ensure(h + 12);
    // Background panel
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: MAX_W, height: h, color: PANEL_BG });
    // Thick left bar
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: 4, height: h, color: theme.bar });
    let yy = ctx.y - padTop;
    // Tag chip (filled)
    const tagText = theme.tag;
    const tagW = bold.widthOfTextAtSize(tagText, 7.5) + 14;
    ctx.page.drawRectangle({ x: MARGIN_X + 18, y: yy - 4, width: tagW, height: 13, color: theme.bar });
    ctx.page.drawText(tagText, { x: MARGIN_X + 25, y: yy - 1, size: 7.5, font: bold, color: WHITE });
    yy -= tagH;
    if (b.title) {
      ctx.page.drawText(sanitize(b.title), { x: MARGIN_X + 18, y: yy, size: 12, font: bold, color: INK });
      yy -= titleH;
    }
    for (const ln of lines) {
      ctx.page.drawText(ln, { x: MARGIN_X + 18, y: yy, size: 10.5, font: regular, color: INK_SOFT });
      yy -= 15;
    }
    ctx.y -= h + 14;
  };

  const drawKpis = (items: Array<{ label: string; value: string; sub?: string }>) => {
    if (!items.length) return;
    const n = Math.min(items.length, 4);
    const gap = 12;
    const cardW = (MAX_W - gap * (n - 1)) / n;
    const cardH = 92;
    ensure(cardH + 16);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const x = MARGIN_X + i * (cardW + gap);
      // Card background
      ctx.page.drawRectangle({ x, y: ctx.y - cardH, width: cardW, height: cardH, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
      // Top accent bar
      ctx.page.drawRectangle({ x, y: ctx.y - 4, width: cardW, height: 4, color: BRAND });
      // Label (tracked)
      const label = sanitize(it.label.toUpperCase());
      ctx.page.drawText(label, { x: x + 14, y: ctx.y - 24, size: 7.5, font: bold, color: MUTED });
      // Value
      const value = sanitize(it.value);
      // Auto-fit value
      let vSize = 22;
      while (vSize > 13 && bold.widthOfTextAtSize(value, vSize) > cardW - 28) vSize -= 1;
      ctx.page.drawText(value, { x: x + 14, y: ctx.y - 24 - vSize - 4, size: vSize, font: bold, color: INK });
      // Inner divider
      ctx.page.drawLine({
        start: { x: x + 14, y: ctx.y - cardH + 22 },
        end: { x: x + cardW - 14, y: ctx.y - cardH + 22 },
        thickness: 0.5, color: LINE_SOFT,
      });
      if (it.sub) {
        const subLines = wrap(it.sub, regular, 8, cardW - 28);
        const sub = subLines[0] + (subLines.length > 1 ? "..." : "");
        ctx.page.drawText(sanitize(sub), { x: x + 14, y: ctx.y - cardH + 10, size: 8, font: regular, color: SUB });
      }
    }
    ctx.y -= cardH + 16;
  };

  const drawTable = (headers: string[], rows: string[][]) => {
    const cols = headers.length || (rows[0]?.length ?? 1);
    const colW = MAX_W / cols;
    const cellPad = 9;
    const rowH = (cells: string[], size = 9.5) => {
      let max = 1;
      for (const c of cells) {
        const lines = wrap(c ?? "", regular, size, colW - cellPad * 2).length;
        if (lines > max) max = lines;
      }
      return Math.max(26, max * 13 + cellPad * 2);
    };
    const headerH = rowH(headers, 9);
    ensure(headerH + 12);
    // Header background
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - headerH, width: MAX_W, height: headerH, color: PANEL_DEEP });
    for (let i = 0; i < cols; i++) {
      ctx.page.drawText(sanitize((headers[i] ?? "").toUpperCase()), {
        x: MARGIN_X + i * colW + cellPad, y: ctx.y - cellPad - 10,
        size: 8.5, font: bold, color: INK,
      });
    }
    // Brand underline below header
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y - headerH },
      end: { x: MARGIN_X + MAX_W, y: ctx.y - headerH },
      thickness: 1.4, color: BRAND,
    });
    ctx.y -= headerH;
    // Body — no vertical lines, only soft horizontal separators
    rows.forEach((r, idx) => {
      const h = rowH(r);
      ensure(h + 4);
      if (idx % 2 === 1) {
        ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: MAX_W, height: h, color: PANEL_BG });
      }
      for (let i = 0; i < cols; i++) {
        const cellLines = wrap(r[i] ?? "", regular, 9.5, colW - cellPad * 2);
        let yy = ctx.y - cellPad - 10;
        for (const ln of cellLines) {
          ctx.page.drawText(ln, { x: MARGIN_X + i * colW + cellPad, y: yy, size: 9.5, font: i === 0 ? bold : regular, color: i === 0 ? INK : INK_SOFT });
          yy -= 13;
        }
      }
      ctx.page.drawLine({
        start: { x: MARGIN_X, y: ctx.y - h },
        end: { x: MARGIN_X + MAX_W, y: ctx.y - h },
        thickness: 0.4, color: LINE_SOFT,
      });
      ctx.y -= h;
    });
    // Closing rule
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y + 0.5 },
      end: { x: MARGIN_X + MAX_W, y: ctx.y + 0.5 },
      thickness: 0.6, color: LINE,
    });
    ctx.y -= 14;
  };

  const drawDivider = () => {
    ensure(28);
    const cx = MARGIN_X + MAX_W / 2;
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y - 6 },
      end: { x: cx - 14, y: ctx.y - 6 },
      thickness: 0.4, color: LINE,
    });
    // Brand accent dot
    ctx.page.drawCircle({ x: cx, y: ctx.y - 6, size: 2.5, color: BRAND });
    ctx.page.drawLine({
      start: { x: cx + 14, y: ctx.y - 6 },
      end: { x: MARGIN_X + MAX_W, y: ctx.y - 6 },
      thickness: 0.4, color: LINE,
    });
    ctx.y -= 22;
  };

  // -------- RENDER --------
  for (const b of blocks) {
    if (b.type === "h1") drawHeading(b.text, 1);
    else if (b.type === "h2") drawHeading(b.text, 2);
    else if (b.type === "h3") drawHeading(b.text, 3);
    else if (b.type === "p") drawParagraph(b.text, { gap: 8 });
    else if (b.type === "bullets") {
      for (const it of b.items) {
        const lines = wrap(it, regular, 10.5, MAX_W - 22);
        ensure(lines.length * 15 + 4);
        // Square marker
        ctx.page.drawRectangle({ x: MARGIN_X + 2, y: ctx.y + 2, width: 4, height: 4, color: BRAND });
        let yy = ctx.y;
        for (const ln of lines) {
          ctx.page.drawText(ln, { x: MARGIN_X + 18, y: yy, size: 10.5, font: regular, color: INK_SOFT });
          yy -= 15;
        }
        ctx.y = yy - 2;
      }
      ctx.y -= 6;
    } else if (b.type === "numbered") {
      b.items.forEach((it, i) => {
        const lines = wrap(it, regular, 10.5, MAX_W - 28);
        ensure(lines.length * 15 + 6);
        // Number chip
        const num = `${i + 1}`;
        const chipW = 18;
        ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - 2, width: chipW, height: 16, color: PANEL_DEEP });
        const nw = bold.widthOfTextAtSize(num, 9);
        ctx.page.drawText(num, { x: MARGIN_X + (chipW - nw) / 2, y: ctx.y + 2, size: 9, font: bold, color: BRAND });
        let yy = ctx.y;
        for (const ln of lines) {
          ctx.page.drawText(ln, { x: MARGIN_X + chipW + 10, y: yy, size: 10.5, font: regular, color: INK_SOFT });
          yy -= 15;
        }
        ctx.y = yy - 4;
      });
      ctx.y -= 6;
    } else if (b.type === "table") {
      drawTable(b.headers, b.rows);
    } else if (b.type === "callout") {
      drawCallout(b);
    } else if (b.type === "kpis") {
      drawKpis(b.items);
    } else if (b.type === "divider") {
      drawDivider();
    } else if (b.type === "pagebreak") {
      ctx = addContentPage();
    }
  }

  // -------- FINAL FOOTER PASS --------
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    if (i === 0) {
      const p = pages[i];
      p.drawText(sanitize(`${meta.brand} · ${meta.date}`), {
        x: MARGIN_X, y: 38, size: 8, font: regular, color: SUB,
      });
      const right = `Page ${i + 1} of ${total}`;
      const w = regular.widthOfTextAtSize(right, 8);
      p.drawText(right, { x: PAGE_W - MARGIN_X - w, y: 38, size: 8, font: regular, color: SUB });
      continue;
    }
    drawFooter(pages[i], i + 1, total);
  }

  return await pdf.save();
}

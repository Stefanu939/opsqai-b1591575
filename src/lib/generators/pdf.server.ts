// Server-only: premium enterprise PDF generator.
// Builds: cover page, running header/footer with page numbers,
// auto Table of Contents, KPI cards, callout panels, banded tables.
// API stays backward compatible — `sections` is still accepted; richer
// callers may pass `blocks` instead for full layout control.

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
  // Legacy: simple section/paragraph list.
  sections?: Array<{ heading?: string; paragraphs: string[] }>;
  // New: structured blocks (preferred).
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
  const MARGIN_X = 56;
  const MARGIN_TOP = 72;
  const MARGIN_BOTTOM = 72;
  const MAX_W = PAGE_W - MARGIN_X * 2;

  // Calm enterprise palette (matches UI v4 — Linear/Notion feel)
  const INK = rgb(0.06, 0.09, 0.16);          // #0F1729
  const SUB = rgb(0.314, 0.376, 0.478);       // #50607A
  const BRAND = rgb(0.227, 0.357, 0.722);     // #3A5BB8
  const BRAND_SOFT = rgb(0.416, 0.510, 0.784);// #6A82C8
  const TEAL = rgb(0.122, 0.580, 0.522);      // #1F9485
  const AMBER = rgb(0.722, 0.525, 0.180);     // #B8862E
  const RED = rgb(0.725, 0.271, 0.271);       // #B94545
  const LINE = rgb(0.894, 0.906, 0.925);      // #E4E7EC
  const PANEL_BG = rgb(0.969, 0.973, 0.980);  // #F7F8FA
  const WHITE = rgb(1, 1, 1);

  const meta: Required<PdfMeta> = {
    customerName: spec.meta?.customerName ?? "",
    workspaceName: spec.meta?.workspaceName ?? spec.meta?.customerName ?? "",
    documentType: spec.meta?.documentType ?? spec.title,
    version: spec.meta?.version ?? "1.0",
    date: spec.meta?.date ?? new Date().toISOString().slice(0, 10),
    confidentiality: spec.meta?.confidentiality ?? "Confidential — for the named recipient only",
    brand: spec.meta?.brand ?? "OPSQAI",
    revision: spec.meta?.revision ?? "R1",
  };

  type PageRef = InstanceType<typeof pdf.addPage extends (...a: any) => infer R ? any : never>;
  // We collect page handles so we can draw footers at the very end with total count.
  const pages: any[] = [];

  function addContentPage() {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    drawRunningHeader(p);
    return { page: p, y: PAGE_H - MARGIN_TOP };
  }

  function drawRunningHeader(p: any) {
    // Brand strip top-left, customer top-right, thin underline.
    p.drawText(sanitize(meta.brand), {
      x: MARGIN_X, y: PAGE_H - 36, size: 9, font: bold, color: BRAND,
    });
    if (meta.customerName) {
      const txt = sanitize(meta.customerName);
      const w = regular.widthOfTextAtSize(txt, 9);
      p.drawText(txt, { x: PAGE_W - MARGIN_X - w, y: PAGE_H - 36, size: 9, font: regular, color: SUB });
    }
    p.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 44 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 44 },
      thickness: 0.5, color: LINE,
    });
  }

  function drawFooter(p: any, pageNum: number, total: number) {
    p.drawLine({
      start: { x: MARGIN_X, y: 52 },
      end: { x: PAGE_W - MARGIN_X, y: 52 },
      thickness: 0.5, color: LINE,
    });
    const left = sanitize(meta.confidentiality);
    p.drawText(left, { x: MARGIN_X, y: 38, size: 8, font: italic, color: SUB });
    const mid = sanitize(`${meta.documentType} · v${meta.version} · ${meta.date}`);
    const wMid = regular.widthOfTextAtSize(mid, 8);
    p.drawText(mid, { x: (PAGE_W - wMid) / 2, y: 38, size: 8, font: regular, color: SUB });
    const right = `${pageNum} / ${total}`;
    const wRight = bold.widthOfTextAtSize(right, 8);
    p.drawText(right, { x: PAGE_W - MARGIN_X - wRight, y: 38, size: 8, font: bold, color: SUB });
  }

  // -------- COVER PAGE --------
  const cover = pdf.addPage([PAGE_W, PAGE_H]);
  pages.push(cover);
  // Soft accent header band
  cover.drawRectangle({ x: 0, y: PAGE_H - 220, width: PAGE_W, height: 220, color: PANEL_BG });
  cover.drawRectangle({ x: 0, y: PAGE_H - 224, width: PAGE_W, height: 4, color: BRAND });
  // Logo placeholders (text marks)
  cover.drawText(sanitize(meta.brand), { x: MARGIN_X, y: PAGE_H - 80, size: 14, font: bold, color: BRAND });
  if (meta.customerName) {
    const w = bold.widthOfTextAtSize(sanitize(meta.customerName), 12);
    cover.drawText(sanitize(meta.customerName), {
      x: PAGE_W - MARGIN_X - w, y: PAGE_H - 80, size: 12, font: bold, color: INK,
    });
  }
  // Document type chip
  cover.drawText(sanitize(meta.documentType.toUpperCase()), {
    x: MARGIN_X, y: PAGE_H - 320, size: 10, font: bold, color: BRAND_SOFT,
  });
  // Title (wrap)
  {
    const size = 34;
    const words = sanitize(spec.title).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w;
      if (bold.widthOfTextAtSize(cand, size) <= MAX_W) line = cand;
      else { if (line) lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    let yy = PAGE_H - 360;
    for (const ln of lines) {
      cover.drawText(ln, { x: MARGIN_X, y: yy, size, font: bold, color: INK });
      yy -= size * 1.15;
    }
    if (spec.subtitle) {
      cover.drawText(sanitize(spec.subtitle), {
        x: MARGIN_X, y: yy - 8, size: 13, font: italic, color: SUB,
      });
    }
  }
  // Metadata block (bottom)
  {
    const baseY = 180;
    cover.drawLine({
      start: { x: MARGIN_X, y: baseY + 90 },
      end: { x: PAGE_W - MARGIN_X, y: baseY + 90 },
      thickness: 0.5, color: LINE,
    });
    const rows: Array<[string, string]> = [
      ["Prepared for", meta.customerName || "—"],
      ["Workspace", meta.workspaceName || "—"],
      ["Document", `${meta.documentType} · ${meta.revision}`],
      ["Version", `v${meta.version}`],
      ["Date", meta.date],
    ];
    let yy = baseY + 70;
    for (const [k, v] of rows) {
      cover.drawText(sanitize(k.toUpperCase()), { x: MARGIN_X, y: yy, size: 8, font: bold, color: SUB });
      cover.drawText(sanitize(v), { x: MARGIN_X + 110, y: yy, size: 10, font: regular, color: INK });
      yy -= 16;
    }
    // Confidentiality strip
    cover.drawRectangle({ x: MARGIN_X, y: 70, width: MAX_W, height: 32, color: PANEL_BG });
    cover.drawRectangle({ x: MARGIN_X, y: 70, width: 3, height: 32, color: AMBER });
    cover.drawText(sanitize(meta.confidentiality), {
      x: MARGIN_X + 14, y: 84, size: 9, font: italic, color: SUB,
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
  if (tocEntries.length >= 2) {
    ctx.page.drawText("Table of Contents", { x: MARGIN_X, y: ctx.y, size: 20, font: bold, color: INK });
    ctx.y -= 12;
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y }, end: { x: MARGIN_X + 48, y: ctx.y },
      thickness: 2, color: BRAND,
    });
    ctx.y -= 24;
    // We don't know final page numbers yet for TOC entries — render with dot leaders
    // and resolve numbers after layout via a placeholder pass.
    // (Pragmatic: render entries without page numbers; reserves space.)
    for (const e of tocEntries) {
      if (ctx.y < MARGIN_BOTTOM + 24) ctx = addContentPage();
      const indent = e.level === "h2" ? 18 : 0;
      const label = sanitize(e.text);
      ctx.page.drawText(label, {
        x: MARGIN_X + indent, y: ctx.y, size: e.level === "h1" ? 11 : 10,
        font: e.level === "h1" ? bold : regular, color: e.level === "h1" ? INK : SUB,
      });
      ctx.y -= 18;
    }
    // Force page break after TOC
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
    const color = opts.color ?? INK;
    const x = opts.x ?? MARGIN_X;
    const width = opts.width ?? MAX_W;
    const lines = wrap(text, font, size, width);
    for (const ln of lines) {
      ensure(size * 1.5);
      ctx.page.drawText(ln, { x, y: ctx.y, size, font, color });
      ctx.y -= size * 1.45;
    }
    ctx.y -= opts.gap ?? 4;
  };

  const drawHeading = (text: string, level: 1 | 2 | 3) => {
    const sizes = { 1: 20, 2: 14, 3: 11.5 } as const;
    const gaps = { 1: 8, 2: 6, 3: 4 } as const;
    const size = sizes[level];
    ensure(size * 2 + 14);
    if (level === 1) ctx.y -= 8; // breathing room above H1
    ctx.page.drawText(sanitize(text), { x: MARGIN_X, y: ctx.y, size, font: bold, color: INK });
    ctx.y -= size + gaps[level];
    if (level === 1) {
      ctx.page.drawLine({
        start: { x: MARGIN_X, y: ctx.y + 4 }, end: { x: MARGIN_X + 36, y: ctx.y + 4 },
        thickness: 2, color: BRAND,
      });
      ctx.y -= 8;
    }
  };

  const calloutTheme = (kind?: string) => {
    switch (kind) {
      case "recommendation": return { bar: BRAND, tag: "RECOMMENDATION" };
      case "risk": return { bar: RED, tag: "RISK" };
      case "opportunity": return { bar: TEAL, tag: "OPPORTUNITY" };
      case "key-takeaway": return { bar: BRAND_SOFT, tag: "KEY TAKEAWAY" };
      case "best-practice": return { bar: TEAL, tag: "BEST PRACTICE" };
      case "executive": return { bar: INK, tag: "EXECUTIVE NOTE" };
      default: return { bar: SUB, tag: "NOTE" };
    }
  };

  const drawCallout = (b: Extract<PdfBlock, { type: "callout" }>) => {
    const theme = calloutTheme(b.kind);
    const innerW = MAX_W - 24;
    const lines = wrap(b.text, regular, 10, innerW);
    const titleH = b.title ? 16 : 0;
    const tagH = 14;
    const h = 14 + tagH + titleH + lines.length * 14 + 12;
    ensure(h + 8);
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: MAX_W, height: h, color: PANEL_BG });
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: 3, height: h, color: theme.bar });
    let yy = ctx.y - 16;
    ctx.page.drawText(theme.tag, { x: MARGIN_X + 14, y: yy, size: 8, font: bold, color: theme.bar });
    yy -= tagH;
    if (b.title) {
      ctx.page.drawText(sanitize(b.title), { x: MARGIN_X + 14, y: yy, size: 11, font: bold, color: INK });
      yy -= titleH;
    }
    for (const ln of lines) {
      ctx.page.drawText(ln, { x: MARGIN_X + 14, y: yy, size: 10, font: regular, color: INK });
      yy -= 14;
    }
    ctx.y -= h + 10;
  };

  const drawKpis = (items: Array<{ label: string; value: string; sub?: string }>) => {
    if (!items.length) return;
    const n = Math.min(items.length, 4);
    const gap = 12;
    const cardW = (MAX_W - gap * (n - 1)) / n;
    const cardH = 78;
    ensure(cardH + 12);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const x = MARGIN_X + i * (cardW + gap);
      ctx.page.drawRectangle({ x, y: ctx.y - cardH, width: cardW, height: cardH, color: WHITE, borderColor: LINE, borderWidth: 0.75 });
      ctx.page.drawRectangle({ x, y: ctx.y - cardH, width: cardW, height: 3, color: BRAND });
      ctx.page.drawText(sanitize(it.label.toUpperCase()), { x: x + 12, y: ctx.y - 20, size: 8, font: bold, color: SUB });
      ctx.page.drawText(sanitize(it.value), { x: x + 12, y: ctx.y - 44, size: 18, font: bold, color: INK });
      if (it.sub) {
        ctx.page.drawText(sanitize(it.sub), { x: x + 12, y: ctx.y - 62, size: 8, font: regular, color: SUB });
      }
    }
    ctx.y -= cardH + 14;
  };

  const drawTable = (headers: string[], rows: string[][]) => {
    const cols = headers.length || (rows[0]?.length ?? 1);
    const colW = MAX_W / cols;
    const cellPad = 6;
    const rowH = (cells: string[]) => {
      let max = 1;
      for (const c of cells) {
        const lines = wrap(c ?? "", regular, 9, colW - cellPad * 2).length;
        if (lines > max) max = lines;
      }
      return Math.max(20, max * 12 + cellPad * 2);
    };
    const headerH = rowH(headers);
    ensure(headerH + 8);
    // Header
    ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - headerH, width: MAX_W, height: headerH, color: rgb(0.929, 0.941, 0.961) });
    for (let i = 0; i < cols; i++) {
      ctx.page.drawText(sanitize(headers[i] ?? ""), {
        x: MARGIN_X + i * colW + cellPad, y: ctx.y - cellPad - 9,
        size: 9, font: bold, color: INK,
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y - headerH },
      end: { x: MARGIN_X + MAX_W, y: ctx.y - headerH },
      thickness: 0.5, color: LINE,
    });
    ctx.y -= headerH;
    // Body
    rows.forEach((r, idx) => {
      const h = rowH(r);
      ensure(h + 4);
      if (idx % 2 === 0) {
        ctx.page.drawRectangle({ x: MARGIN_X, y: ctx.y - h, width: MAX_W, height: h, color: PANEL_BG });
      }
      for (let i = 0; i < cols; i++) {
        const cellLines = wrap(r[i] ?? "", regular, 9, colW - cellPad * 2);
        let yy = ctx.y - cellPad - 9;
        for (const ln of cellLines) {
          ctx.page.drawText(ln, { x: MARGIN_X + i * colW + cellPad, y: yy, size: 9, font: regular, color: INK });
          yy -= 12;
        }
      }
      ctx.page.drawLine({
        start: { x: MARGIN_X, y: ctx.y - h },
        end: { x: MARGIN_X + MAX_W, y: ctx.y - h },
        thickness: 0.5, color: LINE,
      });
      ctx.y -= h;
    });
    ctx.y -= 10;
  };

  // -------- RENDER --------
  for (const b of blocks) {
    if (b.type === "h1") drawHeading(b.text, 1);
    else if (b.type === "h2") drawHeading(b.text, 2);
    else if (b.type === "h3") drawHeading(b.text, 3);
    else if (b.type === "p") drawParagraph(b.text, { gap: 6 });
    else if (b.type === "bullets") {
      for (const it of b.items) {
        const lines = wrap(it, regular, 10.5, MAX_W - 16);
        ensure(lines.length * 14 + 4);
        ctx.page.drawText("•", { x: MARGIN_X, y: ctx.y, size: 11, font: bold, color: BRAND });
        let yy = ctx.y;
        for (const ln of lines) {
          ctx.page.drawText(ln, { x: MARGIN_X + 14, y: yy, size: 10.5, font: regular, color: INK });
          yy -= 14;
        }
        ctx.y = yy - 2;
      }
      ctx.y -= 4;
    } else if (b.type === "numbered") {
      b.items.forEach((it, i) => {
        const lines = wrap(it, regular, 10.5, MAX_W - 22);
        ensure(lines.length * 14 + 4);
        ctx.page.drawText(`${i + 1}.`, { x: MARGIN_X, y: ctx.y, size: 10.5, font: bold, color: BRAND });
        let yy = ctx.y;
        for (const ln of lines) {
          ctx.page.drawText(ln, { x: MARGIN_X + 20, y: yy, size: 10.5, font: regular, color: INK });
          yy -= 14;
        }
        ctx.y = yy - 2;
      });
      ctx.y -= 4;
    } else if (b.type === "table") {
      drawTable(b.headers, b.rows);
    } else if (b.type === "callout") {
      drawCallout(b);
    } else if (b.type === "kpis") {
      drawKpis(b.items);
    } else if (b.type === "divider") {
      ensure(20);
      ctx.page.drawLine({
        start: { x: MARGIN_X, y: ctx.y - 4 },
        end: { x: PAGE_W - MARGIN_X, y: ctx.y - 4 },
        thickness: 0.5, color: LINE,
      });
      ctx.y -= 16;
    } else if (b.type === "pagebreak") {
      ctx = addContentPage();
    }
  }

  // -------- FINAL FOOTER PASS (page numbers) --------
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    // Skip cover footer; lighter footer there.
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

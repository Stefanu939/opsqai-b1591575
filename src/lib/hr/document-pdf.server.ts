// OPSQAI HR — portrait A4 renderer for generated HR documents (server only).
//
// Word-wrapped paragraphs, simple headings, page numbers and an approval
// footer. pdf-lib's Helvetica is WinAnsi-only: German/French/Spanish
// characters stay, Romanian comma-below letters fold to their base letter.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";

const WIDTH = 595;
const HEIGHT = 842;
const MARGIN = 56;
const BODY = 10.5;
const LEADING = 14.5;

function winAnsi(value: string): string {
  return value
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/[–—]/g, "-")
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/\t/g, "    ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Very long tokens (e.g. underscores) are hard-broken.
      let chunk = word;
      while (font.widthOfTextAtSize(chunk, size) > maxWidth && chunk.length > 1) {
        let cut = chunk.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(chunk.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(chunk.slice(0, cut));
        chunk = chunk.slice(cut);
      }
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface DocumentPdfInput {
  title: string;
  body: string;
  meta: string[]; // e.g. ["EMP-000001 · Stefan Bari", "Approved 2026-09-08 by ..."]
  footer: string;
  watermark?: string | null; // e.g. "DRAFT"
}

export async function renderDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const usable = WIDTH - MARGIN * 2;

  let page = doc.addPage([WIDTH, HEIGHT]);
  let y = HEIGHT - MARGIN;
  const pages = [page];

  const newPage = () => {
    page = doc.addPage([WIDTH, HEIGHT]);
    pages.push(page);
    y = HEIGHT - MARGIN;
  };
  const ensure = (h: number) => {
    if (y - h < MARGIN + 30) newPage();
  };
  const draw = (text: string, opts: { size?: number; font?: PDFFont; color?: [number, number, number]; x?: number } = {}) => {
    page.drawText(winAnsi(text), {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? BODY,
      font: opts.font ?? font,
      color: rgb(...(opts.color ?? [0.1, 0.1, 0.12])),
    });
  };

  // Header
  for (const line of wrap(bold, winAnsi(input.title), 16, usable)) {
    ensure(20);
    draw(line, { size: 16, font: bold });
    y -= 20;
  }
  for (const m of input.meta) {
    ensure(LEADING);
    draw(m, { size: 8.5, color: [0.4, 0.4, 0.45] });
    y -= 12;
  }
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.6, color: rgb(0.75, 0.75, 0.78) });
  y -= 16;

  // Body
  const rawLines = input.body.replace(/\r\n?/g, "\n").split("\n");
  for (const raw of rawLines) {
    const line = winAnsi(raw);
    if (!line.trim()) {
      y -= LEADING * 0.6;
      continue;
    }
    const isHeading =
      (line.length <= 70 && line === line.toUpperCase() && /[A-Z]/.test(line)) ||
      /^(§\s*\d+|Art\.\s*\d+|Articolul|[A-Z]\.\s|\d+\.\s[A-ZÄÖÜ])/.test(line);
    const size = isHeading ? BODY + 0.5 : BODY;
    const f = isHeading ? bold : font;
    if (isHeading) y -= 4;
    for (const w of wrap(f, line, size, usable)) {
      ensure(LEADING);
      draw(w, { size, font: f });
      y -= LEADING;
    }
  }

  // Watermark + footer on every page
  pages.forEach((p, i) => {
    if (input.watermark) {
      p.drawText(winAnsi(input.watermark), {
        x: WIDTH / 2 - 90,
        y: HEIGHT / 2,
        size: 64,
        font: bold,
        color: rgb(0.85, 0.85, 0.88),
        rotate: degrees(35),
        opacity: 0.5,
      });
    }
    p.drawLine({
      start: { x: MARGIN, y: MARGIN - 6 },
      end: { x: WIDTH - MARGIN, y: MARGIN - 6 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.83),
    });
    p.drawText(winAnsi(input.footer), { x: MARGIN, y: MARGIN - 20, size: 7.5, font, color: rgb(0.45, 0.45, 0.5) });
    const pn = `${i + 1} / ${pages.length}`;
    p.drawText(pn, {
      x: WIDTH - MARGIN - font.widthOfTextAtSize(pn, 7.5),
      y: MARGIN - 20,
      size: 7.5,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });
  });

  return doc.save();
}

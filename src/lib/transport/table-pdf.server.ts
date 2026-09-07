// OPSQAI Transport — generic register PDF renderer (server only).
//
// Any register (incidents, vehicles, alerts, …) is printed as a paginated
// landscape A4 table. pdf-lib is pure JavaScript, so Self-Hosted Node and the
// cloud build behave identically.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Helvetica is WinAnsi-only: fold diacritics it cannot draw. */
function ascii(value: unknown): string {
  if (value == null) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return raw
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

export interface TablePdfInput {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: unknown[][];
  generatedLabel: string;
}

const WIDTH = 842;
const HEIGHT = 595;
const MARGIN = 32;

export async function renderTablePdf(input: TablePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const usable = WIDTH - MARGIN * 2;
  const colCount = Math.max(input.headers.length, 1);
  const colWidth = usable / colCount;

  const clip = (text: string, size: number) => {
    let out = text;
    while (out.length > 1 && font.widthOfTextAtSize(out, size) > colWidth - 6) {
      out = out.slice(0, -1);
    }
    return out;
  };

  let page = doc.addPage([WIDTH, HEIGHT]);
  let y = HEIGHT - MARGIN;

  const header = () => {
    page.drawText(ascii(input.title), {
      x: MARGIN,
      y: y - 12,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.11, 0.16),
    });
    y -= 26;
    if (input.subtitle) {
      page.drawText(ascii(input.subtitle), {
        x: MARGIN,
        y: y - 8,
        size: 9,
        font,
        color: rgb(0.42, 0.45, 0.5),
      });
      y -= 18;
    }
    input.headers.forEach((h, i) => {
      page.drawText(clip(ascii(h), 8), {
        x: MARGIN + i * colWidth + 2,
        y: y - 10,
        size: 8,
        font: bold,
        color: rgb(0.25, 0.27, 0.33),
      });
    });
    y -= 16;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: WIDTH - MARGIN, y },
      thickness: 0.6,
      color: rgb(0.8, 0.82, 0.86),
    });
    y -= 6;
  };

  header();

  for (const row of input.rows) {
    if (y < MARGIN + 30) {
      page = doc.addPage([WIDTH, HEIGHT]);
      y = HEIGHT - MARGIN;
      header();
    }
    row.forEach((cell, i) => {
      page.drawText(clip(ascii(cell), 8), {
        x: MARGIN + i * colWidth + 2,
        y: y - 9,
        size: 8,
        font,
        color: rgb(0.16, 0.18, 0.24),
      });
    });
    y -= 14;
  }

  const last = doc.getPages()[doc.getPageCount() - 1]!;
  last.drawText(
    ascii(`${input.generatedLabel} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`),
    {
      x: MARGIN,
      y: MARGIN - 12,
      size: 7,
      font,
      color: rgb(0.55, 0.57, 0.62),
    },
  );

  return doc.save();
}

// OPSQAI Transport — one page "Fleet status" PDF (server only).
//
// Built for the weekly management meeting and for auditors: portrait A4, KPI
// block at the top, then the two risk lanes exactly as the overview shows them.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function ascii(value: unknown): string {
  if (value == null) return "";
  return String(value)
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

export interface FleetStatusInput {
  title: string;
  subtitle: string;
  kpis: { label: string; value: string }[];
  lanes: { title: string; tone: "critical" | "plan"; items: { label: string; value: string }[] }[];
  footer: string;
}

const WIDTH = 595;
const HEIGHT = 842;
const M = 40;

export async function renderFleetStatusPdf(input: FleetStatusInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([WIDTH, HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.1, 0.15);
  const muted = rgb(0.45, 0.48, 0.53);
  let y = HEIGHT - M;

  page.drawText(ascii(input.title), { x: M, y: y - 16, size: 18, font: bold, color: ink });
  y -= 34;
  page.drawText(ascii(input.subtitle), { x: M, y: y - 8, size: 9, font, color: muted });
  y -= 24;

  // KPI grid: three per row.
  const cellW = (WIDTH - M * 2) / 3;
  input.kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * cellW;
    const top = y - row * 54;
    page.drawRectangle({
      x,
      y: top - 46,
      width: cellW - 8,
      height: 44,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 0.8,
      color: rgb(0.98, 0.98, 0.99),
    });
    page.drawText(ascii(k.label), { x: x + 8, y: top - 16, size: 7.5, font, color: muted });
    page.drawText(ascii(k.value), { x: x + 8, y: top - 36, size: 15, font: bold, color: ink });
  });
  y -= Math.ceil(input.kpis.length / 3) * 54 + 12;

  for (const lane of input.lanes) {
    page.drawText(ascii(lane.title), {
      x: M,
      y: y - 12,
      size: 11,
      font: bold,
      color: lane.tone === "critical" ? rgb(0.72, 0.11, 0.11) : rgb(0.62, 0.35, 0.04),
    });
    y -= 22;
    page.drawLine({
      start: { x: M, y },
      end: { x: WIDTH - M, y },
      thickness: 0.6,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 6;
    if (lane.items.length === 0) {
      page.drawText("-", { x: M, y: y - 10, size: 9, font, color: muted });
      y -= 20;
      continue;
    }
    for (const item of lane.items) {
      if (y < M + 40) break;
      page.drawText(ascii(item.label), { x: M, y: y - 10, size: 9.5, font, color: ink });
      const value = ascii(item.value);
      page.drawText(value, {
        x: WIDTH - M - bold.widthOfTextAtSize(value, 9.5),
        y: y - 10,
        size: 9.5,
        font: bold,
        color: ink,
      });
      y -= 16;
    }
    y -= 12;
  }

  page.drawText(ascii(`${input.footer} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`), {
    x: M,
    y: M - 14,
    size: 7,
    font,
    color: muted,
  });

  return doc.save();
}

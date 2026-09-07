// OPSQAI Transport — coupling sheet exports (server only).
//
// One row per saved set (truck + trailer + driver). A4 landscape PDF via
// pdf-lib (pure JavaScript), so the Self-Hosted Node runtime
// and the cloud build behave identically.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Coupling } from "./types";

/** Helvetica is WinAnsi-only: fold diacritics it cannot draw. */
function ascii(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/[–—]/g, "-");
}

export interface CouplingExportLabels {
  title: string;
  date: string;
  vehicle: string;
  trailer: string;
  driver: string;
  route: string;
  status: string;
  notes: string;
  generated: string;
}

const DASH = "—";

function row(c: Coupling): (string | number)[] {
  return [
    c.coupling_date,
    c.vehicle_plate ?? DASH,
    c.trailer_plate ?? DASH,
    c.driver_name ?? DASH,
    c.route ?? "",
    c.status,
    c.notes ?? "",
  ];
}

export async function renderCouplingPdf(
  couplings: Coupling[],
  labels: CouplingExportLabels,
  companyName?: string | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 841.89; // A4 landscape
  const PAGE_H = 595.28;
  const M = 36;
  const ink = rgb(0.09, 0.11, 0.12);
  const muted = rgb(0.4, 0.43, 0.45);
  const line = rgb(0.78, 0.8, 0.8);

  const cols = [
    { label: labels.date, w: 70 },
    { label: labels.vehicle, w: 95 },
    { label: labels.trailer, w: 95 },
    { label: labels.driver, w: 150 },
    { label: labels.route, w: 170 },
    { label: labels.status, w: 70 },
    { label: labels.notes, w: 120 },
  ];

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const header = () => {
    page.drawText(ascii(labels.title), { x: M, y: y - 14, size: 15, font: bold, color: ink });
    y -= 22;
    page.drawText(ascii(`${companyName ?? ""}${companyName ? " · " : ""}${labels.generated}`), {
      x: M,
      y: y - 10,
      size: 9,
      font,
      color: muted,
    });
    y -= 26;
    let x = M;
    for (const c of cols) {
      page.drawText(ascii(c.label), { x, y: y - 9, size: 9, font: bold, color: ink });
      x += c.w;
    }
    y -= 16;
    page.drawLine({
      start: { x: M, y },
      end: { x: PAGE_W - M, y },
      thickness: 0.7,
      color: line,
    });
    y -= 6;
  };

  header();

  for (const c of couplings) {
    if (y < M + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
      header();
    }
    const cells = row(c).map((v) => ascii(String(v ?? "")));
    let x = M;
    cells.forEach((cell, i) => {
      const col = cols[i]!;
      const max = Math.max(4, Math.floor(col.w / 4.9));
      page.drawText(cell.length > max ? `${cell.slice(0, max - 1)}…` : cell, {
        x,
        y: y - 10,
        size: 9,
        font,
        color: ink,
      });
      x += col.w;
    });
    y -= 18;
  }

  if (!couplings.length) {
    page.drawText(ascii(DASH), { x: M, y: y - 10, size: 9, font, color: muted });
  }

  return doc.save();
}

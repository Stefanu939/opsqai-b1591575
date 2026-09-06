// OPSQAI Transport — CMR consignment note rendering (server only).
//
// pdf-lib is pure JavaScript, so the same code path works on the Self-Hosted
// Node runtime. The layout follows the classic CMR box numbering; the country
// pack supplies the heading and the legal footnote.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { countryPack } from "./country-packs";
import type { CmrRecord } from "./types";

/** Helvetica is WinAnsi-only: fold Romanian/German diacritics it cannot draw. */
function ascii(value: string | null | undefined): string {
  if (!value) return "";
  return value
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

export async function renderCmrPdf(record: CmrRecord): Promise<Uint8Array> {
  const pack = countryPack(record.country);
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 32;
  const W = 595.28 - M * 2;
  const ink = rgb(0.09, 0.11, 0.12);
  const line = rgb(0.55, 0.58, 0.58);
  let y = 841.89 - M;

  const text = (
    value: string,
    x: number,
    yy: number,
    size = 9,
    useBold = false,
  ) => {
    page.drawText(ascii(value), {
      x,
      y: yy,
      size,
      font: useBold ? bold : font,
      color: ink,
    });
  };

  const wrap = (value: string, x: number, yy: number, width: number, size = 8.5) => {
    const words = ascii(value).split(/\s+/).filter(Boolean);
    let current = "";
    let cursor = yy;
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width) {
        text(current, x, cursor, size);
        cursor -= size + 2;
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      text(current, x, cursor, size);
      cursor -= size + 2;
    }
    return cursor;
  };

  // Header
  text(pack.cmr.title, M, y - 4, 15, true);
  text(pack.cmr.subtitle, M, y - 20, 9);
  text(record.number ?? "DRAFT", M + W - 130, y - 4, 13, true);
  text(record.status.toUpperCase(), M + W - 130, y - 20, 9);
  y -= 40;
  page.drawLine({
    start: { x: M, y },
    end: { x: M + W, y },
    thickness: 1,
    color: line,
  });
  y -= 8;

  const box = (
    label: string,
    value: string,
    x: number,
    width: number,
    top: number,
    height: number,
  ) => {
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      borderColor: line,
      borderWidth: 0.6,
    });
    text(label, x + 5, top - 12, 7.5, true);
    wrap(value, x + 5, top - 24, width - 10);
  };

  const half = W / 2;

  box("1. Sender / Expediteur", `${record.sender_name ?? ""}\n${record.sender_address ?? ""}`.replace("\n", " — "), M, half - 4, y, 60);
  box("2. Consignee / Destinatar", `${record.consignee_name ?? ""} — ${record.consignee_address ?? ""}`, M + half + 4, half - 4, y, 60);
  y -= 66;

  box("3. Place of delivery", `${record.place_of_delivery ?? ""} ${record.delivery_on ? `(${record.delivery_on})` : ""}`, M, half - 4, y, 46);
  box("4. Place & date of loading", `${record.place_of_loading ?? ""} ${record.loading_on ? `(${record.loading_on})` : ""}`, M + half + 4, half - 4, y, 46);
  y -= 52;

  box("5. Documents attached", record.documents_attached ?? "", M, W, y, 40);
  y -= 46;

  box(
    "16. Carrier / Transportator",
    `${record.carrier_name ?? ""} — ${record.carrier_address ?? ""}`,
    M,
    half - 4,
    y,
    52,
  );
  box(
    "17. Successive carrier / Vehicle",
    `${record.successive_carrier ?? ""} | ${record.vehicle_plate ?? ""}${record.trailer_plate ? ` + ${record.trailer_plate}` : ""} | ${record.driver_name ?? ""}`,
    M + half + 4,
    half - 4,
    y,
    52,
  );
  y -= 58;

  // Goods table (boxes 6–12)
  const headers = ["6. Marks", "7. Packages", "8. Packing", "9. Description", "11. Weight (kg)", "12. Volume (m3)"];
  const widths = [70, 60, 60, 180, 70, 91];
  let x = M;
  page.drawRectangle({
    x: M,
    y: y - 16,
    width: W,
    height: 16,
    borderColor: line,
    borderWidth: 0.6,
  });
  headers.forEach((h, i) => {
    text(h, x + 4, y - 11, 7.5, true);
    x += widths[i] ?? 60;
  });
  y -= 16;

  const lines = record.goods?.length ? record.goods : [{}];
  for (const g of lines.slice(0, 8)) {
    const cells = [
      g.marks ?? "",
      g.packages ?? "",
      g.packing ?? "",
      g.description ?? "",
      g.weight ?? "",
      g.volume ?? "",
    ];
    page.drawRectangle({
      x: M,
      y: y - 18,
      width: W,
      height: 18,
      borderColor: line,
      borderWidth: 0.5,
    });
    x = M;
    cells.forEach((c, i) => {
      text(c.slice(0, 40), x + 4, y - 12, 8);
      x += widths[i] ?? 60;
    });
    y -= 18;
  }

  y -= 10;
  box("13. Sender's instructions", record.instructions ?? "", M, half - 4, y, 54);
  box("14. Payment / 18. Reservations", `${record.payment_terms ?? ""} | ${record.reservations ?? ""}`, M + half + 4, half - 4, y, 54);
  y -= 60;

  box("19. Special agreements", record.special_agreements ?? "", M, W, y, 40);
  y -= 46;

  const third = W / 3;
  box("22. Sender signature", record.signature_sender ?? "", M, third - 4, y, 56);
  box("23. Carrier signature", record.signature_carrier ?? "", M + third + 2, third - 4, y, 56);
  box("24. Consignee signature", record.signature_consignee ?? "", M + third * 2 + 4, third - 4, y, 56);
  y -= 66;

  text(
    `21. ${record.established_in ?? ""} ${record.established_at ?? ""}`,
    M,
    y,
    8.5,
  );
  y -= 14;
  text(pack.cmr.footer, M, y, 7.5);

  return doc.save();
}

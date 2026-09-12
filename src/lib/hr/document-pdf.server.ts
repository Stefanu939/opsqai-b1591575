// OPSQAI HR — branded, Unicode, portrait A4 document renderer (server only).
import { PDFDocument, degrees, rgb, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontUrl from "@/assets/figtree-variable.ttf?url";

const WIDTH = 595;
const HEIGHT = 842;
const MARGIN = 54;
const BODY = 10.5;
const LEADING = 15;

async function assetBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load PDF font (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
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

async function embedLogo(doc: PDFDocument, dataUrl?: string | null): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return match[1]?.toLowerCase() === "png" ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

export interface DocumentPdfInput {
  title: string;
  body: string;
  meta: string[];
  footer: string;
  watermark?: string | null;
  logoDataUrl?: string | null;
  legal?: { reviewer: string; reviewedAt: string; version: number; verifiedOn: string; reviewDue: string; sources: string[] } | null;
}

export async function renderDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = await assetBytes(fontUrl);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const bold = font;
  const logo = await embedLogo(doc, input.logoDataUrl);
  const usable = WIDTH - MARGIN * 2;
  const pages: PDFPage[] = [];
  let page: PDFPage;
  let y = 0;

  const addHeader = () => {
    page = doc.addPage([WIDTH, HEIGHT]);
    pages.push(page);
    y = HEIGHT - 62;
    if (logo) {
      const scale = Math.min(104 / logo.width, 34 / logo.height);
      page.drawImage(logo, { x: WIDTH - MARGIN - logo.width * scale, y: HEIGHT - 48, width: logo.width * scale, height: logo.height * scale });
    }
    page.drawText("OPSQAI HR", { x: MARGIN, y: HEIGHT - 34, size: 8, font: bold, color: rgb(0.19, 0.24, 0.34) });
    page.drawLine({ start: { x: MARGIN, y: HEIGHT - 50 }, end: { x: WIDTH - MARGIN, y: HEIGHT - 50 }, thickness: 0.6, color: rgb(0.75, 0.78, 0.84) });
  };
  const ensure = (height: number) => { if (y - height < MARGIN + 28) addHeader(); };
  const draw = (text: string, size = BODY, selected: PDFFont = font, color: [number, number, number] = [0.1, 0.12, 0.16]) => {
    page.drawText(text, { x: MARGIN, y, size, font: selected, color: rgb(...color) });
  };

  addHeader();
  for (const line of wrap(bold, input.title, 16, usable - (logo ? 115 : 0))) { ensure(20); draw(line, 16, bold); y -= 20; }
  for (const m of input.meta) { ensure(12); draw(m, 8.5, font, [0.38, 0.42, 0.5]); y -= 12; }
  y -= 7;

  for (const raw of input.body.replace(/\r\n?/g, "\n").split("\n")) {
    if (raw.trim() === "[[PAGE_BREAK]]") { addHeader(); continue; }
    if (!raw.trim()) { y -= LEADING * 0.58; continue; }
    const heading = (raw.length <= 90 && raw === raw.toUpperCase() && /[A-ZĂÂÎȘȚÄÖÜ]/.test(raw)) || /^(§\s*\d+|Art\.\s*\d+|[A-ZĂÂÎȘȚ]\.)/.test(raw);
    const selected = heading ? bold : font;
    const size = heading ? BODY + 0.5 : BODY;
    if (heading) y -= 3;
    for (const line of wrap(selected, raw, size, usable)) { ensure(LEADING); draw(line, size, selected); y -= LEADING; }
  }

  if (input.legal) {
    ensure(105);
    y -= 12;
    draw("LEGAL REVIEW RECORD", 9, bold, [0.19, 0.24, 0.34]); y -= 14;
    for (const line of [
      `Reviewer: ${input.legal.reviewer} · reviewed ${input.legal.reviewedAt} · legal version ${input.legal.version}`,
      `Source verification: ${input.legal.verifiedOn} · next review: ${input.legal.reviewDue}`,
      ...input.legal.sources,
    ]) {
      for (const wrapped of wrap(font, line, 7.5, usable)) { ensure(10); draw(wrapped, 7.5, font, [0.35, 0.4, 0.48]); y -= 10; }
    }
  }

  pages.forEach((p, index) => {
    if (input.watermark) p.drawText(input.watermark, { x: WIDTH / 2 - 90, y: HEIGHT / 2, size: 64, font: bold, color: rgb(0.85, 0.85, 0.88), rotate: degrees(35), opacity: 0.45 });
    p.drawLine({ start: { x: MARGIN, y: MARGIN - 5 }, end: { x: WIDTH - MARGIN, y: MARGIN - 5 }, thickness: 0.5, color: rgb(0.8, 0.82, 0.86) });
    p.drawText(input.footer, { x: MARGIN, y: MARGIN - 19, size: 7.2, font, color: rgb(0.4, 0.43, 0.5), maxWidth: usable - 55 });
    const number = `${index + 1} / ${pages.length}`;
    p.drawText(number, { x: WIDTH - MARGIN - font.widthOfTextAtSize(number, 7.2), y: MARGIN - 19, size: 7.2, font, color: rgb(0.4, 0.43, 0.5) });
  });
  return doc.save();
}
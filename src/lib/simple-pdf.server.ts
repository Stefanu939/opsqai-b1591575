// Server-only, dependency-free PDF writer for reliable text reports in edge runtimes.
// It deliberately uses the built-in Helvetica fonts and ASCII-safe text.

export type SimplePdfLine =
  | { kind: "title" | "subtitle" | "heading" | "text" | "note"; text: string }
  | { kind: "row"; cells: string[] };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const LEFT = 52;
const RIGHT = 52;
const TOP = 58;
const BOTTOM = 56;

function safeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, "EUR ")
    .replace(/[–—−]/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdf(value: string): string {
  return safeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, maxChars: number): string[] {
  const words = safeText(value).split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textCommand(text: string, x: number, y: number, size: number, bold = false): string {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(text)}) Tj ET`;
}

export function createSimplePdf(args: {
  title: string;
  author?: string;
  footer?: string;
  lines: SimplePdfLine[];
}): Uint8Array {
  const pages: string[][] = [[]];
  let pageIndex = 0;
  let y = PAGE_H - TOP;

  const nextPage = () => {
    pages.push([]);
    pageIndex += 1;
    y = PAGE_H - TOP;
  };
  const ensure = (height: number) => {
    if (y - height < BOTTOM) nextPage();
  };
  const addText = (text: string, options: { size: number; bold?: boolean; gap?: number; indent?: number }) => {
    const indent = options.indent ?? 0;
    const maxChars = Math.max(18, Math.floor((PAGE_W - LEFT - RIGHT - indent) / (options.size * 0.53)));
    const wrapped = wrap(text, maxChars);
    const lineHeight = options.size * 1.35;
    ensure(wrapped.length * lineHeight + (options.gap ?? 0));
    for (const line of wrapped) {
      pages[pageIndex]?.push(textCommand(line, LEFT + indent, y, options.size, options.bold));
      y -= lineHeight;
    }
    y -= options.gap ?? 0;
  };

  for (const line of args.lines) {
    if (line.kind === "title") addText(line.text, { size: 24, bold: true, gap: 10 });
    else if (line.kind === "subtitle") addText(line.text, { size: 11, gap: 18 });
    else if (line.kind === "heading") {
      ensure(34);
      pages[pageIndex]?.push(`0.20 0.34 0.70 RG ${LEFT} ${(y + 7).toFixed(2)} m ${PAGE_W - RIGHT} ${(y + 7).toFixed(2)} l S`);
      addText(line.text, { size: 14, bold: true, gap: 8 });
    } else if (line.kind === "note") addText(line.text, { size: 9, gap: 8, indent: 8 });
    else if (line.kind === "text") addText(line.text, { size: 10.5, gap: 8 });
    else {
      const cells = line.cells.map(safeText);
      const columns = Math.max(1, cells.length);
      const columnWidth = (PAGE_W - LEFT - RIGHT) / columns;
      const wrapped = cells.map((cell) => wrap(cell, Math.max(8, Math.floor(columnWidth / 5.7))));
      const rowLines = Math.max(...wrapped.map((cell) => cell.length), 1);
      const rowHeight = rowLines * 12 + 8;
      ensure(rowHeight);
      pages[pageIndex]?.push(`0.88 G ${LEFT} ${(y + 5).toFixed(2)} m ${PAGE_W - RIGHT} ${(y + 5).toFixed(2)} l S`);
      wrapped.forEach((cell, column) => {
        cell.forEach((value, row) => {
          pages[pageIndex]?.push(textCommand(value, LEFT + column * columnWidth + 3, y - row * 12, 8.5));
        });
      });
      y -= rowHeight;
    }
  }

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  pages.forEach((commands, index) => {
    const footer = `${safeText(args.footer ?? "OPSQAI")}  |  ${index + 1} / ${pages.length}`;
    const stream = [...commands, textCommand(footer, LEFT, 30, 8)].join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const infoId = addObject(`<< /Title (${escapePdf(args.title)}) /Author (${escapePdf(args.author ?? "OPSQAI")}) /Producer (OPSQAI) >>`);

  let pdf = "%PDF-1.4\n%OPSQAI\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "ascii"));
}
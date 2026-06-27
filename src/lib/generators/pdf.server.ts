// Server-only: generate a simple multipage PDF report from a JSON spec.
export interface PdfSpec {
  title: string;
  subtitle?: string;
  author?: string;
  sections: Array<{ heading?: string; paragraphs: string[] }>;
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

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const MAX_W = PAGE_W - MARGIN * 2;
  const accent = rgb(0.388, 0.4, 0.945);
  const ink = rgb(0.06, 0.09, 0.16);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; };
  // pdf-lib's standard fonts only support WinAnsi. Replace common unicode
  // (em/en dashes, smart quotes, ellipsis, NBSP) with safe equivalents and
  // strip anything else outside the encodable range to avoid runtime crashes.
  const sanitize = (text: string): string => {
    const replaced = (text ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u2013\u2014\u2212]/g, "-")
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/[\u00A0\u2007\u202F]/g, " ")
      .replace(/[\u2022\u25CF]/g, "*");
    // Drop any remaining non-WinAnsi characters (keep tab/newline + 0x20-0xFF).
    return replaced.replace(/[^\t\n\x20-\xFF]/g, "");
  };
  const wrap = (text: string, font: typeof regular, size: number): string[] => {
    const words = sanitize(text).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, size) <= MAX_W) line = candidate;
      else { if (line) lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  };
  const draw = (text: string, opts: { font: typeof regular; size: number; color?: typeof ink; gap?: number }) => {
    const lines = wrap(text, opts.font, opts.size);
    for (const ln of lines) {
      if (y - opts.size < MARGIN) newPage();
      page.drawText(ln, { x: MARGIN, y, size: opts.size, font: opts.font, color: opts.color ?? ink });
      y -= opts.size * 1.35;
    }
    y -= opts.gap ?? 4;
  };


  draw(spec.title, { font: bold, size: 22, gap: 8 });
  if (spec.subtitle) draw(spec.subtitle, { font: regular, size: 12, color: accent, gap: 12 });

  for (const sec of spec.sections) {
    if (sec.heading) draw(sec.heading, { font: bold, size: 14, color: accent, gap: 6 });
    for (const p of sec.paragraphs) draw(p, { font: regular, size: 11, gap: 8 });
  }

  return await pdf.save();
}

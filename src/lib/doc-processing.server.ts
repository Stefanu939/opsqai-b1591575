// Server-only: extract text from PDF/DOCX/TXT and chunk for embedding.
//
// Extraction is page-aware: a paginated source (PDF) yields one entry per
// physical page, so every chunk can carry the real page number(s) it came
// from. Non-paginated sources (DOCX/TXT/MD) report `paginated: false` and
// their chunks carry no page — the UI then says the page number is
// unavailable in the indexed metadata instead of inventing one.
import { unzipSync, strFromU8 } from "fflate";

/** One physical page of a paginated source, or the whole body for others. */
export interface PageText {
  /** 1-based page number; null when the source has no pagination. */
  page: number | null;
  text: string;
}

export interface ExtractedDocument {
  pages: PageText[];
  /** True only when the source format has real page boundaries (PDF). */
  paginated: boolean;
  /** Full text, pages joined — kept for previews and legacy callers. */
  text: string;
}

export async function extractDocument(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<ExtractedDocument> {
  const name = filename.toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");

  if (isPdf) {
    const pages = await extractPdfPages(buffer);
    return { pages, paginated: true, text: pages.map((p) => p.text).join("\n\n") };
  }
  const body = isDocx ? extractDocx(buffer) : new TextDecoder("utf-8").decode(buffer);
  return { pages: [{ page: null, text: body }], paginated: false, text: body };
}

export async function extractText(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  return (await extractDocument(buffer, filename, mime)).text;
}

async function extractPdfPages(buffer: ArrayBuffer): Promise<PageText[]> {
  const { extractText: unpdfExtract, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  // mergePages: false keeps the page boundaries we need for citations.
  const { text } = await unpdfExtract(doc, { mergePages: false });
  const list = Array.isArray(text) ? text : [String(text ?? "")];
  return list.map((t, i) => ({ page: i + 1, text: String(t ?? "") }));
}


function extractDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const docXmlBytes = files["word/document.xml"];
  if (!docXmlBytes) throw new Error("Invalid DOCX: missing word/document.xml");
  const xml = strFromU8(docXmlBytes);
  // Insert newlines at paragraph and line breaks, then strip tags.
  const withBreaks = xml
    .replace(/<w:p[ >]/g, "\n<w:p ")
    .replace(/<w:br\/?>/g, "\n")
    .replace(/<w:tab\/?>/g, "\t");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeEntities(stripped)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/** A chunk plus the metadata citations are built from. */
export interface DocumentChunk {
  content: string;
  /** Section / heading the chunk sits under, verbatim from the source. */
  section: string | null;
  /** First page the chunk's text appears on; null when the source has no pages. */
  pageStart: number | null;
  /** Last page the chunk's text appears on; null when the source has no pages. */
  pageEnd: number | null;
}

function isHeaderLine(line: string): boolean {
  const l = line.trim();
  if (!l || l.length > 120) return false;
  if (/^(\d+(\.\d+)*\.?\s+\S)/.test(l)) return true; // 1. / 1.1 / 2.3.4
  if (/^(step|schritt|pasul|pas)\s+\d+\b/i.test(l)) return true; // Step 3 …
  if (/^(section|kapitel|capitol|teil|chapter)\b/i.test(l)) return true;
  if (/^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 \-/&,()]+:?$/.test(l) && l.length >= 3 && /[A-ZÄÖÜ]{2}/.test(l))
    return true; // ALL CAPS
  if (/^#{1,4}\s+\S/.test(l)) return true; // markdown headings
  return false;
}

/**
 * SOP-aware, page-aware chunking. Detects section headers (ALL CAPS lines,
 * numbered headings, "Step 3 …", markdown headings) and prefers splits at
 * those boundaries, while tracking which physical page(s) every chunk came
 * from so citations can name a real page instead of guessing one.
 */
export function chunkDocument(
  doc: ExtractedDocument,
  targetSize = 1000,
  overlap = 200,
): DocumentChunk[] {
  type Line = { text: string; page: number | null };
  const lines: Line[] = [];
  for (const p of doc.pages) {
    const clean = (p.text ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
    for (const text of clean.split("\n")) lines.push({ text, page: p.page });
  }
  if (!lines.some((l) => l.text.trim())) return [];

  // Group into sections by header line, keeping page numbers per line.
  type Section = { header: string | null; body: Line[] };
  const sections: Section[] = [];
  let current: Section = { header: null, body: [] };
  for (const line of lines) {
    if (isHeaderLine(line.text)) {
      if (current.header || current.body.some((b) => b.text.trim())) sections.push(current);
      current = { header: line.text.trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.header || current.body.some((b) => b.text.trim())) sections.push(current);

  const pageSpan = (items: Line[]): { start: number | null; end: number | null } => {
    const pages = items.map((i) => i.page).filter((p): p is number => typeof p === "number");
    if (pages.length === 0) return { start: null, end: null };
    return { start: Math.min(...pages), end: Math.max(...pages) };
  };

  const chunks: DocumentChunk[] = [];
  for (const sec of sections) {
    const prefix = sec.header ? `[${sec.header}]\n` : "";
    // Paragraphs: consecutive non-empty lines, each carrying its page span.
    type Para = { text: string; start: number | null; end: number | null };
    const paras: Para[] = [];
    let buffer: Line[] = [];
    const flushPara = () => {
      const text = buffer.map((b) => b.text).join("\n").trim();
      if (text) {
        const span = pageSpan(buffer);
        paras.push({ text, start: span.start, end: span.end });
      }
      buffer = [];
    };
    for (const line of sec.body) {
      if (line.text.trim()) buffer.push(line);
      else flushPara();
    }
    flushPara();

    // Oversized paragraphs are split by sentence, inheriting the page span.
    const pieces: Para[] = paras.flatMap((p) =>
      p.text.length <= targetSize * 1.5
        ? [p]
        : p.text.split(/(?<=[.!?])\s+/).map((t) => ({ text: t, start: p.start, end: p.end })),
    );

    let buf = "";
    let bufStart: number | null = null;
    let bufEnd: number | null = null;
    const widen = (start: number | null, end: number | null) => {
      if (typeof start === "number") bufStart = bufStart === null ? start : Math.min(bufStart, start);
      if (typeof end === "number") bufEnd = bufEnd === null ? end : Math.max(bufEnd, end);
    };
    const push = () => {
      const out = (prefix + buf).trim();
      if (out.length > 20)
        chunks.push({ content: out, section: sec.header, pageStart: bufStart, pageEnd: bufEnd });
    };
    const reset = () => {
      buf = "";
      bufStart = null;
      bufEnd = null;
    };

    for (const piece of pieces) {
      const t = piece.text.trim();
      if (!t) continue;
      if (t.length > targetSize * 1.5) {
        if (buf) push();
        reset();
        for (let i = 0; i < t.length; i += targetSize - overlap) {
          const out = (prefix + t.slice(i, i + targetSize)).trim();
          if (out.length > 20)
            chunks.push({
              content: out,
              section: sec.header,
              pageStart: piece.start,
              pageEnd: piece.end,
            });
        }
        continue;
      }
      if (buf.length + t.length + 2 <= targetSize) {
        buf = buf ? `${buf}\n\n${t}` : t;
        widen(piece.start, piece.end);
      } else {
        if (buf) push();
        const tail = buf.slice(Math.max(0, buf.length - overlap));
        const carriedEnd = bufEnd;
        reset();
        buf = tail ? `${tail}\n\n${t}` : t;
        if (tail) widen(carriedEnd, carriedEnd);
        widen(piece.start, piece.end);
      }
    }
    if (buf) push();
  }
  return chunks;
}

/** Legacy content-only chunker, kept for callers that need plain strings. */
export function chunkText(text: string, targetSize = 1000, overlap = 200): string[] {
  return chunkDocument(
    { pages: [{ page: null, text }], paginated: false, text },
    targetSize,
    overlap,
  ).map((c) => c.content);
}


// ---------------------------------------------------------------------------
// Visual understanding (Phase 5) — embedded image extraction.
//
// DOCX embeds images as plain files under `word/media/`; we already unzip
// DOCX with fflate for text extraction, so image extraction reuses that.
// PDF/TXT extraction does not yield embedded images today (no bundled PDF
// image decoder) — callers receive an empty array and processing continues
// with text-only chunks.
// ---------------------------------------------------------------------------

export interface ExtractedImage {
  bytes: Uint8Array;
  mime: string;
  name: string;
  /** 0..1 position within the document, used to approximate chunk context. */
  position: number;
}

function mimeFromExt(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
  };
  return map[ext] ?? null;
}

export async function extractImages(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<ExtractedImage[]> {
  const name = filename.toLowerCase();
  const isDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  if (!isDocx) return [];

  const files = unzipSync(new Uint8Array(buffer));
  const media = Object.keys(files)
    .filter((k) => k.startsWith("word/media/"))
    .sort();
  return media.flatMap((key, idx) => {
    const detected = mimeFromExt(key);
    if (!detected) return [];
    return [
      {
        bytes: files[key],
        mime: detected,
        name: key.split("/").pop() ?? key,
        position: media.length > 1 ? idx / (media.length - 1) : 0,
      },
    ];
  });
}

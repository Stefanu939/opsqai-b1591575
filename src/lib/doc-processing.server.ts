// Server-only: extract text from PDF/DOCX/TXT and chunk for embedding.
import { unzipSync, strFromU8 } from "fflate";

export async function extractText(buffer: ArrayBuffer, filename: string, mime: string): Promise<string> {
  const name = filename.toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  const isTxt = mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");

  if (isPdf) return extractPdf(buffer);
  if (isDocx) return extractDocx(buffer);
  if (isTxt) return new TextDecoder("utf-8").decode(buffer);
  // Fallback: try as text
  return new TextDecoder("utf-8").decode(buffer);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText: unpdfExtract, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await unpdfExtract(doc, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
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
  return decodeEntities(stripped).replace(/\n{3,}/g, "\n\n").trim();
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

/**
 * SOP-aware chunking. Detects section headers (ALL CAPS lines, numbered
 * headings like "1.", "1.1", "Section 4 —", "Delay Classification", time-range
 * tables like ">60 min") and prefers splits at those boundaries. Targets
 * ~1000 chars per chunk with ~200 char overlap. Keeps section header attached
 * to the chunk so retrieval surfaces the right context.
 */
export function chunkText(text: string, targetSize = 1000, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const isHeader = (line: string) => {
    const l = line.trim();
    if (!l || l.length > 120) return false;
    if (/^(\d+(\.\d+)*\.?\s+\S)/.test(l)) return true;            // 1. / 1.1 / 2.3.4
    if (/^(section|kapitel|capitol|teil|chapter)\b/i.test(l)) return true;
    if (/^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 \-/&,()]+:?$/.test(l) && l.length >= 3 && /[A-ZÄÖÜ]{2}/.test(l)) return true; // ALL CAPS
    if (/^#{1,4}\s+\S/.test(l)) return true;                       // markdown headings
    return false;
  };

  // Split into sections by header lines
  const lines = clean.split("\n");
  type Section = { header: string | null; body: string };
  const sections: Section[] = [];
  let current: Section = { header: null, body: "" };
  for (const raw of lines) {
    if (isHeader(raw)) {
      if (current.body.trim() || current.header) sections.push(current);
      current = { header: raw.trim(), body: "" };
    } else {
      current.body += raw + "\n";
    }
  }
  if (current.body.trim() || current.header) sections.push(current);

  const chunks: string[] = [];
  for (const sec of sections) {
    const prefix = sec.header ? `[${sec.header}]\n` : "";
    const paragraphs = sec.body.split(/\n\n+/).flatMap((p) => {
      if (p.length <= targetSize * 1.5) return [p];
      return p.split(/(?<=[.!?])\s+/);
    });
    let buf = "";
    const push = () => {
      const out = (prefix + buf).trim();
      if (out.length > 20) chunks.push(out);
    };
    for (const piece of paragraphs) {
      const t = piece.trim();
      if (!t) continue;
      if (t.length > targetSize * 1.5) {
        if (buf) { push(); buf = ""; }
        for (let i = 0; i < t.length; i += targetSize - overlap) {
          chunks.push((prefix + t.slice(i, i + targetSize)).trim());
        }
        continue;
      }
      if (buf.length + t.length + 2 <= targetSize) {
        buf = buf ? `${buf}\n\n${t}` : t;
      } else {
        if (buf) push();
        const tail = buf.slice(Math.max(0, buf.length - overlap));
        buf = tail ? `${tail}\n\n${t}` : t;
      }
    }
    if (buf) push();
  }
  return chunks;
}

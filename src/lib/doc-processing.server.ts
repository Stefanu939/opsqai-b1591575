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
 * Chunk text by paragraphs, targeting ~1000 chars per chunk with ~200 char overlap.
 * Preserves semantic boundaries: paragraphs > sentences > characters.
 */
export function chunkText(text: string, targetSize = 1000, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  // Split into paragraphs
  const paragraphs = clean.split(/\n\n+/).flatMap((p) => {
    if (p.length <= targetSize * 1.5) return [p];
    // Long paragraph: split by sentences
    const sentences = p.split(/(?<=[.!?])\s+/);
    return sentences;
  });

  const chunks: string[] = [];
  let current = "";
  for (const piece of paragraphs) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    if (trimmed.length > targetSize * 1.5) {
      // Hard split very long single piece
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < trimmed.length; i += targetSize - overlap) {
        chunks.push(trimmed.slice(i, i + targetSize));
      }
      continue;
    }
    if (current.length + trimmed.length + 2 <= targetSize) {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);
      // Carry overlap from end of previous chunk
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail ? `${tail}\n\n${trimmed}` : trimmed;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 20);
}

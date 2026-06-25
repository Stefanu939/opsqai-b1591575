// Server-only: extract text from temporary workspace files (PDF/DOCX/XLSX/CSV/TXT/PPTX).
// Workspace files are NEVER indexed/embedded. This extraction is used only in-session.
import { unzipSync, strFromU8 } from "fflate";

const MAX_CHARS = 60_000; // hard cap per file to keep prompts bounded

function cap(s: string): string {
  if (s.length <= MAX_CHARS) return s;
  return s.slice(0, MAX_CHARS) + `\n\n…[truncated, original length ${s.length} chars]`;
}

export async function extractWorkspaceText(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  const name = filename.toLowerCase();
  try {
    if (mime === "application/pdf" || name.endsWith(".pdf")) return cap(await extractPdf(buffer));
    if (name.endsWith(".docx") || mime.includes("wordprocessingml")) return cap(await extractDocx(buffer));
    if (name.endsWith(".xlsx") || mime.includes("spreadsheetml")) return cap(await extractXlsx(buffer));
    if (name.endsWith(".pptx") || mime.includes("presentationml")) return cap(extractPptx(buffer));
    if (name.endsWith(".csv") || mime === "text/csv") return cap(new TextDecoder("utf-8").decode(buffer));
    if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json")) {
      return cap(new TextDecoder("utf-8").decode(buffer));
    }
    if (mime.startsWith("image/")) {
      return `[image file: ${filename}] (visual content not transcribed in this session)`;
    }
    return cap(new TextDecoder("utf-8").decode(buffer).replace(/\u0000+/g, ""));
  } catch (e) {
    return `[failed to extract ${filename}: ${(e as Error).message}]`;
  }
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(doc, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return value;
}

async function extractXlsx(buffer: ArrayBuffer): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const parts: string[] = [];
  wb.eachSheet((sheet) => {
    parts.push(`=== Sheet: ${sheet.name} ===`);
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object") {
          const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
          if (o.richText) return o.richText.map((r) => r.text).join("");
          if (o.text != null) return String(o.text);
          if (o.result != null) return String(o.result);
        }
        return String(v);
      });
      parts.push(cells.join("\t"));
    });
    parts.push("");
  });
  return parts.join("\n");
}

function extractPptx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const slides = Object.keys(files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const n = (s: string) => Number(s.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return n(a) - n(b);
    });
  const out: string[] = [];
  for (const path of slides) {
    const xml = strFromU8(files[path]);
    const text = xml
      .replace(/<a:p[ >]/g, "\n<a:p ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const idx = path.match(/slide(\d+)\.xml/)?.[1] ?? "?";
    out.push(`--- Slide ${idx} ---\n${text}`);
  }
  return out.join("\n\n");
}

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
    if (name.endsWith(".docx") || mime.includes("wordprocessingml"))
      return cap(await extractDocx(buffer));
    if (name.endsWith(".xlsx") || mime.includes("spreadsheetml"))
      return cap(await extractXlsx(buffer));
    if (name.endsWith(".pptx") || mime.includes("presentationml")) return cap(extractPptx(buffer));
    if (name.endsWith(".csv") || mime === "text/csv")
      return cap(new TextDecoder("utf-8").decode(buffer));
    if (
      mime.startsWith("text/") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".json")
    ) {
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
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    parts.push(`=== Sheet: ${name} ===`);
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    for (const row of aoa) {
      parts.push((row as unknown[]).map((c) => (c == null ? "" : String(c))).join("\t"));
    }
    parts.push("");
  }
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

// Bulk FAQ import: CSV/XLSX parsed directly; PDF/DOCX extracted then sent to
// the configured AI chat provider (Lovable Gateway on Cloud, customer's
// Azure/OpenAI-compatible endpoint on Self-Hosted) to propose Q&A pairs.
// All parsing happens server-side only — the browser never sees raw file
// bytes beyond what it uploaded.
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { requireAnyPermission, resolveCompanyForWrite } from "@/lib/authorization";
import { getFaqRepository } from "@/lib/providers/registry";
import { uuidString } from "@/lib/zod-uuid";

export interface FaqImportRow {
  question_de: string;
  question_en: string;
  answer_de: string;
  answer_en: string;
  category: string;
  is_active: boolean;
  error: string | null;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

// Column aliases, case-insensitive, tolerant of Romanian headers.
const QUESTION_KEYS = ["question", "question_en", "question_de", "intrebare", "întrebare"];
const QUESTION_DE_KEYS = ["question_de", "frage"];
const ANSWER_KEYS = ["answer", "answer_en", "answer_de", "raspuns", "răspuns"];
const ANSWER_DE_KEYS = ["answer_de", "antwort"];
const CATEGORY_KEYS = ["category", "categorie", "categorie", "kategorie"];
const ACTIVE_KEYS = ["is_active", "active", "activ"];

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}

function rowFromRecord(row: Record<string, string>): FaqImportRow {
  const question = pick(row, QUESTION_KEYS) ?? "";
  const questionDe = pick(row, QUESTION_DE_KEYS) ?? question;
  const answer = pick(row, ANSWER_KEYS) ?? "";
  const answerDe = pick(row, ANSWER_DE_KEYS) ?? answer;
  const category = pick(row, CATEGORY_KEYS) ?? "general";
  const activeRaw = pick(row, ACTIVE_KEYS);
  const isActive =
    activeRaw === undefined
      ? true
      : !["false", "0", "no", "nu"].includes(activeRaw.trim().toLowerCase());

  let error: string | null = null;
  if (!question.trim()) error = "Missing question";
  else if (!answer.trim()) error = "Missing answer";

  return {
    question_en: question.trim(),
    question_de: questionDe.trim(),
    answer_en: answer.trim(),
    answer_de: answerDe.trim(),
    category: category.trim() || "general",
    is_active: isActive,
    error,
  };
}

function parseCsv(text: string): FaqImportRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === "," || c === ";") {
        cells.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    return cells;
  };

  const headers = splitLine(lines[0]).map(normalizeHeader);
  const rows: FaqImportRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? "").trim();
    });
    rows.push(rowFromRecord(record));
  }
  return rows;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<FaqImportRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return records.map((r) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      normalized[normalizeHeader(k)] = String(v ?? "").trim();
    }
    return rowFromRecord(normalized);
  });
}

async function parseViaAi(text: string): Promise<FaqImportRow[]> {
  const { generateText } = await import("ai");
  const { resolveChatModel } = await import("@/lib/ai-provider.server");
  const { extractFaqItems } = await import("@/lib/faq-import-json");
  const truncated = text.slice(0, 30000);
  const { text: raw } = await generateText({
    model: resolveChatModel("chat-fast"),
    temperature: 0,
    system:
      "You extract FAQ question/answer pairs from documents. Respond with STRICT JSON only: " +
      '{"items":[{"question":"...","answer":"...","category":"general"}]}. ' +
      "Keep every pair in the SAME language as the source document. " +
      "Extract all pairs you find, not just the first one. " +
      "No markdown, no code fences, no commentary, just the JSON object.",
    prompt: `Extract every distinct question/answer pair from this document text:\n\n${truncated}`,
  });

  const items = extractFaqItems(raw);
  if (items.length === 0) {
    throw new Error(
      "No question/answer pairs could be extracted from this document. Check the file content or import a CSV/XLSX instead.",
    );
  }
  return items.map((it) =>
    rowFromRecord({
      question: it.question,
      answer: it.answer,
      category: it.category,
    }),
  );
}


const ParseInput = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  data_base64: z.string().min(1),
});

export const parseFaqImport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ParseInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "faq");
    await requireAnyPermission(context, ["faq.edit", "faq.create", "knowledge.manage"]);

    const name = data.filename.toLowerCase();
    const isCsv = data.content_type.includes("csv") || name.endsWith(".csv");
    const isXlsx =
      data.content_type.includes("spreadsheet") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls");
    const isPdf = data.content_type === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      data.content_type.includes("wordprocessingml") || name.endsWith(".docx");

    const buffer = base64ToArrayBuffer(data.data_base64);

    let rows: FaqImportRow[];
    if (isCsv) {
      rows = parseCsv(new TextDecoder("utf-8").decode(buffer));
    } else if (isXlsx) {
      rows = await parseXlsx(buffer);
    } else if (isPdf || isDocx) {
      const { extractText } = await import("@/lib/doc-processing.server");
      const text = await extractText(buffer, data.filename, data.content_type);
      if (!text.trim()) throw new Error("No text extracted from document");
      rows = await parseViaAi(text);
    } else {
      throw new Error("Unsupported file type. Use CSV, XLSX, PDF or DOCX.");
    }

    if (rows.length === 0) throw new Error("No rows detected in file");
    return { rows };
  });

const ImportRowInput = z.object({
  question_de: z.string().min(1),
  question_en: z.string().min(1),
  answer_de: z.string().min(1),
  answer_en: z.string().min(1),
  category: z.string().min(1),
});

const ImportInput = z.object({
  rows: z.array(ImportRowInput).min(1),
  company_id: uuidString().optional().nullable(),
});

export const importFaqs = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "faq");
    await requireAnyPermission(context, ["faq.edit", "faq.create", "knowledge.manage"]);

    const { emitWebhookEvent } = await import("@/lib/webhook-dispatch.server");
    const repo = getFaqRepository(context.supabase);
    const companyId = await resolveCompanyForWrite(context, data.company_id);

    let created = 0;
    let skipped = 0;
    for (const row of data.rows) {
      try {
        const inserted = await repo.insert(companyId, {
          question_de: row.question_de,
          question_en: row.question_en,
          answer_de: row.answer_de,
          answer_en: row.answer_en,
          category: row.category,
        });
        void emitWebhookEvent(companyId, "faq.created", {
          id: inserted.id,
          category: inserted.category,
          question_en: inserted.question_en,
        });
        created += 1;
      } catch {
        skipped += 1;
      }
    }

    return { created, skipped };
  });

/**
 * Tolerant extraction of FAQ question/answer pairs from a model response.
 *
 * Local models (Ollama on Self-Hosted) frequently wrap JSON in Markdown
 * fences, prepend commentary, emit trailing commas, or return a bare array
 * instead of `{ items: [...] }`. None of that is a user-facing error, so the
 * extractor normalises all of those shapes before failing.
 */

export interface ExtractedFaqItem {
  question: string;
  answer: string;
  category: string;
}

/** Strip Markdown code fences and leading prose/labels. */
function stripFences(raw: string): string {
  let out = raw.trim();
  const fence = out.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) out = fence[1].trim();
  return out.replace(/^[^[{]*(?=[[{])/, "").trim();
}

/** Remove trailing commas before } or ] — the most common local-model defect. */
function stripTrailingCommas(input: string): string {
  return input.replace(/,\s*(?=[}\]])/g, "");
}

/** Balanced-brace slice starting at the first { or [ so trailing prose is ignored. */
function balancedSlice(input: string): string | null {
  const start = input.search(/[[{]/);
  if (start === -1) return null;
  const open = input[start] === "{" ? "{" : "[";
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return null;
}

function coerceItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["items", "faqs", "faq", "pairs", "questions", "data", "result"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    // Single pair returned as a bare object.
    if (typeof obj.question === "string" || typeof obj.q === "string") return [obj];
  }
  return [];
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

/**
 * Parse a model response into FAQ items. Returns `[]` when the response is
 * valid JSON but carries no pairs; throws only when nothing JSON-shaped can
 * be recovered at all.
 */
export function extractFaqItems(raw: string): ExtractedFaqItem[] {
  const text = stripFences(raw ?? "");
  if (!text) throw new Error("The AI returned an empty response. Try again or use a CSV/XLSX file.");

  const candidates = [text, balancedSlice(text) ?? "", stripTrailingCommas(text)]
    .concat(stripTrailingCommas(balancedSlice(text) ?? ""))
    .filter(Boolean);

  let parsed: unknown = undefined;
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      /* try next candidate */
    }
  }
  if (parsed === undefined) {
    throw new Error(
      "The AI response could not be read as JSON. Try again, or import a CSV/XLSX file instead.",
    );
  }

  return coerceItems(parsed)
    .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
    .map((it) => ({
      question: pick(it, ["question", "q", "frage", "question_en", "question_de", "title"]),
      answer: pick(it, ["answer", "a", "antwort", "answer_en", "answer_de", "response", "text"]),
      category: pick(it, ["category", "kategorie", "topic", "section"]) || "general",
    }))
    .filter((it) => it.question || it.answer);
}

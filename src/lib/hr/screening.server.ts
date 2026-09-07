// OPSQAI HR — candidate CV analysis.
//
// Grounding rules (non-negotiable):
//  * the model sees ONLY the uploaded CV text and the saved job criteria;
//  * every verdict must carry a literal quote from the CV, otherwise UNKNOWN;
//  * the score is computed in code from the configured weights, never by the AI;
//  * the AI never rejects, shortlists or hires — a human decides.

import { resolveChatModel } from "@/lib/ai-provider.server";
import type { HrCandidateEvidence, HrCriterion } from "./types-ext";

export interface CvAnalysis {
  extracted: Record<string, string>;
  evidence: HrCandidateEvidence[];
  score: number;
}

const VERDICTS = new Set(["met", "partial", "not_met", "unknown"]);

/** Deterministic score: weighted verdicts, required-but-missing capped at 49%. */
export function scoreFromEvidence(criteria: HrCriterion[], evidence: HrCandidateEvidence[]): number {
  if (!criteria.length) return 0;
  const weightOf = (c: HrCriterion) => (Number.isFinite(c.weight) && c.weight > 0 ? c.weight : 1);
  const total = criteria.reduce((s, c) => s + weightOf(c), 0);
  let earned = 0;
  let requiredMissing = false;
  for (const c of criteria) {
    const e = evidence.find((x) => x.criterion === c.label);
    const factor =
      e?.verdict === "met" ? 1 : e?.verdict === "partial" ? 0.5 : 0;
    if (c.required && factor < 1) requiredMissing = true;
    earned += weightOf(c) * factor;
  }
  const pct = Math.round((earned / total) * 1000) / 10;
  return requiredMissing ? Math.min(pct, 49) : pct;
}

export async function analyseCv(
  cvText: string,
  criteria: HrCriterion[],
  options: { blind?: boolean; language?: "en" | "de" | "ro" } = {},
): Promise<CvAnalysis> {
  const text = (options.blind ? redact(cvText) : cvText).slice(0, 24_000).trim();
  if (text.length < 120) throw new Error("The CV text is too short to analyse.");
  if (!criteria.length) throw new Error("Add screening criteria to the job profile first.");

  const lang = (options.language ?? "en").toUpperCase();
  const { generateText } = await import("ai");
  const system = `You screen a CV against fixed criteria for an HR manager.
Rules:
- Use ONLY the CV text below. Never infer, assume or add outside knowledge.
- For every criterion return one of: met, partial, not_met, unknown.
- Use "unknown" whenever the CV does not state it. Never guess.
- Every verdict must include "quote": a literal sentence copied from the CV (empty string for unknown).
- Do not recommend hiring or rejection. Do not rank. Do not compute a score.
- Notes in ${lang} only.
Return STRICT JSON:
{"summary":{"years_experience":"...","languages":["..."],"education":"...","current_role":"..."},
 "evidence":[{"criterion":"<exact criterion label>","verdict":"met|partial|not_met|unknown","quote":"...","note":"..."}]}
Use "UNKNOWN" as the value of any summary field the CV does not state.`;
  const prompt = `CRITERIA:
${criteria.map((c) => `- ${c.label}${c.required ? " (required)" : ""}`).join("\n")}

=== CV TEXT ===
${text}`;

  const { text: raw } = await generateText({
    model: resolveChatModel("chat"),
    temperature: 0,
    system,
    prompt,
  });

  const parsed = parseJson(raw);
  const rawEvidence = Array.isArray(parsed["evidence"]) ? parsed["evidence"] : [];
  const evidence: HrCandidateEvidence[] = criteria.map((c) => {
    const hit = (rawEvidence as Array<Record<string, unknown>>).find(
      (e) => String(e["criterion"] ?? "").trim().toLowerCase() === c.label.trim().toLowerCase(),
    );
    const verdict = String(hit?.["verdict"] ?? "unknown");
    const quote = String(hit?.["quote"] ?? "").trim();
    // A verdict without a literal quote from the CV is not evidence — downgrade it.
    const grounded =
      VERDICTS.has(verdict) && verdict !== "unknown" && quote.length > 8 && text.includes(quote.slice(0, 40))
        ? (verdict as HrCandidateEvidence["verdict"])
        : verdict === "not_met" && quote.length === 0
          ? "unknown"
          : VERDICTS.has(verdict) && quote.length > 8
            ? (verdict as HrCandidateEvidence["verdict"])
            : "unknown";
    return {
      criterion: c.label,
      verdict: grounded,
      quote: grounded === "unknown" ? "" : quote,
      note: hit?.["note"] ? String(hit["note"]).slice(0, 400) : null,
    };
  });

  const rawSummary =
    parsed["summary"] && typeof parsed["summary"] === "object"
      ? (parsed["summary"] as Record<string, unknown>)
      : {};
  const summary: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSummary)) {
    summary[k] = Array.isArray(v) ? v.map(String).join(", ") : String(v ?? "UNKNOWN");
  }

  return { extracted: summary, evidence, score: scoreFromEvidence(criteria, evidence) };
}

function parseJson(raw: string): Record<string, unknown> {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The analysis could not be read. Try again.");
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error("The analysis could not be read. Try again.");
  }
}

/** Blind screening: hide identity signals so only qualifications remain. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
    .replace(/\b(male|female|männlich|weiblich|masculin|feminin)\b/gi, "[redacted]")
    .replace(/\b(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, "[date]")
    .replace(/\bhttps?:\/\/\S+/g, "[link]");
}

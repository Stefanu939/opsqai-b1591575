/**
 * Academy grounding checks.
 *
 * The AI teacher and the quiz generator may only use wording that is actually
 * present in the lesson (which itself is generated from the SOP). These pure
 * helpers detect content that cannot be traced back to the lesson text:
 * invented specialised terms and invented numbers.
 */

const GENERIC_WORDS = new Set([
  // very common cross-language function words / training vocabulary that may
  // legitimately appear in a question even when absent from the lesson body
  "lesson",
  "lektion",
  "lecție",
  "lectie",
  "adevărat",
  "adevarat",
  "fals",
  "richtig",
  "falsch",
  "true",
  "false",
  "correct",
  "corect",
  "correcte",
  "answer",
  "răspuns",
  "raspuns",
  "antwort",
  "question",
  "întrebare",
  "intrebare",
  "procedure",
  "procedura",
  "procedură",
  "verfahren",
  "trebuie",
  "should",
  "always",
  "mereu",
  "immer",
  "niciodată",
  "niciodata",
  "never",
  "nie",
]);

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Content words (>=6 chars) that do not appear anywhere in the source text. */
export function unsupportedTerms(candidate: string, source: string): string[] {
  const haystack = fold(source);
  const words = fold(candidate)
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (const word of words) {
    if (word.length < 6) continue;
    if (GENERIC_WORDS.has(word)) continue;
    if (/\d/.test(word)) continue;
    // tolerate inflection: match on a shortened stem
    const stem = word.slice(0, Math.max(5, word.length - 2));
    if (!haystack.includes(stem)) out.add(word);
  }
  return [...out];
}

/** Numbers/quantities in the candidate text that the source never mentions. */
export function unsupportedNumbers(candidate: string, source: string): string[] {
  const haystack = source.replace(/[\s.,]/g, "");
  const numbers = (candidate.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/[.,]/g, ""));
  return [...new Set(numbers.filter((n) => n.length >= 1 && !haystack.includes(n)))];
}

export type GroundingVerdict = {
  grounded: boolean;
  terms: string[];
  numbers: string[];
};

/**
 * A candidate passage is considered grounded when it introduces no invented
 * numbers and — only when the output language matches the lesson language, so
 * translated wording is not punished — at most `maxNewTerms` unfamiliar words.
 */
export function checkAcademyGrounding(
  candidate: string,
  source: string,
  options: { checkTerms?: boolean; maxNewTerms?: number } = {},
): GroundingVerdict {
  const { checkTerms = false, maxNewTerms = 3 } = options;
  const terms = checkTerms ? unsupportedTerms(candidate, source) : [];
  const numbers = unsupportedNumbers(candidate, source);
  return { grounded: numbers.length === 0 && terms.length <= maxNewTerms, terms, numbers };
}

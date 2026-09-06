/**
 * Academy quiz grading normalization.
 *
 * The quiz generator is inconsistent about how it expresses the correct answer:
 * sometimes an option letter ("A", "b)", "2."), sometimes the full option text,
 * sometimes a paraphrase, and for true/false sometimes English while the visible
 * options are localized ("Adevărat"/"Fals"). Grading therefore resolves BOTH the
 * stored correct answer and the learner answer to an option INDEX and compares
 * indices. Pure functions here so they can be unit tested.
 */

const TRUE_WORDS = [
  "true",
  "wahr",
  "richtig",
  "adevarat",
  "adevărat",
  "vrai",
  "verdadero",
  "vero",
  "prawda",
  "yes",
  "da",
  "ja",
  "oui",
  "si",
  "sí",
];
const FALSE_WORDS = [
  "false",
  "falsch",
  "unwahr",
  "fals",
  "faux",
  "falso",
  "falsz",
  "fałsz",
  "no",
  "nu",
  "nein",
  "non",
];

/** Lowercase, strip accents, punctuation and list prefixes such as "a)" or "1." */
export function normalizeAnswerText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*[(\[]?[a-d0-9][)\].:-]\s+/i, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function boolWord(value: string): boolean | null {
  const n = normalizeAnswerText(value);
  if (!n) return null;
  if (TRUE_WORDS.includes(n)) return true;
  if (FALSE_WORDS.includes(n)) return false;
  return null;
}

/** Bare option letter/number reference such as "A", "b)", "3." */
function letterIndex(value: string, optionCount: number): number | null {
  const m = value.trim().match(/^[(\[]?([a-dA-D1-4])[)\].:]?$/);
  if (!m) return null;
  const ch = m[1]!.toLowerCase();
  const idx = /[1-4]/.test(ch) ? Number(ch) - 1 : ch.charCodeAt(0) - 97;
  return idx >= 0 && idx < optionCount ? idx : null;
}

/**
 * Resolve a raw answer (stored correct answer or learner answer) to an option
 * index, or null when it cannot be located among the options.
 */
export function resolveOptionIndex(
  raw: string | undefined | null,
  options: string[],
  type: "multiple_choice" | "true_false",
): number | null {
  const value = (raw ?? "").trim();
  if (!value || options.length === 0) return null;

  // 1. exact / normalized option text
  const normalized = normalizeAnswerText(value);
  const normalizedOptions = options.map(normalizeAnswerText);
  const exact = normalizedOptions.indexOf(normalized);
  if (exact !== -1) return exact;

  // 2. true/false semantics, independent of the option language
  if (type === "true_false") {
    const b = boolWord(value);
    if (b !== null) {
      const match = options.findIndex((opt) => boolWord(opt) === b);
      if (match !== -1) return match;
      // Options are not recognizable true/false labels: assume [true, false].
      return b ? 0 : 1;
    }
  }

  // 3. bare option letter or number
  const letter = letterIndex(value, options.length);
  if (letter !== null) return letter;

  // 4. containment either way (paraphrase / truncation), only if unambiguous
  if (normalized.length >= 4) {
    const hits = normalizedOptions
      .map((opt, i) => ({ opt, i }))
      .filter(({ opt }) => opt.length >= 4 && (opt.includes(normalized) || normalized.includes(opt)));
    if (hits.length === 1) return hits[0]!.i;
  }

  return null;
}

/** Placeholder expected answers that must never be graded as wrong. */
export function isUngradeableExpectedAnswer(value: string | undefined | null): boolean {
  const n = normalizeAnswerText(value ?? "");
  if (!n) return true;
  return [
    "see lesson content",
    "siehe lektionsinhalt",
    "vezi continutul lectiei",
    "n a",
    "na",
    "unknown",
  ].includes(n);
}

export type GradedChoice = {
  /** true when the learner picked the stored correct option */
  correct: boolean;
  /** false when the question could not be graded fairly (excluded from score) */
  scored: boolean;
  /** full text of the correct option, in the learner's language, when known */
  correctAnswerText: string;
};

export function gradeChoiceAnswer(
  learnerAnswer: string,
  storedCorrectAnswer: string,
  options: string[],
  type: "multiple_choice" | "true_false",
): GradedChoice {
  const opts = options.length ? options : type === "true_false" ? ["True", "False"] : [];
  const correctIndex = resolveOptionIndex(storedCorrectAnswer, opts, type);
  if (correctIndex === null || isUngradeableExpectedAnswer(storedCorrectAnswer)) {
    return { correct: false, scored: false, correctAnswerText: "" };
  }
  const learnerIndex = resolveOptionIndex(learnerAnswer, opts, type);
  return {
    correct: learnerIndex !== null && learnerIndex === correctIndex,
    scored: true,
    correctAnswerText: opts[correctIndex] ?? storedCorrectAnswer,
  };
}

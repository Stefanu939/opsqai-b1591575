export const ACADEMY_LANGUAGES = {
  en: { label: "English", locale: "en-US", trueLabel: "True", falseLabel: "False" },
  de: { label: "German (Deutsch)", locale: "de-DE", trueLabel: "Richtig", falseLabel: "Falsch" },
  ro: { label: "Romanian (Română)", locale: "ro-RO", trueLabel: "Adevărat", falseLabel: "Fals" },
  fr: { label: "French (Français)", locale: "fr-FR", trueLabel: "Vrai", falseLabel: "Faux" },
  es: { label: "Spanish (Español)", locale: "es-ES", trueLabel: "Verdadero", falseLabel: "Falso" },
  it: { label: "Italian (Italiano)", locale: "it-IT", trueLabel: "Vero", falseLabel: "Falso" },
  pt: { label: "Portuguese (Português)", locale: "pt-PT", trueLabel: "Verdadeiro", falseLabel: "Falso" },
  pl: { label: "Polish (Polski)", locale: "pl-PL", trueLabel: "Prawda", falseLabel: "Fałsz" },
  uk: { label: "Ukrainian (Українська)", locale: "uk-UA", trueLabel: "Правда", falseLabel: "Неправда" },
} as const;

export type AcademyLanguageCode = keyof typeof ACADEMY_LANGUAGES;

export function normalizeAcademyLanguage(value: unknown): AcademyLanguageCode {
  if (typeof value !== "string") return "en";
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  return code in ACADEMY_LANGUAGES ? (code as AcademyLanguageCode) : "en";
}

export function academyLanguageInstruction(value: unknown): string {
  const code = normalizeAcademyLanguage(value);
  const language = ACADEMY_LANGUAGES[code];
  const scriptRule =
    code === "uk"
      ? "Use natural modern Ukrainian. Do not use Russian vocabulary or Russian grammar."
      : "Use the Latin alphabet. Cyrillic text is strictly forbidden.";
  return `${language.label}, locale ${language.locale} (language code: ${code}). ${scriptRule}`;
}

export function hasWrongAcademyScript(text: string, value: unknown): boolean {
  const code = normalizeAcademyLanguage(value);
  if (code !== "uk") return /[\u0400-\u052f]/u.test(text);
  return false;
}

type LocalizedFallback = {
  purposeQuestion: (title: string) => string;
  purposeAnswer: string;
  purposeExplanation: string;
  procedureQuestion: string;
  procedureExplanation: string;
};

const FALLBACKS: Record<AcademyLanguageCode, LocalizedFallback> = {
  en: { purposeQuestion: (t) => `What is the main operational purpose of ${t}?`, purposeAnswer: "The answer should reflect the documented lesson purpose.", purposeExplanation: "The answer is found in the lesson objectives and summary.", procedureQuestion: "The approved procedure described in the lesson must be followed.", procedureExplanation: "The lesson is based on approved operational knowledge." },
  de: { purposeQuestion: (t) => `Was ist der wichtigste betriebliche Zweck von ${t}?`, purposeAnswer: "Die Antwort soll den dokumentierten Zweck der Lektion wiedergeben.", purposeExplanation: "Die Antwort steht in den Lernzielen und in der Zusammenfassung.", procedureQuestion: "Das in der Lektion beschriebene freigegebene Verfahren muss befolgt werden.", procedureExplanation: "Die Lektion basiert auf freigegebenem Betriebswissen." },
  ro: { purposeQuestion: (t) => `Care este scopul operațional principal al lecției „${t}”?`, purposeAnswer: "Răspunsul trebuie să reflecte scopul documentat al lecției.", purposeExplanation: "Răspunsul se găsește în obiectivele și rezumatul lecției.", procedureQuestion: "Procedura aprobată descrisă în lecție trebuie respectată.", procedureExplanation: "Lecția se bazează pe informații operaționale aprobate." },
  fr: { purposeQuestion: (t) => `Quel est l’objectif opérationnel principal de « ${t} » ?`, purposeAnswer: "La réponse doit refléter l’objectif documenté de la leçon.", purposeExplanation: "La réponse se trouve dans les objectifs et le résumé de la leçon.", procedureQuestion: "La procédure approuvée décrite dans la leçon doit être respectée.", procedureExplanation: "La leçon repose sur des connaissances opérationnelles approuvées." },
  es: { purposeQuestion: (t) => `¿Cuál es el objetivo operativo principal de «${t}»?`, purposeAnswer: "La respuesta debe reflejar el objetivo documentado de la lección.", purposeExplanation: "La respuesta se encuentra en los objetivos y el resumen de la lección.", procedureQuestion: "Debe seguirse el procedimiento aprobado descrito en la lección.", procedureExplanation: "La lección se basa en conocimientos operativos aprobados." },
  it: { purposeQuestion: (t) => `Qual è lo scopo operativo principale di «${t}»?`, purposeAnswer: "La risposta deve riflettere lo scopo documentato della lezione.", purposeExplanation: "La risposta si trova negli obiettivi e nel riepilogo della lezione.", procedureQuestion: "La procedura approvata descritta nella lezione deve essere rispettata.", procedureExplanation: "La lezione si basa su conoscenze operative approvate." },
  pt: { purposeQuestion: (t) => `Qual é o principal objetivo operacional de «${t}»?`, purposeAnswer: "A resposta deve refletir o objetivo documentado da lição.", purposeExplanation: "A resposta encontra-se nos objetivos e no resumo da lição.", procedureQuestion: "O procedimento aprovado descrito na lição deve ser seguido.", procedureExplanation: "A lição baseia-se em conhecimento operacional aprovado." },
  pl: { purposeQuestion: (t) => `Jaki jest główny cel operacyjny lekcji „${t}”?`, purposeAnswer: "Odpowiedź powinna odzwierciedlać udokumentowany cel lekcji.", purposeExplanation: "Odpowiedź znajduje się w celach i podsumowaniu lekcji.", procedureQuestion: "Należy przestrzegać zatwierdzonej procedury opisanej w lekcji.", procedureExplanation: "Lekcja opiera się na zatwierdzonej wiedzy operacyjnej." },
  uk: { purposeQuestion: (t) => `Яка головна операційна мета уроку «${t}»?`, purposeAnswer: "Відповідь має відображати задокументовану мету уроку.", purposeExplanation: "Відповідь міститься в цілях і підсумку уроку.", procedureQuestion: "Необхідно дотримуватися затвердженої процедури, описаної в уроці.", procedureExplanation: "Урок ґрунтується на затверджених операційних знаннях." },
};

const FALSE_STATEMENTS: Record<AcademyLanguageCode, { question: string; explanation: string }> = {
  en: { question: "The procedure in this lesson may be skipped when you are in a hurry.", explanation: "The lesson requires the approved procedure to be followed every time." },
  de: { question: "Das Verfahren aus dieser Lektion darf bei Zeitdruck übersprungen werden.", explanation: "Die Lektion verlangt, das freigegebene Verfahren jedes Mal einzuhalten." },
  ro: { question: "Procedura din această lecție poate fi sărită atunci când ești grăbit.", explanation: "Lecția cere ca procedura aprobată să fie respectată de fiecare dată." },
  fr: { question: "La procédure de cette leçon peut être ignorée en cas d’urgence.", explanation: "La leçon exige que la procédure approuvée soit suivie à chaque fois." },
  es: { question: "El procedimiento de esta lección puede omitirse cuando hay prisa.", explanation: "La lección exige seguir el procedimiento aprobado siempre." },
  it: { question: "La procedura di questa lezione può essere saltata quando si ha fretta.", explanation: "La lezione richiede di seguire sempre la procedura approvata." },
  pt: { question: "O procedimento desta lição pode ser ignorado quando há pressa.", explanation: "A lição exige que o procedimento aprovado seja seguido sempre." },
  pl: { question: "Procedurę z tej lekcji można pominąć, gdy brakuje czasu.", explanation: "Lekcja wymaga, aby zatwierdzona procedura była stosowana za każdym razem." },
  uk: { question: "Процедуру з цього уроку можна пропустити, коли бракує часу.", explanation: "Урок вимагає щоразу дотримуватися затвердженої процедури." },
};

/**
 * Source-based fallback quiz. Every question is true/false (yes/no) so that
 * grading is deterministic and never depends on free-text interpretation.
 */
export function localizedAcademyQuizFallback(value: unknown, title: string) {
  const code = normalizeAcademyLanguage(value);
  const labels = ACADEMY_LANGUAGES[code];
  const copy = FALLBACKS[code];
  const wrong = FALSE_STATEMENTS[code];
  const options = [labels.trueLabel, labels.falseLabel];
  void title;
  return [
    { type: "true_false" as const, question: copy.procedureQuestion, options, correct_answer: labels.trueLabel, explanation: copy.procedureExplanation },
    { type: "true_false" as const, question: wrong.question, options, correct_answer: labels.falseLabel, explanation: wrong.explanation },
  ];
}

/* ------------------- True/False only quiz + language quality ------------------- */

/** The two visible answer options for a true/false (yes/no) question. */
export function academyTrueFalseOptions(value: unknown): [string, string] {
  const labels = ACADEMY_LANGUAGES[normalizeAcademyLanguage(value)];
  return [labels.trueLabel, labels.falseLabel];
}

const REQUIRED_DIACRITICS: Partial<Record<AcademyLanguageCode, RegExp>> = {
  ro: /[ăâîșşțţ]/i,
  pl: /[ąćęłńóśźż]/i,
};

const STOPWORDS: Record<AcademyLanguageCode, string[]> = {
  en: ["the", "and", "with", "must", "that", "from", "when", "which", "this"],
  de: ["der", "die", "das", "und", "muss", "nicht", "werden", "beim", "eine"],
  ro: ["este", "care", "sunt", "trebuie", "pentru", "lecție", "lectie", "din", "și", "si", "nu", "cu"],
  fr: ["les", "des", "doit", "pour", "avec", "être", "etre", "dans", "cette"],
  es: ["los", "las", "debe", "para", "con", "esta", "una", "según", "segun"],
  it: ["gli", "deve", "per", "con", "della", "questa", "una", "sono"],
  pt: ["dos", "deve", "para", "com", "esta", "uma", "segundo", "não", "nao"],
  pl: ["jest", "musi", "dla", "oraz", "nie", "które", "ktore", "przy"],
  uk: ["що", "має", "для", "не", "або", "цей", "при"],
};

function stopwordHits(words: string[], list: string[]): number {
  return words.filter((w) => list.includes(w)).length;
}

/**
 * Detects clear language-quality defects in generated Academy text: wrong
 * script, missing mandatory diacritics (Romanian/Polish), or text written in a
 * different language than the learner selected. Returns null when the text
 * looks acceptable.
 */
export function academyLanguageQualityIssue(
  text: string,
  value: unknown,
): "script" | "diacritics" | "language" | null {
  const code = normalizeAcademyLanguage(value);
  const clean = (text ?? "").trim();
  if (clean.length < 24) return null;
  if (hasWrongAcademyScript(clean, code)) return "script";

  const diacritics = REQUIRED_DIACRITICS[code];
  if (diacritics && clean.length >= 120 && !diacritics.test(clean)) return "diacritics";

  const words = clean
    .toLowerCase()
    .replace(/[^\p{L}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 12) return null;
  const target = stopwordHits(words, STOPWORDS[code]);
  const rivals = (Object.keys(STOPWORDS) as AcademyLanguageCode[])
    .filter((c) => c !== code)
    .map((c) => stopwordHits(words, STOPWORDS[c]));
  const best = Math.max(0, ...rivals);
  if (target === 0 && best >= 3) return "language";
  if (best >= target * 3 && best >= 5) return "language";
  return null;
}

export function academyLanguageCorrection(
  issue: "script" | "diacritics" | "language",
  value: unknown,
): string {
  const instruction = academyLanguageInstruction(value);
  if (issue === "diacritics")
    return `Your previous text was missing the mandatory diacritics. Rewrite everything in ${instruction} with fully correct spelling and all diacritical marks.`;
  return `Your previous text was not written in the target language. Rewrite everything from scratch exclusively in ${instruction}, with idiomatic, grammatically correct sentences.`;
}

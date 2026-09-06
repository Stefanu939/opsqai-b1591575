/**
 * Strict grounding + language rules for the OPSQAI knowledge assistant.
 *
 * Pure functions only, so both products (and the tests) share exactly the
 * decision the /api/chat route enforces server-side. No model call happens
 * when `passesGrounding` is false.
 */

export type GroundingSource = {
  type: "document" | "faq";
  similarity?: number;
  confidence?: "high" | "medium" | "low";
};

/** Minimum cosine similarity for document evidence to count as an answer. */
export const MIN_DOC_SIMILARITY = 0.42;

/** Chunks below this similarity are noise and never enter the prompt context. */
export const RELEVANT_CHUNK_SIMILARITY = 0.34;

/** Keeps only evidence strong enough to be quoted in the grounded prompt. */
export function relevantSources<T extends GroundingSource>(sources: T[]): T[] {
  return sources.filter((s) =>
    s.type === "document"
      ? (s.similarity ?? 0) >= RELEVANT_CHUNK_SIMILARITY
      : s.confidence === "high" || s.confidence === "medium",
  );
}

/**
 * Evidence is sufficient when either a retrieved document chunk clears the
 * similarity threshold or a FAQ matched with high confidence. Medium/low FAQ
 * word-overlap is NOT enough on its own — it used to let the model answer
 * from loosely related titles.
 */
export function passesGrounding(sources: GroundingSource[], confidence: number): boolean {
  if (!sources.length) return false;
  if (sources.some((s) => s.type === "document" && (s.similarity ?? 0) >= MIN_DOC_SIMILARITY))
    return true;
  if (sources.some((s) => s.type === "faq" && s.confidence === "high")) return true;
  return confidence >= MIN_DOC_SIMILARITY;
}

/** Scripts that can never appear in an answer written in a Latin-script language. */
const NON_LATIN_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Thai}\p{Script=Greek}]/u;

const STOPWORD_SETS: Record<string, RegExp> = {
  en: /\b(the|and|is|are|you|must|should|with|from|this|that|not|for)\b/gi,
  de: /\b(und|ist|sind|nicht|muss|müssen|wird|werden|der|die|das|für|mit|auf|bei)\b/gi,
  ro: /\b(și|si|este|sunt|nu|trebuie|pentru|care|dacă|daca|din|cu|la|să|sa)\b/gi,
  fr: /\b(et|est|sont|pas|doit|pour|avec|dans|les|des|une|que)\b/gi,
  es: /\b(y|es|son|no|debe|para|con|los|las|una|que|del)\b/gi,
  it: /\b(e|è|sono|non|deve|per|con|gli|una|che|del|nella)\b/gi,
  nl: /\b(en|is|zijn|niet|moet|voor|met|het|de|een|dat)\b/gi,
};

/** How many stopwords of each supported language the text contains. */
export function languageScores(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [lang, re] of Object.entries(STOPWORD_SETS)) {
    out[lang] = (text.match(re) ?? []).length;
  }
  return out;
}

/**
 * True when the produced answer is clearly NOT in the requested language —
 * either it uses a non-Latin script at all, or another language's stopwords
 * dominate while the target language is essentially absent.
 */
export function answerLanguageMismatch(text: string, target: string): boolean {
  const body = (text ?? "").trim();
  if (!body) return false;
  if (NON_LATIN_SCRIPT.test(body)) return true;
  if (body.length < 60) return false;
  const scores = languageScores(body);
  const targetScore = scores[target] ?? 0;
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best) return false;
  return best[0] !== target && best[1] >= 4 && targetScore <= 1;
}

/**
 * Speculative / advisory openers the grounded prompt forbids. When the model
 * produces one of these it is reasoning from general knowledge, not evidence.
 */
const SPECULATION_MARKERS = [
  /\b(i (assume|guess|believe|think)|probably|presumably|in general|generally speaking|typically you)\b/i,
  /\b(ich (nehme an|vermute|glaube)|wahrscheinlich|im allgemeinen|normalerweise)\b/i,
  /\b(presupun|cred c[ăa]|probabil|[îi]n general|de obicei|de regul[ăa])\b/i,
  /\b(je suppose|probablement|en g[ée]n[ée]ral|habituellement)\b/i,
  /\b(supongo|probablemente|en general|normalmente)\b/i,
];

/** True when the answer speculates instead of quoting company knowledge. */
export function answerSpeculates(text: string): boolean {
  const body = (text ?? "").trim();
  if (!body) return false;
  return SPECULATION_MARKERS.some((re) => re.test(body));
}


const REFUSALS: Record<string, string> = {
  en: "I could not find this information in your company knowledge base. Add or upload the relevant SOP, document or FAQ and ask me again — I only answer from your own documented knowledge.",
  de: "Ich konnte diese Information nicht in der Wissensdatenbank Ihres Unternehmens finden. Bitte laden Sie die entsprechende SOP, das Dokument oder den FAQ-Eintrag hoch und fragen Sie erneut — ich antworte ausschließlich aus Ihrem dokumentierten Wissen.",
  ro: "Nu am găsit această informație în baza de cunoștințe a companiei. Adaugă sau încarcă SOP-ul, documentul sau întrebarea frecventă relevantă și întreabă-mă din nou — răspund exclusiv din cunoștințele documentate de voi.",
  fr: "Je n'ai pas trouvé cette information dans la base de connaissances de votre entreprise. Ajoutez le document, la procédure ou la FAQ correspondante, puis reposez la question — je réponds uniquement à partir de vos connaissances documentées.",
  es: "No encontré esta información en la base de conocimiento de su empresa. Añada el SOP, documento o FAQ correspondiente y vuelva a preguntar: solo respondo con su conocimiento documentado.",
  it: "Non ho trovato questa informazione nella knowledge base della tua azienda. Aggiungi la SOP, il documento o la FAQ pertinente e richiedimelo: rispondo solo dalle tue conoscenze documentate.",
  nl: "Ik kon deze informatie niet vinden in de kennisbank van uw bedrijf. Voeg de betreffende SOP, het document of de FAQ toe en vraag het opnieuw — ik antwoord alleen op basis van uw gedocumenteerde kennis.",
};

/** Cheap script/stopword language detection for the *current* user query. */
export function detectLanguage(query: string, hint?: string | null): string {
  const q = ` ${query.toLowerCase()} `;
  const rules: Array<[string, RegExp]> = [
    ["ro", /[ăâîșț]|\b(care|unde|cum|trebuie|pentru|și|să|nu|este|sunt)\b/],
    ["de", /[äöüß]|\b(wie|was|warum|welche|muss|nicht|und|ist|sind|der|die|das)\b/],
    ["fr", /\b(comment|pourquoi|quel|quelle|est-ce|dois|pas|et|le|la|les)\b/],
    ["es", /\b(cómo|como|por qué|cuál|debo|no|y|el|la|los)\b/],
    ["it", /\b(come|perché|quale|devo|non|e|il|la|gli)\b/],
    ["nl", /\b(hoe|waarom|welke|moet|niet|en|de|het)\b/],
    ["en", /\b(how|what|why|which|should|must|the|and|is|are)\b/],
  ];
  for (const [lang, re] of rules) if (re.test(q)) return lang;
  const h = (hint ?? "en").slice(0, 2).toLowerCase();
  return REFUSALS[h] ? h : "en";
}

/** Localized refusal text used when the grounding gate blocks an answer. */
export function refusalText(query: string, hint?: string | null): string {
  return REFUSALS[detectLanguage(query, hint)] ?? REFUSALS.en;
}

/** Human-readable language names, so the model gets an unambiguous target. */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German (Deutsch)",
  ro: "Romanian (română)",
  fr: "French (français)",
  es: "Spanish (español)",
  it: "Italian (italiano)",
  nl: "Dutch (Nederlands)",
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.slice(0, 2).toLowerCase()] ?? code;
}

/**
 * Answer-language resolution order (spec):
 *   1. explicit language of the current user message
 *   2. language of the running conversation (most recent user turns)
 *   3. user/profile or organization hint passed by the client
 * The language of the retrieved source documents never influences this.
 */
export function resolveAnswerLanguage(
  userTexts: string[],
  hint?: string | null,
): string {
  const texts = userTexts.map((t) => (t ?? "").trim()).filter(Boolean);
  const current = texts[texts.length - 1];
  if (current && current.length >= 8) return detectLanguage(current, hint);
  // Short current turn ("ok", "mai departe"): fall back to the conversation.
  for (let i = texts.length - 1; i >= 0; i--) {
    if (texts[i].length >= 8) return detectLanguage(texts[i], hint);
  }
  if (current) return detectLanguage(current, hint);
  const h = (hint ?? "en").slice(0, 2).toLowerCase();
  return LANGUAGE_NAMES[h] ? h : "en";
}

/** Phrases an answer uses when the approved sources only partially cover it. */
const INCOMPLETE_MARKERS =
  /(not (documented|covered|specified|included)|no (information|details) (about|on)|nu (este|sunt) documentat|nu am g[ăa]sit|nicht dokumentiert|keine (informationen|angaben)|n'est pas document|no est[áa] documentado|non è documentat|niet gedocumenteerd)/i;

export type GapSignal =
  | { isGap: false }
  | { isGap: true; reason: "no_source" | "low_confidence" | "partial_answer" | "weak_spread" };

/**
 * Automatic Knowledge Gap detection — independent of user feedback.
 * Pure so both products and the tests share one decision.
 */
export function detectGapSignal(input: {
  sources: GroundingSource[];
  confidence: number;
  grounded: boolean;
  answerText?: string;
}): GapSignal {
  const { sources, confidence, grounded, answerText } = input;
  if (!sources.length) return { isGap: true, reason: "no_source" };
  if (!grounded) return { isGap: true, reason: "low_confidence" };
  if (answerText && INCOMPLETE_MARKERS.test(answerText))
    return { isGap: true, reason: "partial_answer" };
  const strong = sources.filter(
    (s) => s.type === "document" && (s.similarity ?? 0) >= MIN_DOC_SIMILARITY,
  );
  if (!strong.length && confidence < MIN_DOC_SIMILARITY) {
    const weak = relevantSources(sources);
    if (weak.length >= 3) return { isGap: true, reason: "weak_spread" };
  }
  return { isGap: false };
}

/** Stable dedup key so repeated/similar questions group into one gap. */
export function normalizeGapQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}


/**
 * System prompt for grounded answers. The answer language is always driven by
 * the user's query language, never by the language of the evidence.
 */
export function groundedSystemPrompt(
  context: string,
  answerLanguage: string,
  firstName?: string,
): string {
  return [
    `You are OPSQAI, an enterprise company knowledge assistant. Speak like a warm, professional, clear colleague — never robotic, never stiff corporate boilerplate. Be concise and helpful in tone, but never in content beyond the evidence.`,
    firstName && firstName !== "there"
      ? `The user's first name is ${firstName}. Use it naturally and sparingly — e.g. in a greeting or an occasional contextual moment — never in every message and never forced into a sentence where it feels odd.`
      : ``,
    `ANSWER LANGUAGE (absolute rule): write the entire answer in ${languageName(answerLanguage)} (code: ${answerLanguage}). The COMPANY KNOWLEDGE below may be written in a different language — translate its content faithfully into ${languageName(answerLanguage)}. Never answer in the language of the sources, never mix languages, and keep the "Sources" label and citation titles as-is (document titles and codes stay in their original wording). Only immutable technical terms, product names and document codes may stay untranslated.`,
    `Translating never means inventing: do not add steps, thresholds, roles or explanations that the source does not state. If a detail is missing from the source, say plainly in ${languageName(answerLanguage)} that it is not documented.`,

    `COMPANY KNOWLEDGE below is your ONLY source of truth. Never use outside, general or world knowledge (no capitals, countries, dates, definitions of products, companies, acronyms, laws or tools that are not documented below), never guess, never describe your own capabilities.`,
    `If the COMPANY KNOWLEDGE does not actually answer the question — even if it looks topically related — reply ONLY with a friendly statement that this information is not in the company knowledge base and invite the user to upload the relevant SOP, document or FAQ. Do not add any explanation of the topic itself.`,
    `MIXED QUESTIONS (absolute rule): when one message contains several questions, judge EACH question separately against the COMPANY KNOWLEDGE. Answer only the parts that are documented, and for every other part write one short line saying it is not in the company knowledge base. A documented part NEVER gives you permission to answer an undocumented part — e.g. if the user asks about a documented process and also asks a general-knowledge question (a capital city, a definition, a law, a public fact), you must not answer that general question at all, not even in one word, not even in brackets or a side note.`,
    `Never start an answer with "I assume", "probably", "the term X may mean" or similar speculation. If you would need to assume, refuse instead.`,
    `UNDERSTANDING: interpret everyday, informal wording, synonyms, misspellings and shop-floor slang, and map it onto the documented terminology. Semantic understanding of the question is expected; inventing content is not.`,
    `LENGTH: keep answers short and to the point — normally 2-5 sentences, or up to 6 short bullet points for a procedure. No preamble, no repeating the question, no summary of what you just said, no offers of further help unless the user asks something open.`,
    `CITATIONS: only add a translated "Sources" label with the citations you used ([Document N] / [FAQ N]) when the user asks where the information comes from, asks for a source/document/proof, or asks you to cite. Otherwise give the answer with no Sources block — the interface already shows the sources separately.`,
    `If only part of the question is covered, answer that part and say plainly which part is not documented.`,

    `Earlier conversation turns must not reintroduce world knowledge.`,
    ``,
    `COMPANY KNOWLEDGE:`,
    context || "(none)",
  ].join("\n");
}

/**
 * First name for a warm, human greeting. Prefers the profile's full name,
 * falls back to the email local-part, and — matching the rest of the app
 * (see contact-confirmation email template) — falls back to "there" as a
 * last resort when nothing usable is known about the user.
 */
export function firstNameFrom(fullName?: string | null, email?: string | null): string {
  const fromName = (fullName ?? "").trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = (email ?? "").split("@")[0]?.trim();
  if (local) return local;
  return "there";
}

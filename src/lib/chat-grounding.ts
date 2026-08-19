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
 * similarity threshold or at least one FAQ matched with medium/high score.
 */
export function passesGrounding(sources: GroundingSource[], confidence: number): boolean {
  if (!sources.length) return false;
  if (confidence >= MIN_DOC_SIMILARITY) return true;
  if (sources.some((s) => s.type === "document" && (s.similarity ?? 0) >= MIN_DOC_SIMILARITY))
    return true;
  return sources.some((s) => s.type === "faq" && (s.confidence === "high" || s.confidence === "medium"));
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
    `Answer in this language: ${answerLanguage}. The evidence below may be written in another language — translate it, never switch the answer language.`,
    `COMPANY KNOWLEDGE below is your ONLY source of truth. Never use outside, general or world knowledge (no definitions of products, companies, acronyms, laws or tools that are not documented below), never guess, never describe your own capabilities.`,
    `If the COMPANY KNOWLEDGE does not actually answer the question — even if it looks topically related — reply ONLY with a friendly statement that this information is not in the company knowledge base and invite the user to upload the relevant SOP, document or FAQ. Do not add any explanation of the topic itself.`,
    `Never start an answer with "I assume", "probably", "the term X may mean" or similar speculation. If you would need to assume, refuse instead.`,
    `Quote the concrete steps/rules, then finish with a translated "Sources" label listing the citations you used ([Document N] / [FAQ N]).`,
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

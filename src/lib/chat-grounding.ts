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

/**
 * System prompt for grounded answers. The answer language is always driven by
 * the user's query language, never by the language of the evidence.
 */
export function groundedSystemPrompt(context: string, answerLanguage: string): string {
  return [
    `You are OPSQAI, an enterprise company knowledge assistant. Be warm, concise and helpful in tone — but never in content beyond the evidence.`,
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

import { z } from "zod";

export const ProspectLanguageSchema = z.enum(["ro", "en", "de"]).default("ro");
export type ProspectLanguage = z.infer<typeof ProspectLanguageSchema>;

export function resolvePublicLanguage(saved: unknown, requested: unknown): ProspectLanguage {
  const stored = ProspectLanguageSchema.safeParse(saved);
  if (saved != null && stored.success) return stored.data;
  const url = ProspectLanguageSchema.safeParse(requested);
  return requested != null && url.success ? url.data : "ro";
}

export function prospectLanguageInstruction(language: ProspectLanguage): string {
  const names = { ro: "Romanian (română)", en: "English", de: "German (Deutsch)" };
  return `ACTIVE USER-SELECTED LANGUAGE: ${names[language]}. Answer in ${names[language]} for this turn, regardless of the language of the question or previous replies. This overrides the earlier last-message language rule. Translate all visible rich-card titles, labels, descriptions and disclaimers into this language; keep JSON keys and [[CONTACT_FORM]] unchanged. Preserve conversation context when the selected language changes.`;
}
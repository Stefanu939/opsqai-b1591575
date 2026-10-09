// Romanian CUI/CIF helpers (browser + server safe).

/** Official control-digit check for Romanian fiscal codes (2–10 digits). */
export function isValidCui(raw: string | number | null | undefined): boolean {
  const s = String(raw ?? "").replace(/\D/g, "");
  if (s.length < 2 || s.length > 10 || /^0/.test(s)) return false;
  const key = "753217532";
  const control = Number(s[s.length - 1]);
  const body = s.slice(0, -1).padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(body[i]) * Number(key[i]);
  let c = (sum * 10) % 11;
  if (c === 10) c = 0;
  return c === control;
}

/** Canonical storage form: digits only ("RO 123" → "123"). */
export function normalizeCui(raw: string | number | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** First valid CUI mentioned in free text (e.g. CRM notes "CUI 12345678"). */
export function cuiFromText(text: string | null | undefined): string | null {
  for (const m of String(text ?? "").matchAll(/\b(?:CUI|CIF|cod fiscal)[:\s#]*(?:RO)?\s?(\d{2,10})\b/gi)) {
    if (isValidCui(m[1])) return m[1];
  }
  return null;
}

const LEGAL = /\b(s\.?r\.?l\.?|s\.?a\.?|s\.?c\.?|pfa|ii|srl-d|romania|românia|company|group|grup)\b/gi;

/** Distinctive name words, without legal suffixes or diacritics. */
export function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(LEGAL, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** True when the registered name shares a distinctive word with the text. */
export function nameMatches(registeredName: string, text: string): boolean {
  const tokens = nameTokens(registeredName);
  if (!tokens.length) return false;
  const hay = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

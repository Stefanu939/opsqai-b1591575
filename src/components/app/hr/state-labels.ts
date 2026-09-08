// OPSQAI HR — small localized labels for loading / failure states.
type Lang = string;

export function hrRetryLabel(lang: Lang): string {
  return lang === "de" ? "Erneut versuchen" : lang === "ro" ? "Reîncearcă" : "Retry";
}

export function hrWarningsTitle(lang: Lang): string {
  return lang === "de"
    ? "Teilweise Daten — einige Bereiche konnten nicht geladen werden"
    : lang === "ro"
      ? "Date parțiale — unele secțiuni nu s-au putut încărca"
      : "Partial data — some sections could not be loaded";
}

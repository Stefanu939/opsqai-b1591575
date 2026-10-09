/** Browser-safe matching for MC company, contact and fiscal identifiers. */
export function normalizeClientText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9@]+/g, " ").trim();
}

export function matchesClient(query: string, values: Array<string | null | undefined>) {
  const haystack = normalizeClientText(values.filter(Boolean).join(" "));
  return normalizeClientText(query).split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

export function sameCompany(a: string, b: string) {
  const canonical = (value: string) => normalizeClientText(value).replace(/\b(srl|sa|s a|s r l|sc|gmbh|ltd)\b/g, "").replace(/\s+/g, " ").trim();
  return Boolean(canonical(a)) && canonical(a) === canonical(b);
}
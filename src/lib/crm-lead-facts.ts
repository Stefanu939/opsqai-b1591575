/** Pulls structured company facts (ANAF enrichment) out of free-form CRM notes. */
export function parseLeadFacts(notes: string | null | undefined) {
  const n = notes ?? "";
  const pick = (re: RegExp) => n.match(re)?.[1]?.trim() || null;
  const cui = pick(/CUI[:\s]*(?:RO)?(\d{4,10})/i);
  const caen = pick(/CAEN[:\s]*(\d{4}(?:\s+[^·\n]+)?)/i);
  const reg = pick(/Reg\.?\s*Com\.?[:\s]*([JFC]\d+\/\d+\/\d+|[JFC]\d{6,})/i);
  const staff = pick(/(\d+)\s+angaja/i);
  const address = pick(/((?:JUD\.|MUN\.|STR\.|Str\.)[^·\n]*(?:·\s*Mun\.[^·\n]*)?)/);
  const rest = n
    .split(/\n|·/)
    .map((s) => s.trim())
    .filter((s) => s && !/CUI|CAEN|Reg\.?\s*Com|JUD\.|MUN\.|STR\.|angaja|\[ANAF/i.test(s))
    .join(" · ");
  return { cui, caen, reg, staff, address, rest: rest || null };
}

/** Romanian fixed lines start with 02/03 (or +402/+403); they cannot receive WhatsApp. */
export function isLandline(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^0040/, "").replace(/^40/, "").replace(/^0/, "");
  return /^[23]\d{8}$/.test(d);
}

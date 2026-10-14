// Shared Kai rich-reply format (browser-safe). Both MC and Portal prompts
// append KAI_RICH_FORMAT; KaiRichMessage renders the fenced blocks as cards.
export const KAI_RICH_FORMAT = `
VISUAL FORMAT (optional, only when useful):
- Opening diagnosis: one markdown blockquote line ("> ...").
- Savings/ROI estimate: a fenced block with language "roi" containing JSON:
\`\`\`roi
{"title":"Exemplu de calcul ROI","rows":[["Angajați analizați","40"],["Timp economisit / angajat","15 min/zi"],["Cost orar presupus","15 €"]],"basis":"La 22 de zile lucrătoare pe lună:","result":"3.300 €/lună","note":"Valoare teoretică, nu economie garantată."}
\`\`\`
  Compute the result correctly from the rows; always include a note saying it is an estimate.
- Module ideas: a fenced block with language "modules" containing JSON:
\`\`\`modules
{"title":"Idei de module Custom","items":[{"icon":"truck|academy|shield|docs|users|chart","name":"...","desc":"max 1 sentence"}],"note":"Propuneri conceptuale, de confirmat."}
\`\`\`
- Never put prices/licence costs in these blocks. Keep everything else short markdown.`;

export type RoiBlock = {
  title?: string;
  rows?: [string, string][];
  basis?: string;
  result?: string;
  note?: string;
};
export type ModulesBlock = {
  title?: string;
  items?: { icon?: string; name: string; desc?: string }[];
  note?: string;
};
export type KaiPart =
  | { kind: "md"; text: string }
  | { kind: "roi"; data: RoiBlock }
  | { kind: "modules"; data: ModulesBlock };

export function parseKaiRich(content: string): KaiPart[] {
  const parts: KaiPart[] = [];
  const re = /```(roi|modules)\s*\n([\s\S]*?)(```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ kind: "md", text: content.slice(last, m.index) });
    last = m.index + m[0].length;
    try {
      const data = JSON.parse(m[2]);
      parts.push(m[1] === "roi" ? { kind: "roi", data } : { kind: "modules", data });
    } catch {
      // incomplete (streaming) or malformed — hide raw JSON
    }
  }
  if (last < content.length) parts.push({ kind: "md", text: content.slice(last) });
  return parts.filter((p) => p.kind !== "md" || p.text.trim());
}

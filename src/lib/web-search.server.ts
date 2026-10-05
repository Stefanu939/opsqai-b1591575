// Web search for Kai (Management Center research). Server-only.
export type WebResult = { title: string; url: string; snippet: string };

export async function webSearch(queries: string[]): Promise<WebResult[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const searchKey = process.env["PERPLEXITY_API_KEY"];
  if (!lovableKey || !searchKey) throw new Error("Web search is not configured");
  const res = await fetch("https://connector-gateway.lovable.dev/perplexity/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": searchKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: queries.slice(0, 5), max_results: 8 }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Search failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { results?: unknown };
  const flat = (Array.isArray(json.results) ? json.results : []).flat() as Array<Record<string, unknown>>;
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const r of flat) {
    const url = String(r?.url ?? "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: String(r.title ?? ""), url, snippet: String(r.snippet ?? "") });
  }
  return out.slice(0, 20);
}

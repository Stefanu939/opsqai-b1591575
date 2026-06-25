// Server-only: simple text + CSV generators.

export interface TxtSpec {
  content: string;
}
export function generateTxt(spec: TxtSpec): Uint8Array {
  return new TextEncoder().encode(spec.content ?? "");
}

export interface CsvSpec {
  headers?: string[];
  rows: Array<Array<string | number | boolean | null>>;
  delimiter?: string;
}
function csvCell(v: unknown, delim: string): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(delim) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
export function generateCsv(spec: CsvSpec): Uint8Array {
  const delim = spec.delimiter ?? ",";
  const lines: string[] = [];
  if (spec.headers?.length) lines.push(spec.headers.map((h) => csvCell(h, delim)).join(delim));
  for (const row of spec.rows) lines.push(row.map((c) => csvCell(c, delim)).join(delim));
  // UTF-8 BOM so Excel opens unicode CSVs correctly.
  return new TextEncoder().encode("\uFEFF" + lines.join("\r\n") + "\r\n");
}

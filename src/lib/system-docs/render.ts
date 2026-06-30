import type { SystemDocEntry } from "./catalog";

function bulletList(items: string[]): string {
  return items.filter((s) => s && s.trim()).map((s) => `- ${s.trim()}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.filter((s) => s && s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");
}

/**
 * Render a catalog entry into the canonical OPSQAI documentation Markdown structure.
 * Sections always appear in the same order, even when some are empty, so the AI
 * Assistant gets predictable retrieval blocks.
 */
export function renderSystemDoc(entry: SystemDocEntry): string {
  const related = entry.relatedSlugs.length
    ? entry.relatedSlugs.map((s) => `- ${s}`).join("\n")
    : "- (none)";
  return [
    `# ${entry.title}`,
    "",
    `**Category:** ${entry.category}`,
    "",
    "## Purpose",
    entry.purpose,
    "",
    "## Who can perform this action",
    bulletList(entry.whoCanPerform),
    "",
    "## Required permissions",
    bulletList(entry.requiredPermissions),
    "",
    "## When to use",
    entry.whenToUse,
    "",
    "## Step-by-step instructions",
    numberedList(entry.steps),
    "",
    "## Expected result",
    entry.expectedResult,
    "",
    "## Common mistakes",
    bulletList(entry.commonMistakes),
    "",
    "## Tips & Best Practices",
    bulletList(entry.tips),
    "",
    "## Related Features",
    related,
    "",
  ].join("\n");
}

/**
 * Simple, deterministic 32-bit hash for change detection. Idempotent across runs.
 */
export function hashBody(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

/** Split into ~700-char chunks at paragraph boundaries; small docs → 1 chunk. */
export function chunkBody(body: string, target = 700, overlap = 80): string[] {
  const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > target && cur) {
      out.push(cur);
      const tail = cur.slice(Math.max(0, cur.length - overlap));
      cur = tail ? `${tail}\n\n${p}` : p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [body];
}

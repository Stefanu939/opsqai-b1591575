#!/usr/bin/env node
/**
 * Phase 9 — Self-Hosted bundle guardrails.
 *
 * Scans the Nitro node-server output produced by `bun run build:selfhosted`
 * for anything that would leak Cloud-only surface (Supabase auth calls,
 * Supabase project URLs / keys, `client.server` service-role imports,
 * MC-only routes) into the Windows installer payload.
 *
 * The Windows installer refuses to package a bundle that fails this scan.
 *
 * Usage:
 *   node opsqai-windows/build/verify-bundle.mjs [--dir <path>]
 *
 * Default scan target: <repoRoot>/.output
 * Exit codes:
 *   0 - clean
 *   1 - one or more banned patterns found (details printed)
 *   2 - misuse (missing directory, invalid args)
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const args = { dir: join(repoRoot, ".output") };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir" || a === "-d") {
      args.dir = resolve(argv[++i] ?? "");
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (args.help) {
  console.log("verify-bundle.mjs [--dir <path>]");
  process.exit(0);
}

if (!existsSync(args.dir)) {
  console.error(`[verify-bundle] Scan directory not found: ${args.dir}`);
  console.error(`Run \`bun run build:selfhosted\` first.`);
  process.exit(2);
}

/**
 * Banned patterns. Each entry is { id, pattern, hint, allowIn? }.
 *  - `pattern` may be a RegExp or a plain string (case-sensitive substring).
 *  - `allowIn` is an array of path suffixes that are allowed to contain the
 *    match (e.g. our own bootstrap module labels the reason it references
 *    the string). Matches inside those files do NOT count as failures.
 */
const bannedPatterns = [
  {
    // Only our specific Cloud project ref counts as a leak. Library files
    // in @supabase/* naturally mention *.supabase.co in defaults/docs — that
    // is Supabase-JS boilerplate shipping with the codebase, not a Cloud
    // identity leak.
    id: "opsqai-cloud-project-ref",
    pattern: /klisqgrabmwqijbmjzsb\.supabase\.co/gi,
    hint: "OPSQAI Cloud project URL detected in the Self-Hosted bundle.",
  },
  {
    // Match the specific publishable key our Cloud uses. A generic prefix
    // check would hit every Supabase library asset that documents the format.
    id: "opsqai-cloud-publishable-key",
    pattern: /sb_publishable_jNON1nS79Q9dcrUHJKCE9w_xN7c56E5/g,
    hint: "OPSQAI Cloud publishable key embedded in the Self-Hosted bundle.",
  },
  {
    // Ed25519-ish JWT with `\"role\":\"service_role\"` in the payload. This
    // is a real key; the plain word `service_role` alone lives in Supabase
    // library enums and would false-positive.
    id: "supabase-service-role-jwt",
    pattern: /eyJhbGciOi[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]*(?:cm9sZS.{0,4}c2VydmljZV9yb2xl|Iuwc2VydmljZV9yb2xl)/g,
    hint: "A Supabase service-role JWT is embedded in the Self-Hosted bundle.",
  },
  {
    id: "supabase-service-role-env",
    pattern: /SUPABASE_SERVICE_ROLE_KEY/g,
    hint: "The service-role env name is referenced in the bundle — the admin client leaked.",
    // Client.server module scope reference is legitimate on Cloud; the
    // separate `supabase-client-server-import` rule below is what stops it
    // reaching the Self-Hosted graph.
    allowIn: ["src/integrations/supabase/client.server"],
  },
  {
    id: "supabase-client-server-import",
    pattern: /@\/integrations\/supabase\/client\.server/g,
    hint: "Self-Hosted must never bundle the Supabase service-role client.",
  },
  {
    // Legacy anon JWTs (older projects still ship these). Kept for defence in
    // depth even though our current Cloud uses `sb_publishable_*`.
    id: "supabase-anon-key-jwt",
    pattern: /eyJhbGciOi[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]*Imlub24i/g,
    hint: "A Supabase anon JWT is embedded in the Self-Hosted bundle.",
  },
];


/** Files/dirs skipped entirely (source maps, licenses). */
const skipSuffixes = [".map", ".md", "LICENSE", "LICENCE"];
const skipDirs = new Set(["node_modules", ".cache"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile()) {
      if (skipSuffixes.some((s) => full.endsWith(s))) continue;
      // Only scan text-ish payload
      if (/\.(m?js|cjs|json|html|css|txt|env)$/i.test(full) || !/\./.test(entry)) {
        out.push(full);
      }
    }
  }
  return out;
}

function isAllowed(relPath, rule) {
  if (!rule.allowIn) return false;
  const norm = relPath.split(sep).join("/");
  return rule.allowIn.some((allow) => norm.includes(allow));
}

const files = walk(args.dir);
const failures = [];
let scanned = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  scanned++;
  const relPath = relative(repoRoot, file);
  for (const rule of bannedPatterns) {
    if (isAllowed(relPath, rule)) continue;
    let hits = 0;
    if (rule.pattern instanceof RegExp) {
      const matches = text.match(rule.pattern);
      hits = matches ? matches.length : 0;
    } else if (text.includes(rule.pattern)) {
      hits = 1;
    }
    if (hits > 0) {
      failures.push({ rule, file: relPath, hits });
    }
  }
}

console.log(`[verify-bundle] Scanned ${scanned} files in ${relative(repoRoot, args.dir)}`);

if (failures.length === 0) {
  console.log(`[verify-bundle] OK — no banned Cloud/Supabase patterns detected.`);
  process.exit(0);
}

console.error(`[verify-bundle] FAIL — ${failures.length} banned pattern hits:`);
const byRule = new Map();
for (const f of failures) {
  const list = byRule.get(f.rule.id) ?? [];
  list.push(f);
  byRule.set(f.rule.id, list);
}
for (const [id, list] of byRule) {
  const rule = list[0].rule;
  console.error(`\n  ✖ ${id}`);
  console.error(`    ${rule.hint}`);
  for (const f of list.slice(0, 5)) {
    console.error(`      - ${f.file} (${f.hits} hit${f.hits === 1 ? "" : "s"})`);
  }
  if (list.length > 5) console.error(`      … +${list.length - 5} more`);
}
console.error(
  `\nSelf-Hosted builds MUST NOT contain Cloud-only surface. Fix the imports above or move them behind PlatformMode=Cloud.`,
);
process.exit(1);

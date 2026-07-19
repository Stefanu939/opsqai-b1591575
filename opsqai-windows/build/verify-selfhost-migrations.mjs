#!/usr/bin/env node
/**
 * Self-Hosted migration guardrail.
 *
 * Fails the Windows build when executable SQL in migrations/selfhost contains
 * Cloud-only schema references or calls a public.* helper/table that is not
 * defined by the ordered Self-Hosted migration set.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const migrationsDir = resolve(ROOT, arg("dir", "migrations/selfhost"));

function stripSqlComments(sql) {
  let out = "";
  let i = 0;
  let inSingle = false;
  let dollarTag = null;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        out += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    if (inSingle) {
      out += ch;
      if (ch === "'" && next === "'") {
        out += next;
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }

    const dollar = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
    if (dollar) {
      dollarTag = dollar[0];
      out += dollarTag;
      i += dollarTag.length;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function collect(rx, text, group = 1) {
  const found = new Set();
  for (const m of text.matchAll(rx)) found.add(m[group].toLowerCase());
  return found;
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

if (!existsSync(migrationsDir)) {
  console.error(`[verify-selfhost-migrations] missing migrations dir: ${migrationsDir}`);
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const banned = [
  { name: "cloud auth schema", rx: /\bauth\./i },
  { name: "cloud storage schema", rx: /\bstorage\./i },
  { name: "cloud realtime schema", rx: /\brealtime\./i },
  { name: "cloud vault schema", rx: /\bvault\./i },
  { name: "cloud functions schema", rx: /\bsupabase_functions\./i },
  { name: "cloud queue schema", rx: /\bpgmq\./i },
  { name: "cloud cron schema", rx: /\bpg_cron\./i },
  { name: "cloud companies table", rx: /\bpublic\.companies\b/i },
  { name: "cloud profiles table", rx: /\bpublic\.profiles\b/i },
  { name: "cloud updated_at helper", rx: /\bpublic\.set_updated_at\s*\(/i },
  { name: "cloud auth trigger helper", rx: /\bpublic\.handle_new_user\s*\(/i },
  { name: "cloud authenticated grant", rx: /\bto\s+authenticated\b/i },
  { name: "cloud anon grant", rx: /\bto\s+anon\b/i },
  { name: "cloud service_role grant", rx: /\bto\s+service_role\b/i },
  { name: "citext dependency", rx: /\bcitext\b|\bextension\s+(?:if\s+not\s+exists\s+)?citext\b/i },
];

const knownTables = new Set();
const knownFunctions = new Set();
const violations = [];

for (const file of files) {
  const full = join(migrationsDir, file);
  const raw = readFileSync(full, "utf8");
  const sql = stripSqlComments(raw);

  for (const rule of banned) {
    const hit = rule.rx.exec(sql);
    if (hit) {
      violations.push({ file, line: lineOf(sql, hit.index), kind: rule.name, detail: hit[0].trim() });
    }
  }

  const fileTables = collect(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_][a-z0-9_]*)\b/gi, sql);
  const fileFunctions = collect(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_][a-z0-9_]*)\b/gi, sql);

  const allowedTables = new Set([...knownTables, ...fileTables]);
  const allowedFunctions = new Set([...knownFunctions, ...fileFunctions]);

  const tableRefPatterns = [
    /\bREFERENCES\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bFROM\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bJOIN\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bINTO\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bUPDATE\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bALTER\s+TABLE\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z_][a-z0-9_]*\s+ON\s+public\.([a-z_][a-z0-9_]*)\b/gi,
    /\bDROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?[a-z_][a-z0-9_]*\s+ON\s+public\.([a-z_][a-z0-9_]*)\b/gi,
  ];

  for (const rx of tableRefPatterns) {
    for (const m of sql.matchAll(rx)) {
      const name = m[1].toLowerCase();
      if (!allowedTables.has(name)) {
        violations.push({ file, line: lineOf(sql, m.index), kind: "undefined public table", detail: `public.${name}` });
      }
    }
  }

  for (const m of sql.matchAll(/\bEXECUTE\s+FUNCTION\s+public\.([a-z_][a-z0-9_]*)\s*\(/gi)) {
    const name = m[1].toLowerCase();
    if (!allowedFunctions.has(name)) {
      violations.push({ file, line: lineOf(sql, m.index), kind: "undefined public function", detail: `public.${name}()` });
    }
  }

  for (const m of sql.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)\s*\(/gi)) {
    const name = m[1].toLowerCase();
    const before = sql.slice(Math.max(0, m.index - 96), m.index).toUpperCase();
    if (
      /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+$/.test(before) ||
      /\bEXECUTE\s+FUNCTION\s+$/.test(before) ||
      /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?$/.test(before) ||
      /\bALTER\s+TABLE\s+$/.test(before) ||
      /\bREFERENCES\s+$/.test(before) ||
      /\bON\s+$/.test(before) ||
      /\bFROM\s+$/.test(before) ||
      /\bJOIN\s+$/.test(before) ||
      /\bINTO\s+$/.test(before) ||
      /\bUPDATE\s+$/.test(before)
    ) {
      continue;
    }
    if (!allowedFunctions.has(name)) {
      violations.push({ file, line: lineOf(sql, m.index), kind: "undefined public function", detail: `public.${name}()` });
    }
  }

  for (const name of fileTables) knownTables.add(name);
  for (const name of fileFunctions) knownFunctions.add(name);
}

if (violations.length) {
  console.error("[verify-selfhost-migrations] Self-Hosted SQL guardrail failed:");
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} ${v.kind}: ${v.detail}`);
  }
  process.exit(1);
}

console.log(`[verify-selfhost-migrations] OK — ${files.length} migration(s), no Cloud-only SQL or undefined public helpers.`);
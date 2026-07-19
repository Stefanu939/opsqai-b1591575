#!/usr/bin/env node
/**
 * Wave F regression guard.
 *
 * Prevents new direct imports of Cloud-only SDK surfaces from creeping into
 * files that are NOT explicitly allow-listed as Cloud-only.
 *
 * This is a static, source-level check. Wave D already stubs these imports
 * at build time for Self-Hosted, so violations do not leak into the bundle,
 * but we still want to keep the call-site surface tracked and shrinking.
 *
 * Usage:  node opsqai-windows/build/verify-source-imports.mjs [--json]
 * Exits 1 when unlisted files newly import banned modules.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const BANNED = [
  /from\s+["']@\/integrations\/supabase\/[^"']+["']/,
  /from\s+["']@supabase\/[^"']+["']/,
];

// Paths that are legitimately Cloud-scoped or provide the stub/gate surface
// themselves. Anything under these prefixes may import the banned modules.
const ALLOWED_PREFIXES = [
  "src/integrations/supabase/",
  "src/lib/providers/cloud/",
  "src/lib/providers/stubs/",
  "src/lib/providers/not-available.ts",
];

// Known Cloud-only call sites that are gated at runtime via not-available /
// getCloudSupabase / getCloudSupabaseAdmin. They exist in source but never
// execute in Self-Hosted (Wave D aliases their imports to the throwing stub).
// This list is the shrinking backlog for future waves — do NOT grow it.
const LEGACY_ALLOWED = new Set([
  "src/start.ts",
  "src/lib/auth-context.tsx",
  "src/lib/avatar.ts",
  "src/lib/academy-certificate.server.ts",
  "src/lib/email/dispatch.server.ts",
  "src/lib/mcp/tools/list-faqs.ts",
  "src/lib/mcp/tools/list-knowledge.ts",
  "src/lib/mcp/tools/search-knowledge.ts",
  "src/lib/providers/require-auth.ts",
  "src/routes/auth.tsx",
  "src/routes/verify.$code.tsx",
  "src/routes/accept-invite.tsx",
  "src/routes/[.]lovable.oauth.consent.tsx",
  "src/routes/_authenticated/app.tsx",
  "src/routes/_authenticated/app.updates.tsx",
  "src/routes/_authenticated/app.organization.tsx",
  "src/routes/_authenticated/app.knowledge.tsx",
  "src/routes/_authenticated/app.faq.tsx",
  "src/routes/_authenticated/app.chat.$threadId.tsx",
  "src/routes/_authenticated/app.academy.lesson.$lessonId.tsx",
  "src/routes/_authenticated/portal.admin.tsx",
  "src/routes/_authenticated/portal.admin.index.tsx",
  "src/routes/_authenticated/portal.admin.downloads.tsx",
  "src/routes/_authenticated/management.tsx",
  "src/routes/api/workspace-chat.ts",
  "src/routes/api/chat.ts",
  "src/routes/api/internal-chat.ts",
  "src/routes/api/customer-writer.ts",
  "src/routes/api/academy-chat.ts",
  "src/routes/lovable/email/transactional/send.ts",
  "src/routes/lovable/email/suppression.ts",
  "src/routes/lovable/email/queue/process.ts",
  "src/components/support/support-widget.tsx",
  "src/components/support/chat-glider.tsx",
  "src/components/app/subscription-status-banner.tsx",
  "src/components/app/subscription-access-gate.tsx",
  "src/components/app/notifications-bell.tsx",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mts|cts|js|jsx|mjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function isAllowedPath(rel) {
  return ALLOWED_PREFIXES.some((p) => rel === p || rel.startsWith(p));
}

const files = walk(SRC);
const violations = [];
const staleAllowlist = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  if (isAllowedPath(rel)) continue;
  const src = readFileSync(abs, "utf8");
  const hit = BANNED.some((rx) => rx.test(src));
  if (hit && !LEGACY_ALLOWED.has(rel)) {
    violations.push(rel);
  }
  if (!hit && LEGACY_ALLOWED.has(rel)) {
    staleAllowlist.push(rel);
  }
}

const json = process.argv.includes("--json");
const result = { violations, staleAllowlist };
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (violations.length === 0 && staleAllowlist.length === 0) {
    console.log(
      `[verify-source-imports] OK — ${LEGACY_ALLOWED.size} legacy Cloud-only files tracked, no new violations.`,
    );
  }
  if (violations.length) {
    console.error("[verify-source-imports] NEW direct-SDK imports detected:");
    for (const v of violations) console.error("  - " + v);
    console.error(
      "\nRoute the call through a provider under src/lib/providers/, or (if Cloud-only) gate it via getCloudSupabase / getCloudSupabaseAdmin.",
    );
  }
  if (staleAllowlist.length) {
    console.warn(
      "[verify-source-imports] Files migrated off Supabase — remove from LEGACY_ALLOWED:",
    );
    for (const v of staleAllowlist) console.warn("  - " + v);
  }
}

if (violations.length) process.exit(1);

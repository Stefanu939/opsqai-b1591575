#!/usr/bin/env node
/**
 * Global Self-Hosted AI Contract — architecture guard.
 *
 * There must never be a second AI path around the central provider. This
 * static check fails the build when production code outside the provider /
 * adapter layer talks to an AI provider directly, or hard-codes a model id.
 *
 * Usage:  node opsqai-windows/build/verify-ai-boundary.mjs [--json]
 * Exits 1 on any violation.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** The ONLY places allowed to touch an AI provider directly. */
export const ALLOWED_PREFIXES = [
  // The provider/adaptor layer itself.
  "src/lib/ai-adapters/",
  "src/lib/ai-provider.server.ts",
  "src/lib/ai-capabilities.ts",
  // Provider configuration plumbing (writes env/config, never infers).
  "src/lib/selfhost-config.server.ts",
  "src/lib/ai-engine.server.ts",
  "src/lib/ai-engine.functions.ts",
  "src/lib/first-run.functions.ts",
  // Lovable platform email endpoints: LOVABLE_API_KEY here is caller auth
  // for the platform email API, not AI inference.
  "src/routes/lovable/",
  // Cloud legal / marketing / documentation copy (text, not calls).
  "src/lib/customer-templates.ts",
  "src/lib/opsqai-facts.ts",
  "src/i18n/",
  "src/content/",
];

/** Admin UI surfaces that legitimately show provider/model names to admins. */
export const ALLOWED_UI = [
  "src/components/admin/local-ai-engine-card.tsx",
  "src/routes/first-run.tsx",
  "src/routes/_authenticated/management.settings.tsx",
  "src/routes/_authenticated/app.organization.tsx",
];

export const RULES = [
  {
    id: "lovable-api-key",
    label: "reads LOVABLE_API_KEY (AI credential)",
    pattern: /LOVABLE_API_KEY/,
  },
  {
    id: "gateway-provider",
    label: "constructs a Lovable AI Gateway provider",
    pattern: /createLovableAiGatewayProvider|ai-gateway\.server/,
  },
  {
    id: "provider-client",
    label: "instantiates an AI provider client",
    pattern:
      /createOpenAICompatible|createOpenAI\b|createAzure\b|createGoogleGenerativeAI|createAnthropic|new\s+OpenAI\b|new\s+Anthropic\b|@ai-sdk\/(openai|openai-compatible|azure|google|anthropic)/,
  },
  {
    id: "external-ai-host",
    label: "calls an external AI endpoint directly",
    pattern:
      /ai\.gateway\.lovable\.dev|api\.openai\.com|openai\.azure\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com|openrouter\.ai/,
  },
  {
    id: "hardcoded-model",
    label: "hard-codes a model id",
    pattern:
      /["'`](?:google\/gemini[\w.\-]*|openai\/[\w.\-]+|anthropic\/[\w.\-]+|gpt-[\w.\-]+|claude-[\w.\-]+|qwen[\w.:\-]*|bge-m3)["'`]/,
  },
];

const CODE_EXT = new Set([".ts", ".tsx"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else {
      const dot = entry.lastIndexOf(".");
      if (dot > 0 && CODE_EXT.has(entry.slice(dot))) out.push(full);
    }
  }
  return out;
}

function isTestFile(rel) {
  return /\.(test|spec)\.tsx?$/.test(rel) || rel.includes("/__tests__/");
}

export function isAllowed(rel) {
  if (isTestFile(rel)) return true;
  if (ALLOWED_UI.includes(rel)) return true;
  return ALLOWED_PREFIXES.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));
}

/** Scans given [relPath, source] pairs. Exported for unit tests. */
export function scanSources(files) {
  const violations = [];
  for (const [rel, source] of files) {
    if (isAllowed(rel)) continue;
    const lines = source.split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments are documentation
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          violations.push({ file: rel, line: i + 1, rule: rule.id, label: rule.label, snippet: line.trim().slice(0, 160) });
        }
      }
    });
  }
  return violations;
}

function main() {
  const files = walk(SRC).map((full) => {
    const rel = relative(ROOT, full).split(sep).join("/");
    return [rel, readFileSync(full, "utf8")];
  });
  const violations = scanSources(files);
  const asJson = process.argv.includes("--json");

  if (asJson) {
    console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log(`verify-ai-boundary: OK — ${files.length} source files, no direct AI provider access outside the provider layer.`);
  } else {
    console.error("verify-ai-boundary: FAILED — the Global Self-Hosted AI Contract is violated.\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.rule}] ${v.label}`);
      console.error(`      ${v.snippet}`);
    }
    console.error(
      "\nIf you are adding an AI-powered feature to OPSQAI, you MUST use the central AI\n" +
        "provider abstraction (src/lib/ai-provider.server.ts): resolveChatModel,\n" +
        "generateAiText, streamAiText, generateAiObject, generateAiJson, resolveEmbeddings,\n" +
        "aiCapabilities. Direct cloud AI calls and hard-coded model ids are prohibited.\n" +
        "See docs/engineering/ai-provider-contract.md.",
    );
  }
  process.exit(violations.length === 0 ? 0 : 1);
}

// Windows-safe entrypoint check (see pack-payload.mjs for why).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

// AI Provider Adapter registry (Phase 2).
//
// Single source of truth for which adapters exist and which one is active.
// `ai-provider.server.ts` calls into here and never branches on provider
// identity itself. To register a new provider: import its module and add
// it to `BUILT_IN_ADAPTERS` below.

import type { AIProviderAdapter } from "./types";
import { lovableAdapter } from "./lovable";
import { azureAdapter } from "./azure";
import { openaiCompatibleAdapter } from "./openai-compatible";
import { ollamaAdapter } from "./ollama";

const BUILT_IN_ADAPTERS: readonly AIProviderAdapter[] = [
  lovableAdapter,
  azureAdapter,
  openaiCompatibleAdapter,
  ollamaAdapter,
];

const REGISTRY = new Map<string, AIProviderAdapter>();

function normalize(id: string): string {
  return id.trim().toLowerCase();
}

/** Register an adapter under its `id` and any declared `aliases`. */
export function registerAdapter(adapter: AIProviderAdapter): void {
  REGISTRY.set(normalize(adapter.id), adapter);
  for (const alias of adapter.aliases ?? []) {
    REGISTRY.set(normalize(alias), adapter);
  }
}

for (const a of BUILT_IN_ADAPTERS) registerAdapter(a);

/** Look up an adapter by id/alias. Returns null if unknown. */
export function getAdapter(id: string): AIProviderAdapter | null {
  return REGISTRY.get(normalize(id)) ?? null;
}

/** Distinct list of registered adapters (deduplicated across aliases). */
export function listAdapters(): AIProviderAdapter[] {
  return Array.from(new Set(REGISTRY.values()));
}

/** Cloud default. */
export const DEFAULT_ADAPTER_ID = "lovable";
/** Self-Hosted default — the bundled local engine. */
export const SELFHOST_DEFAULT_ADAPTER_ID = "ollama";

/**
 * Default adapter id for the current platform. Self-Hosted resolves to the
 * local Ollama engine so a properly installed Self-Hosted deployment can
 * never accidentally reach the Lovable Gateway; Cloud keeps the Gateway.
 */
export function isSelfHostedRuntime(): boolean {
  const mode = (process.env.OPSQAI_PLATFORM_MODE ?? "").trim().toLowerCase();
  const deployment = (process.env.OPSQAI_DEPLOYMENT_TYPE ?? "").trim().toLowerCase();
  return mode === "selfhost" || mode === "self-hosted" || deployment === "selfhosted";
}

export function defaultAdapterId(): string {
  return isSelfHostedRuntime() ? SELFHOST_DEFAULT_ADAPTER_ID : DEFAULT_ADAPTER_ID;
}

/**
 * Resolve the active adapter from the `AI_PROVIDER` env var.
 *
 * Never falls back silently: an unknown id throws, and on Self-Hosted an
 * adapter that is not local throws too (Global Self-Hosted AI Contract —
 * inference must stay on the customer's own machine).
 */
export function getActiveAdapter(): AIProviderAdapter {
  const raw = process.env.AI_PROVIDER;
  const selfHosted = isSelfHostedRuntime();
  if (!raw || !raw.trim()) return getAdapter(defaultAdapterId())!;
  const found = getAdapter(raw);
  if (!found) {
    const known = listAdapters()
      .map((a) => a.id)
      .join(", ");
    throw new Error(`Unknown AI_PROVIDER "${raw}". Registered: ${known}`);
  }
  if (selfHosted && found.local !== true) {
    throw new Error(
      `AI_PROVIDER "${found.id}" is a cloud engine and cannot be used on a Self-Hosted install. ` +
        `Self-Hosted runs inference locally (${SELFHOST_DEFAULT_ADAPTER_ID}).`,
    );
  }
  return found;
}


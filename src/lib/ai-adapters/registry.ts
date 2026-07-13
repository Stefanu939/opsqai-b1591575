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

const BUILT_IN_ADAPTERS: readonly AIProviderAdapter[] = [
  lovableAdapter,
  azureAdapter,
  openaiCompatibleAdapter,
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

export const DEFAULT_ADAPTER_ID = "lovable";

/**
 * Resolve the active adapter from the `AI_PROVIDER` env var, falling back
 * to the Lovable Gateway. Throws if the env var names an unknown adapter
 * — silent fallback would hide misconfiguration.
 */
export function getActiveAdapter(): AIProviderAdapter {
  const raw = process.env.AI_PROVIDER;
  if (!raw || !raw.trim()) return getAdapter(DEFAULT_ADAPTER_ID)!;
  const found = getAdapter(raw);
  if (!found) {
    const known = listAdapters()
      .map((a) => a.id)
      .join(", ");
    throw new Error(`Unknown AI_PROVIDER "${raw}". Registered: ${known}`);
  }
  return found;
}

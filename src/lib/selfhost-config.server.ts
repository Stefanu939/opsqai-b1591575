// Self-Hosted configuration persistence.
//
// Cloud stores platform config (AI provider, backup settings, etc.) in
// `platform_config`. Self-Hosted keeps the same data in `%ProgramData%\OPSQAI\config\config.json`,
// which is the single source of truth for the Windows service. This module
// is server-only and only loaded on Self-Hosted.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPlatformMode, PlatformMode } from "@/lib/platform";

export interface SelfHostAiConfig {
  provider?: "openai" | "azure" | "ollama" | "anthropic" | "gateway" | "none";
  model?: string;
  base_url?: string;
  baseUrl?: string;
  api_key?: string;
  apiKey?: string;
  resource_name?: string;
  resourceName?: string;
  api_version?: string;
  apiVersion?: string;
  chat_model?: string;
  chatModel?: string;
  chat_fast_model?: string;
  chatFastModel?: string;
  embedding_model?: string;
  embeddingModel?: string;
}

export interface SelfHostConfig {
  installId?: string;
  company?: { name?: string };
  ai?: SelfHostAiConfig;
  [key: string]: unknown;
}

function configPath(): string {
  const dir = process.env.OPSQAI_CONFIG_DIR;
  if (!dir) throw new Error("OPSQAI_CONFIG_DIR not set");
  return join(dir, "config.json");
}

export function readSelfHostConfig(): SelfHostConfig {
  try {
    const raw = readFileSync(configPath(), "utf8");
    return JSON.parse(raw) as SelfHostConfig;
  } catch {
    return {};
  }
}

export function writeSelfHostConfig(config: SelfHostConfig): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf8");
}

export function getSelfHostAiConfig(): SelfHostAiConfig | null {
  const cfg = readSelfHostConfig();
  return cfg.ai ?? null;
}

export function setSelfHostAiConfig(ai: SelfHostAiConfig): void {
  const cfg = readSelfHostConfig();
  cfg.ai = ai;
  writeSelfHostConfig(cfg);
  // Also update the live process env so the current app process can use the
  // new provider without a restart. The Windows service re-reads config.json
  // on its next start.
  applyAiEnv(ai);
}

function pick<T>(...candidates: Array<T | undefined | null>): T | undefined {
  for (const c of candidates) if (c !== undefined && c !== null) return c;
  return undefined;
}

/** Sync live env vars from an AI config object so adapters see changes immediately. */
export function applyAiEnv(ai: SelfHostAiConfig): void {
  if (!ai || ai.provider === "none") {
    process.env.AI_PROVIDER = "";
    return;
  }

  const provider = ai.provider;
  process.env.AI_PROVIDER =
    provider === "azure"
      ? "azure"
      : provider === "gateway"
        ? "lovable"
        : "openai-compatible";

  if (provider === "azure") {
    process.env.AZURE_OPENAI_RESOURCE_NAME = pick(ai.resource_name, ai.resourceName) ?? "";
    process.env.AZURE_OPENAI_API_KEY = pick(ai.api_key, ai.apiKey) ?? "";
    process.env.AZURE_OPENAI_API_VERSION = pick(ai.api_version, ai.apiVersion) ?? "2024-10-21";
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = pick(ai.chat_model, ai.chatModel) ?? "gpt-4o";
    process.env.AZURE_OPENAI_CHAT_FAST_DEPLOYMENT =
      pick(ai.chat_fast_model, ai.chatFastModel) ?? "gpt-4o-mini";
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT =
      pick(ai.embedding_model, ai.embeddingModel) ?? "text-embedding-3-small";
  } else {
    process.env.GENERIC_AI_BASE_URL = pick(ai.base_url, ai.baseUrl) ?? "";
    process.env.GENERIC_AI_API_KEY = pick(ai.api_key, ai.apiKey) ?? "";
    process.env.GENERIC_AI_CHAT_MODEL = pick(ai.chat_model, ai.chatModel) ?? "gpt-4o";
    process.env.GENERIC_AI_CHAT_FAST_MODEL = pick(ai.chat_fast_model, ai.chatFastModel) ?? "gpt-4o-mini";
    process.env.GENERIC_AI_EMBEDDING_MODEL =
      pick(ai.embedding_model, ai.embeddingModel) ?? "text-embedding-3-small";
  }

  if (provider === "gateway") {
    process.env.LOVABLE_API_KEY = pick(ai.api_key, ai.apiKey) ?? "";
  }
}

/** Apply config.json AI settings to the current process on bootstrap. */
export function applySelfHostConfigAtStartup(): void {
  if (getPlatformMode() !== PlatformMode.SelfHosted) return;
  const ai = getSelfHostAiConfig();
  if (ai) applyAiEnv(ai);
}

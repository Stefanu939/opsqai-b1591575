// Azure OpenAI adapter (customer-owned Azure resource).
import { createAzure } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";
import type { AIChatRole, AIProviderAdapter, ResolvedEmbeddings, ResolvedTTS } from "./types";

function models() {
  return {
    chat: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4o",
    "chat-fast": process.env.AZURE_OPENAI_CHAT_FAST_DEPLOYMENT ?? "gpt-4o-mini",
    tts: process.env.AZURE_OPENAI_TTS_DEPLOYMENT ?? "tts",
    embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small",
  } as const;
}

function requireConfig() {
  const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
  if (!resourceName || !apiKey) {
    throw new Error("AZURE_OPENAI_RESOURCE_NAME / AZURE_OPENAI_API_KEY missing");
  }
  return { resourceName, apiKey, apiVersion };
}

export const azureAdapter: AIProviderAdapter = {
  id: "azure-openai",
  aliases: ["azure"],
  label: "Azure OpenAI",

  resolveChat(role: AIChatRole): LanguageModel {
    const { resourceName, apiKey, apiVersion } = requireConfig();
    const azure = createAzure({ resourceName, apiKey, apiVersion });
    return azure(models()[role]);
  },

  resolveTTS(): ResolvedTTS {
    const { resourceName, apiKey, apiVersion } = requireConfig();
    const deployment = models().tts;
    return {
      url: `https://${resourceName}.openai.azure.com/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`,
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      model: deployment,
      modelInPath: true,
    };
  },

  resolveEmbeddings(): ResolvedEmbeddings {
    const { resourceName, apiKey, apiVersion } = requireConfig();
    const deployment = models().embedding;
    return {
      url: `https://${resourceName}.openai.azure.com/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`,
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      // Azure embeds the deployment in the URL; body must NOT carry `model`.
      buildBody: (texts) => ({ input: texts }),
    };
  },
};

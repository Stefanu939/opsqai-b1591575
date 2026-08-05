// Server-only embedding facade. The active adapter is selected per platform:
// Lovable Gateway on Cloud, customer-configured Azure/OpenAI-compatible on Self-Hosted.
import { resolveEmbeddings } from "@/lib/ai-provider.server";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return resolveEmbeddings(texts);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

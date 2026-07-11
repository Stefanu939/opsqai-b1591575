# 4. AI provider adapter contract

Every adapter implements:

```typescript
export interface AiAdapter {
  key: string;                         // registry key
  probe(): Promise<AiProbeResult>;     // health check
  chat(req: ChatRequest): Promise<ChatResponse>;
  embed(req: EmbedRequest): Promise<EmbedResponse>;
  stt?(req: SttRequest): Promise<SttResponse>;
  tts?(req: TtsRequest): Promise<TtsResponse>;
}
```

Registered adapters: `openai`, `azure-openai`, `openai-compatible`, `lovable-ai-gateway`.

Adding a new provider:

1. Implement adapter in `src/lib/ai-adapters/<key>/`.
2. Register in `src/lib/ai-adapters/registry.ts`.
3. Add a probe test.
4. Update `docs/administrator-guide/08-ai-provider.md`.

# OPSQAI AI Provider Contract

Applies to **every** current and future OPSQAI module, route, server function,
service, worker, scheduled job and background task. This is an architectural
requirement, not a per-feature migration.

## The rule

Every AI operation — chat, streaming, structured output, JSON generation,
embeddings, speech — resolves through the **central AI provider layer**:

- `src/lib/ai-provider.server.ts` — the single entry point
- `src/lib/ai-capabilities.ts` — the capability registry
- `src/lib/ai-adapters/*` — the only place a provider SDK may be constructed

No feature code may:

- read `LOVABLE_API_KEY` or any other AI provider credential
- construct a provider client (`createOpenAICompatible`, `createOpenAI`,
  `createAzure`, `new OpenAI`, …)
- `fetch` an external AI endpoint (`ai.gateway.lovable.dev`, `api.openai.com`,
  `*.openai.azure.com`, `generativelanguage.googleapis.com`,
  `api.anthropic.com`, `openrouter.ai`, …)
- hard-code a model id (`google/gemini-…`, `gpt-…`, `qwen2.5:7b`, `bge-m3`, …)

## Use these instead

| Need | Call |
| --- | --- |
| A chat model for `streamText` / `useChat` routes | `resolveChatModel("chat" \| "chat-fast")` |
| One-shot text | `generateAiText({ role, prompt })` |
| Streaming text | `streamAiText({ role, messages })` |
| Structured output | `generateAiObject({ schema, prompt, fallback })` |
| Free-form JSON | `generateAiJson({ role, prompt })` |
| Embeddings (RAG, semantic search) | `resolveEmbeddings(texts)` / `resolveEmbedOne(text)` |
| Embedding width for pgvector | `embeddingDimensions()` |
| Speech | `resolveTTSOrNull()` (null = unsupported) |
| Feature gating | `aiCapabilities()`, `hasAiCapability(name)`, `assertAiCapability(name)` |

Model selection is a **provider-layer decision**. Feature code names a *role*
(`chat`, `chat-fast`, `embedding`), never a model.

## No cloud fallback in Self-Hosted

A Self-Hosted install runs entirely on the local engine (Ollama). It must
**never** silently fall back to Lovable Gateway, OpenAI, Azure, Gemini,
Anthropic or any other external provider. When the active engine cannot do
something:

1. `aiCapabilities()` reports that capability as `false`.
2. The provider layer throws `AiCapabilityError` (`unsupported` / `unavailable`).
3. The feature degrades visibly — a clear message to the user or admin, or an
   HTTP `501`/`503` — and the admin sees engine health in Settings.

Fail closed. Never reroute.

## Capability gating, not provider branching

Never branch on provider identity (`if (provider === "ollama")`). Ask what the
engine can do:

```ts
if (!hasAiCapability("textToSpeech")) return new Response("Not supported", { status: 501 });
```

`probeAiCapabilities()` confirms declared capabilities against the models that
are actually installed.

## Enforcement

- `bun run verify:ai-boundary` (`opsqai-windows/build/verify-ai-boundary.mjs`)
  statically fails the build on any direct provider access or hard-coded model
  id outside the provider layer. It runs in `build:selfhosted:verify` and in
  `build.ps1` before the installer is packaged.
- `src/lib/ai-contract.offline.test.ts` exercises every capability with
  external network access blocked; any non-local request fails the suite.
- `opsqai-windows/build/__tests__/verify-ai-boundary.test.ts` guards the guard.

### Adding an allowlist entry

Only the provider/adaptor layer, provider *configuration* plumbing, and admin
UI that displays engine/model names belong in `ALLOWED_PREFIXES` / `ALLOWED_UI`.
A new feature module is never a valid allowlist entry — refactor it onto the
central provider instead.

## Adding a new AI-powered module — checklist

1. Import only from `@/lib/ai-provider.server`.
2. Pick a role, not a model.
3. Declare the capabilities you need and gate on them.
4. Handle `AiCapabilityError` with a user-visible degraded state.
5. Run `bun run verify:ai-boundary` and `bunx vitest run`.

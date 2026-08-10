# Global Self-Hosted AI Contract — one AI path for every module

Every AI-powered feature in OPSQAI must go through one central AI provider layer. Self-Hosted then routes to local Ollama automatically, Cloud routes to the Lovable Gateway, and no module ever knows or chooses. This is enforced by a build-time architecture test, so a future module cannot silently reintroduce a direct cloud call.

```text
Chat · Academy · AI Audit · KB · FAQ · RAG · Dashboard · future modules
                              |
                     CENTRAL AI PROVIDER
                       /              \
              Ollama adapter      Cloud adapter
                    |                   |
              local models       Lovable Gateway
```

## Repository audit (already done — current state)

A central layer exists (`src/lib/ai-provider.server.ts` + `src/lib/ai-adapters/*`), but only 4 modules use it. Nine production call sites bypass it and would break Self-Hosted:

| Module / file | Violation |
| --- | --- |
| `src/routes/api/workspace-chat.ts` | reads `LOVABLE_API_KEY`, builds its own gateway provider, hard-codes `google/gemini-3-flash-preview` |
| `src/routes/api/internal-chat.ts` | same three violations |
| `src/routes/api/academy-chat.ts` | same three violations |
| `src/routes/api/customer-writer.ts` | same three violations |
| `src/lib/academy.functions.ts` | own gateway provider + hard-coded model |
| `src/lib/dashboard.functions.ts` | own gateway provider + hard-coded model |
| `src/lib/customers.functions.ts` | own gateway provider + hard-coded `google/gemini-2.5-flash` |
| `src/routes/api/tts.ts` | direct `fetch` to `https://ai.gateway.lovable.dev` + hard-coded TTS model |
| `src/lib/ai-gateway.server.ts` | gateway factory used directly by feature code (must become adapter-internal) |

Compliant today: `src/routes/api/chat.ts`, `src/lib/ai-features.functions.ts`, `src/lib/embeddings.server.ts`, `src/lib/faq-import.functions.ts`.

Not violations (leave as-is): `src/routes/lovable/email/*` (Lovable platform auth, not AI), `src/lib/customer-templates.ts` and `src/lib/opsqai-facts.ts` (Cloud legal/documentation text), admin UI dropdowns and input placeholders.

## What gets built

### 1. Widen the central provider (one entry point for all capabilities)

Extend the adapter contract and the facade so every capability listed in the contract is reachable without touching a provider:

- `resolveChatModel(role)`, `resolveEmbeddings`, `resolveEmbedOne` — exist, keep.
- `resolveTTS()` — exists; must report unsupported instead of throwing raw.
- New: `generateAiText`, `streamAiText`, `generateAiObject`/`generateAiJson` — thin capability-checked wrappers over the AI SDK using the active adapter's model. Summarization, classification, extraction, rewriting, SOP generation/validation, Academy content and assessments, AI Audit, recommendations, reports, KB/FAQ generation, document analysis and future agents/tools all call these; none of them names a model or a provider.
- Model selection stays central: roles `chat` / `chat-fast` / `embedding` map to `ai.chatModel`, `ai.chatFastModel`, `ai.embeddingModel` inside the adapter only.

### 2. Capability registry

`src/lib/ai-capabilities.ts` defines `AICapabilities` (chat, fastChat, embeddings, structuredOutput, jsonOutput, streaming, toolCalling, vision, audioInput, textToSpeech). Each adapter declares its capabilities; on Self-Hosted the values are confirmed by the Ollama health probe (models actually present, embeddings actually returning a vector) rather than assumed. Modules ask `aiCapabilities()` before using a capability and fall back to deterministic behaviour or a clear "unsupported locally" state.

Self-Hosted TTS is a concrete case: `textToSpeech: false`, so `/api/tts` returns a clean 501 with an admin-readable reason instead of calling the Gateway.

### 3. No cloud fallback, ever, in Self-Hosted

The provider layer refuses to construct a cloud adapter when the platform mode is Self-Hosted. When Ollama is down or a capability is missing, callers get a typed local-capability error that the UI surfaces (engine offline / model missing / capability unsupported) — plus the existing heuristic fallbacks where they already exist. There is no code path from a Self-Hosted module to an external AI host.

### 4. Migrate the nine violating call sites

Each one loses its `LOVABLE_API_KEY` read, its own provider construction and its hard-coded model, and calls the central helpers with a role instead. Behaviour on Cloud stays identical (same gateway, same models via the Cloud adapter); Self-Hosted starts working for the first time on Academy chat, internal chat, workspace chat, customer writer, dashboard insights and customer AI.

### 5. Build-time architecture test (the part that protects the future)

`opsqai-windows/build/verify-ai-boundary.mjs`, run in `bun test`-style CI and inside `build.ps1` next to the existing `verify-source-imports.mjs` / `verify-bundle.mjs` guards. It fails the build when production code outside the allowed layer contains: `LOVABLE_API_KEY`, `createLovableAiGatewayProvider`, `createOpenAICompatible`/`createOpenAI`/Azure/Gemini/Anthropic clients, external AI hostnames, direct `fetch` to an AI endpoint, or a hard-coded cloud/local model id.

- Allowed: `src/lib/ai-adapters/**`, `src/lib/ai-provider.server.ts`, `src/lib/ai-gateway.server.ts`, `src/lib/selfhost-config.server.ts`, `opsqai-windows/services/**` config plumbing, tests/mocks, docs, legal/marketing text files, admin UI provider pickers.
- Forbidden: everything else under `src/routes/**`, `src/lib/*.functions.ts`, repositories, workers, scheduled jobs.
- The allowlist is explicit and small, so a new module is forbidden by default.

### 6. Offline capability regression test

Extends the existing offline suite: with external network blocked (any non-localhost request throws) and a local Ollama double, exercise every registered capability end to end — chat, fast chat, JSON/structured generation, embeddings, RAG retrieval, plus one representative call per module family (Academy, Audit, KB, FAQ, dashboard). Unsupported capabilities must report unsupported rather than reach out. Any external request fails the test.

### 7. Developer contract documentation

`docs/engineering/ai-provider-contract.md`, linked from the handbook and referenced by the failing build message: "If you are adding an AI-powered feature to OPSQAI, you MUST use the central AI provider abstraction. Direct cloud AI calls are prohibited." Includes the allowed/forbidden table, how to add a capability, and how to extend the Ollama adapter instead of bypassing it.

## Technical notes

- Capability-gated wrappers live in `src/lib/ai-provider.server.ts` (server-only) so no adapter code enters the client bundle; the Self-Hosted stub plugin keeps the Cloud adapter out of the Self-Hosted bundle as it does today.
- `generateAiObject` keeps schemas constraint-free and guards `NoObjectGeneratedError` with a text fallback, since local models conform less strictly than hosted ones.
- Cloud model ids move into the Cloud adapter's role map — one place to change models platform-wide, matching `ai.chatModel` / `ai.chatFastModel` / `ai.embeddingModel`.
- Migration order: widen provider + capability registry → migrate the 9 call sites → add the boundary verifier (it must pass on the migrated tree) → offline regression test → docs.

## Definition of Done

- No production module outside the adapter layer references a cloud key, client, host or model id.
- `verify-ai-boundary.mjs` passes and fails on an injected violation.
- Offline capability suite green with external network blocked.
- Self-Hosted: Academy chat, internal chat, workspace chat, customer writer, dashboard insights, KB/FAQ and Audit all run against local Ollama; TTS reports unsupported cleanly.
- Cloud behaviour unchanged.

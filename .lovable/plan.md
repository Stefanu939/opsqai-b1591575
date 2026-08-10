# Self-Hosted: Ollama as the only local AI engine

Goal: a fresh Windows install runs chat, embeddings and RAG entirely on the machine — no OpenAI, Azure, Lovable Gateway, vLLM or LM Studio, and no API key anywhere in the Self-Hosted UX. Cloud keeps the Lovable Gateway untouched. The adapter architecture stays; Ollama simply becomes a first-class adapter and the Self-Hosted default.

Decisions taken: the Ollama Windows setup is bundled in the payload, models are pulled from the internet during setup. Defaults: chat `qwen2.5:7b`, fast chat `qwen2.5:3b`, embeddings `bge-m3` (1024 dims, strong multilingual — important because SOPs are English while users ask in DE/RO).

## 1. Ollama adapter

New `src/lib/ai-adapters/ollama.ts` registered in `registry.ts` alongside the existing lovable/azure/openai-compatible adapters (none removed).

- Reads `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`), `OLLAMA_CHAT_MODEL`, `OLLAMA_CHAT_FAST_MODEL`, `OLLAMA_EMBEDDING_MODEL`.
- No API key, ever — no `Authorization` header, no dummy `"ollama"` key.
- chat + fast chat via Ollama's OpenAI-compatible `/v1` surface; embeddings via `/v1/embeddings` with **no** `dimensions` field (Ollama models reject/ignore it — the model's native size is authoritative).
- `resolveTTS()` throws a clear "TTS is not available on the local Ollama engine" error instead of pretending to work. The TTS route and any TTS UI treat that as unavailable.
- Adds a `probe()`-style health helper: API reachable, chat model present, embedding model present, real 1-token chat call, real embedding call, reported vector length.

Registry gains a platform-aware default: Self-Hosted defaults to `ollama`, Cloud stays `lovable`. `AI_PROVIDER=ollama` is the Self-Hosted value; `openai-compatible` is no longer used for Ollama.

## 2. Embedding dimension handling

`EMBEDDING_DIMENSIONS=1536` stops being a blind constant.

- The dimension is discovered from the embedding model itself (one probe embedding call) and pinned per install.
- On a fresh install the discovered value is written to the install's platform config and the pgvector column/index/search function are created at that size.
- New Self-Hosted migration `0017_embedding_dim.sql`: makes `document_chunks.embedding` and `match_document_chunks*` dimension-parameterised (recreated at the pinned size), keeps everything else in `0010_kb_pgvector.sql` intact.
- If a changed model reports a different dimension on an install that already has chunks: refuse the change with an explicit error, and offer a controlled "re-embed corpus" action (purge chunks → resize column → re-queue all documents) rather than silently mixing vectors.
- `ai-provider.server.ts` sends the pinned dimension only to providers that support it (OpenAI/Azure), never to Ollama.

## 3. Windows installer

Bundle the Ollama Windows setup in the payload (`build.ps1` stages it and verifies its hash). Bootstrap gains a real AI stage that replaces the current cosmetic "Initializing AI engine":

1. Detect Ollama (service + `ollama.exe`); install from the bundled setup if missing.
2. Start/verify the Ollama service, wait for `127.0.0.1:11434` to answer.
3. Pull chat model if missing (streamed progress).
4. Pull embedding model if missing (streamed progress).
5. Verify both models are listed.
6. Probe embedding dimension and pin it.
7. Real chat test.
8. Real embedding test.
9. Only then mark "AI engine ready".

Any failure aborts setup with a stable, actionable error code (`OPSQAI-E15xx` family: not installed, service won't start, API unreachable, model pull failed, dimension mismatch, chat/embedding test failed) — never a green tick without passing checks.

Wizard changes:
- The progress list shows the eight sub-stages above with live pull progress instead of one opaque line.
- A new AI step lets the admin keep the recommended defaults or override chat / fast chat / embedding model names. No API key field, no provider picker.
- Database options (Recommended bundled PostgreSQL 16 / Advanced external) stay exactly as they are — AI setup is a separate step.

Model defaults live in one central config file so they can be changed in one place for future releases.

## 4. Configuration plumbing

`config.json` gets an explicit shape: `ai.provider = "ollama"`, `ai.baseUrl`, `ai.chatModel`, `ai.chatFastModel`, `ai.embeddingModel`, `ai.embeddingDim`. No `apiKey`.

`opsqai-windows/services/platform/index.js` maps that to `AI_PROVIDER=ollama` plus the `OLLAMA_*` vars and stops emitting `GENERIC_AI_*` / `AZURE_*` / `LOVABLE_API_KEY` in the standard local case. `src/lib/selfhost-config.server.ts` mirrors the same shape for live updates without a restart.

## 5. Self-Hosted Admin UI

The AI provider tab in the app (Organization → AI provider, and the platform settings surface) becomes Ollama-specific in Self-Hosted mode: provider shown as "Ollama — Local" (read-only), Ollama URL, chat model, fast model, embedding model, embedding dimension, plus a Health panel that runs the real probe (Ollama API / chat / embeddings / RAG) with live ✓/✗. No API key field; OpenAI/Azure/Lovable options are hidden in Self-Hosted and remain available in Cloud/Enterprise code paths.

## 6. Guardrails and untouched areas

- RAG pipeline (extraction → chunking → embeddings → pgvector → similarity search → grounded answer with sources), KB, FAQ, document status, re-index, AI Audit and the "not available" guardrail all keep working unchanged — only the embedding/chat transport swaps.
- Licensing heartbeat stays as-is, including the offline `if (!deps.heartbeatUrl) return { ok: true }` path. AI never consults the heartbeat, and heartbeat failure never disables chat/KB/FAQ/RAG/audit. Heartbeat payload keeps only install id, machine fingerprint hash, version, timestamp — no prompts, documents or embeddings.
- A Self-Hosted build must not be able to reach the Lovable Gateway or OpenAI: the existing bundle/import verifiers get a rule asserting the Self-Hosted AI path resolves to Ollama only.

## 7. Tests

Adapter/unit: `AI_PROVIDER=ollama` resolves the Ollama adapter; no auth header and empty key accepted; chat request shape; embedding request shape (no `dimensions`); Ollama unreachable; chat model missing; embedding model missing; dimension mismatch against an install with existing chunks; matching dimension passes; Self-Hosted cannot fall back to Lovable; Self-Hosted cannot fall back to OpenAI.

Installer/bootstrap: mocked Ollama-setup + pull flow with a fresh bundled-PostgreSQL install; failure paths surface the right error codes.

Integration: KB upload → local embedding → pgvector → retrieval → Ollama answer with citations.

## 8. Final architectural requirement

The Self-Hosted edition must be genuinely local once installed. Internet access is needed only during setup, to fetch the Ollama runtime and the selected models.

After installation, with the network disconnected, all of these keep working: chat, fast chat, embeddings, KB ingestion, RAG retrieval, FAQ retrieval, grounded answers, citations, AI Audit.

The embedding model's actual returned vector length is the single source of truth for pgvector. No hard-coded 1024 or 1536 anywhere in the database layer.

Fresh installation order:

1. Install/start Ollama.
2. Pull models.
3. Probe the embedding model.
4. Obtain the actual vector length.
5. Persist `ai.embeddingDim`.
6. Create the pgvector column and retrieval function at that exact dimension.
7. Run chat + embedding + RAG health checks.
8. Only then report "AI Engine Ready".

Existing installations never change dimension silently — an explicit re-embedding operation is required.

Additionally: an automated offline acceptance test that proves a fully installed Self-Hosted OPSQAI performs Chat + Embeddings + RAG with external network access disabled (only loopback to Ollama and PostgreSQL permitted).

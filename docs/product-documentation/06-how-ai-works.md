# 6. How the AI works

## Adapter registry

OPSQAI ships an AI provider adapter registry. The customer picks a provider per install:

- OpenAI (customer's own key)
- Azure OpenAI (customer's own resource)
- Self-hosted OpenAI-compatible endpoint (vLLM, Ollama, LM Studio, etc.)
- Lovable AI Gateway (only when the install permits egress to opsqai.de)

The adapter contract fixes: chat completions, embeddings, and optional text-to-speech / speech-to-text.

## Data flow

1. Employee asks a question in Chat.
2. Query is embedded via the configured provider.
3. `pgvector` retrieval returns top-k chunks from the customer's Knowledge Base.
4. Retrieved chunks + question + system prompt are sent to the provider.
5. Response is stored in `messages` and `audit_log`.

## No training on customer data

The customer's provider account governs training opt-outs. OPSQAI itself never ships customer content back to opsqai.de.

## AI audit

Every completion is recorded in `ai_audits` with input hash, output hash, model, latency, token counts, and the retrieval chunks used.

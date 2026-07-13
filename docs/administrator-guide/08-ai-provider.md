# 8. AI provider

Configure in Setup Wizard step 5 or later at `/app/admin/platform` → AI.

## Supported providers

| Provider                        | Notes                                               |
| ------------------------------- | --------------------------------------------------- |
| OpenAI                          | Customer's own API key. Region pinned by account.   |
| Azure OpenAI                    | Customer's own resource + deployment names.         |
| Self-hosted (OpenAI-compatible) | vLLM / Ollama / LM Studio — provide base URL + key. |
| Lovable AI Gateway              | Only when the install permits egress to opsqai.de.  |

## Required model roles

- `chat` — generation.
- `embed` — embeddings (must be consistent across the corpus lifetime).
- `stt` / `tts` — optional.

Changing the embedding model requires re-embedding the corpus.

## Health probe

Every provider adapter exposes `probe()`. `opsqai doctor` calls it and reports latency + model list.

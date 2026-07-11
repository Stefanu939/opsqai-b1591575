# 6. Embeddings

- Dimension is pinned per install and stored in `platform_config.embedding_dim`.
- Changing dimension requires a full re-embed — the app refuses to save a new value while any `document_chunks` exist for the old dim.
- Default model: `text-embedding-3-small` (1536 dims). Larger models supported when the provider offers them.
- Batching: 100 chunks per call, retries with exponential backoff.

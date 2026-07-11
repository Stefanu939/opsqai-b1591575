# 5. RAG pipeline

1. **Ingest** — `knowledge_documents` row + upload to object storage.
2. **Extract** — text extractor per MIME type (PDF, DOCX, XLSX, HTML, MD, TXT).
3. **Chunk** — semantic chunker with 400–800 token targets and 15% overlap.
4. **Embed** — batched via configured provider.
5. **Store** — `document_chunks` with pgvector `embedding vector(<dim>)`.
6. **Retrieve** — cosine similarity top-k plus RBAC + department filter.
7. **Compose** — grounded prompt template with retrieved chunks + source citations.
8. **Complete** — provider `chat()` call, streamed to the UI.
9. **Audit** — `ai_audits` row with input/output hashes, model, token counts, retrieval chunk ids.

Retrieval failures fall back to a hard "no answer" — the system never hallucinates when nothing is retrieved.

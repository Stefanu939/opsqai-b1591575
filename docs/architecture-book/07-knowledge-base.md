# 7. Knowledge base

Detailed in Technical Documentation chapter 5.

## Architecture Decisions

- **AD-016: pgvector, not a separate vector DB.** Alternative (Pinecone, Weaviate, Qdrant) rejected: extra operational surface for the customer, extra credential surface for OPSQAI to design around. pgvector fits inside the mandatory PostgreSQL dependency.
- **AD-017: Chunk-level ACL, not document-level.** Retrieval filters at the chunk level so departmental scoping and RLS are honored on partial documents.

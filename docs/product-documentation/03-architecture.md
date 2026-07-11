# 3. High-level architecture

```text
┌────────────────────────────────────────────────────────────────┐
│  Customer boundary (their VPC / their servers)                 │
│                                                                │
│   ┌──────────┐   ┌────────────┐   ┌─────────────┐              │
│   │  Web app │──▶│ PostgreSQL │──▶│  MinIO / S3 │              │
│   │ (TSS)    │   │ + pgvector │   │             │              │
│   └────┬─────┘   └────────────┘   └─────────────┘              │
│        │                                                        │
│        │   ┌─────────────────────┐                              │
│        └──▶│ AI Provider adapter │──▶ Customer's AI provider    │
│            └─────────────────────┘   (OpenAI, Azure, self-host) │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                          │  License heartbeat (signed, offline-tolerant)
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  OPSQAI Management Center — opsqai.de                          │
│  (licenses, customer registry, DR bootstrap tokens, portal)    │
└────────────────────────────────────────────────────────────────┘
```

## Key properties

- Same codebase, two deployment modes (`OPSQAI_MODE=mc` vs `selfhost`), enforced at both UI and server layer.
- One `install_id` per customer install; that ID is the anchor for licensing and disaster recovery.
- No callbacks from MC to install. All communication is install → MC, over HTTPS, cryptographically signed.

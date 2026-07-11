# 1. Prerequisites

## Host

- Linux x86_64 host, 4 vCPU / 16 GB RAM minimum, 8 vCPU / 32 GB recommended.
- 100 GB SSD for the database, plus separate storage for the object store (grow with corpus).
- Outbound HTTPS to `opsqai.de` (licensing) and the chosen AI provider.

## Software

- Docker Engine 24+ and Docker Compose v2, OR
- PostgreSQL 15+ with `pgvector` and `pgcrypto` extensions available.
- SMTP relay reachable from the host.
- Trusted TLS certificate for the install's FQDN.

## Credentials the admin needs before starting

- PostgreSQL superuser (once, for extension install).
- SMTP host + credentials.
- AI provider API key (OpenAI, Azure OpenAI, or self-hosted endpoint URL).
- Installation License token issued by OPSQAI.
- (Optional) Module License tokens.

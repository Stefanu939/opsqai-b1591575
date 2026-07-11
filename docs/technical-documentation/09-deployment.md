# 9. Deployment

See `docker/` for the reference topology. Compose services:

- `app` — the TanStack Start server.
- `postgres` — PostgreSQL 15 with `pgvector`.
- `minio` — S3-compatible object store (dev only; production customers use their own).
- `caddy` (optional) — TLS-terminating reverse proxy.

Volumes:

- `pg-data` — the database.
- `minio-data` — object store (dev only).

Environment is supplied via `docker/.env`; the entrypoint script (`docker/entrypoint.sh`) applies migrations, boots the app, and prints `install_id` on first launch.

Bare-metal deployment is possible with Node.js 20+ but is not the reference path.

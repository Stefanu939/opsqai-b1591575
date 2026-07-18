# 4. PostgreSQL

## Required version and extensions

- PostgreSQL 15 or newer.
- `pgvector` (>= 0.5).
- `pgcrypto` (built-in).
- `pg_cron` (for background jobs) — optional but recommended.

The Windows installer ships an embedded PostgreSQL 16 with **pgvector 0.8.3
preinstalled** under `pgsql\lib\vector.dll` and `pgsql\share\extension\`.
Customers who point OPSQAI at an **external PostgreSQL** (`database.mode =
external` in `config.json`) must install pgvector themselves before running
the installer, or migration `0010_kb_pgvector.sql` fails with
`OPSQAI-E1010`.



## Connection

Set `POSTGRES_URL` in `.env` to a role that owns the OPSQAI database. Migrations run automatically on container start; the role needs `CREATE`, `USAGE ON SCHEMA public`, and the ability to `CREATE EXTENSION` on first boot.

## Tuning suggestions

- `shared_buffers = 25% of RAM`.
- `work_mem = 32MB` (raise for embedding-heavy workloads).
- `maintenance_work_mem = 512MB`.
- `max_connections = 100` for a single-node install.

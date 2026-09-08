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

## Scenario: using the company's own database server

In the setup wizard, choose **Advanced — connect to my own PostgreSQL server**
at the Database step and provide host, port, database name, username and
password. The wizard's **Test connection** button validates everything before
installation continues:

- the server is reachable and runs PostgreSQL 15 or newer,
- the login works and may create tables in the chosen database,
- the pgvector extension is installed and enabled (the test tells you exactly
  which step is missing: server package vs. `CREATE EXTENSION vector;`).

Choose the encryption mode:

- **Prefer** (default) — encrypt when the server supports it.
- **Require** — refuse to connect without TLS. Recommended whenever the
  database runs on another machine.
- **Disable** — only on isolated internal networks.

The credentials are stored in `config.json`, readable only by Windows
administrators, and are applied to the app as `DATABASE_URL` (with the chosen
`sslmode`). The bundled PostgreSQL service is not installed/started in this
mode. Once running, the Health Doctor report (`GET /api/public/doctor` or the
`opsqai doctor` CLI) shows a `database.source` finding naming the server and
the encryption state, so the administrator can always see where the data
lives.



## Connection

Set `POSTGRES_URL` in `.env` to a role that owns the OPSQAI database. Migrations run automatically on container start; the role needs `CREATE`, `USAGE ON SCHEMA public`, and the ability to `CREATE EXTENSION` on first boot.

## Tuning suggestions

- `shared_buffers = 25% of RAM`.
- `work_mem = 32MB` (raise for embedding-heavy workloads).
- `maintenance_work_mem = 512MB`.
- `max_connections = 100` for a single-node install.

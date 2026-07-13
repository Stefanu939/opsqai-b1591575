# OPSQAI Docker → Native Migrator

One-shot tool that moves an existing Docker-based OPSQAI deployment onto
the native Windows install produced by `OPSQAI-Setup.exe`. Mandatory for
v1 — see project constraints.

## Prerequisites

* The Windows host already has `OPSQAI-Setup.exe` installed and the setup
  wizard has been completed once (any admin credentials are fine — they
  will be replaced by the migrated data).
* Docker Desktop or Docker Engine is reachable on the same host with the
  original `docker-compose.yml` project running.
* The account executing the migrator is a local Administrator.

## Run

```powershell
opsqai-migrate --compose "C:\opsqai\docker\docker-compose.yml"
```

Optional flags:

| Flag                | Meaning                                                    |
| ------------------- | ---------------------------------------------------------- |
| `--reset-cluster`   | Wipe the embedded pg cluster before restore (recommended). |
| `--stop-containers` | `docker compose down` after health probe returns green.    |
| `--db-service NAME` | Override auto-discovery of the postgres container.         |

## What it does

1. Discovers postgres/app containers via `docker compose ps`.
2. Runs `pg_dump -F c` inside the container and copies the archive to
   `%ProgramData%\OPSQAI\migrations\import\db.dump`.
3. Robocopies the storage bind mount into
   `%ProgramData%\OPSQAI\data\storage`.
4. Rewrites `config.json` with a freshly generated postgres password.
5. Stops OPSQAI services, restarts `OpsqaiDatabase` so it initialises
   the embedded cluster with the new password, then runs `pg_restore`.
6. Starts remaining services and probes `https://localhost/health`.
7. Optionally shuts down the Docker stack.

## Rollback

The Docker deployment is untouched until you pass `--stop-containers`.
If the health probe fails, stop OPSQAI services and start the Docker
stack again — the data mount and dump file remain intact in
`%ProgramData%\OPSQAI\migrations\import`.

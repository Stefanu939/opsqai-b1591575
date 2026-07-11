# OPSQAI Self-Hosted — Docker packaging

Reference packaging for a Self-Hosted OPSQAI install. Ships the app, PostgreSQL, and MinIO on a private Docker network.

## Quick start

```sh
cp docker/.env.example docker/.env      # fill in secrets locally, never commit
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
```

The app comes up on `http://localhost:${OPSQAI_PORT:-3000}`. First-time boot lands the platform admin on the resumable **Setup Wizard** (`/app/platform/setup`). Everything the wizard tracks is a step ID — no secrets ever leave the container's env.

## What lives where

- `Dockerfile` — two-stage build. `INSTALLER_VERSION` is baked in at build time and reported by the heartbeat + `opsqai doctor`.
- `docker-compose.yml` — reference topology: `opsqai` + `postgres` + `minio` on `opsqai-net`.
- `entrypoint.sh` — pre-flight (requires `OPSQAI_INSTALL_ID` in selfhost mode), then hands off to the app.
- `.env.example` — placeholder names only; the real `.env` is created per-install and stays on the box.

## Versioning

`INSTALLER_VERSION` is independent from the application version. Bump it whenever any of these change:

- `Dockerfile` (base image, runtime layer, entrypoint)
- `docker-compose.yml` (topology, volumes, network)
- `entrypoint.sh` (pre-flight rules)
- `.env.example` (new required variable)

Version scheme: `MAJOR.MINOR.PATCH`. Starts at `1.0.0` on the v1.0 release.

## What Management Center (MC) never sees

The MC only receives what the heartbeat sends:

- `install_id`
- `app_version`, `installer_version`
- `user_count`
- `host_info` (non-secret facts: OS family, container runtime)

It **never** receives PG passwords, SMTP creds, AI keys, MinIO keys, SSH keys, or any customer-side secret. The Setup Wizard enforces this in code (see `src/lib/mc-secrets-blacklist.ts`).

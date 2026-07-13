# Architecture (native Windows deployment)

Companion to `.lovable/plan.md` — the plan describes *what* we're building
and *why*; this document describes the runtime shape once installed.

## Runtime topology

```text
                    +----------------------------------------+
                    |          Windows 10 / 11 host          |
                    |                                        |
  Browser  ------>  |  Caddy (127.0.0.1:443)                 |
   https://         |    - auto-issued local cert            |
   localhost        |    - proxies to OpsqaiPlatform         |
                    |                                        |
                    |  OpsqaiPlatform (Node, :3000)          |
                    |    - TanStack Start server bundle      |
                    |    - Existing licensing verifier       |
                    |                                        |
                    |  OpsqaiWorker (Node)                   |
                    |    - Background jobs                   |
                    |                                        |
                    |  OpsqaiDatabase (embedded mode)        |
                    |    - postgres.exe from EDB portable    |
                    |    - Data: %ProgramData%\OPSQAI\data\pgsql  |
                    |                                        |
                    |  OpsqaiStorage (embedded mode)         |
                    |    - Node HTTP API on filesystem       |
                    |    - Data: %ProgramData%\OPSQAI\data\storage|
                    |                                        |
                    |  OpsqaiUpdater (Node)                  |
                    |    - Polls updates.opsqai.de           |
                    |                                        |
                    +----------------------------------------+

  All services are wrapped by WinSW -> real Windows Services in services.msc.
  Auto-start (Delayed), restart policy 5s / 10s / 60s, Event Log source OPSQAI.
```

External modes (chosen in the wizard) simply skip `OpsqaiDatabase` /
`OpsqaiStorage` and point `OpsqaiPlatform` at the customer's PostgreSQL /
S3-compatible endpoint.

## Filesystem layout

```text
%ProgramFiles%\OPSQAI\             (read-only for users)
├── runtime\node\                  bundled Node 20 LTS
├── app\                           OPSQAI server bundle
├── services\                      hello, worker, storage, updater
├── winsw\                         OpsqaiHello.exe + .xml, one pair per service
├── caddy\                         caddy.exe + Caddyfile.tmpl
├── pgsql\                         PostgreSQL Portable (embedded mode only)
├── licensing\                     existing verifier (unchanged)
├── admin-tool\                    Service Manager (Electron)
├── assets\                        icons
└── Uninstall.exe

%ProgramData%\OPSQAI\              (ACL: Admins + service accounts)
├── config\config.json             written atomically by installer step 9
├── data\pgsql\                    PGDATA (embedded mode)
├── data\storage\                  local files (embedded mode)
├── logs\                          rotating WinSW logs
├── certs\                         Caddy-managed local cert + key
└── updates\pending\               downloaded update packages
```

## Config file

`%ProgramData%\OPSQAI\config\config.json` is the single source of truth.
Written by the wizard, read by every service on startup, hot-reloaded by
`OpsqaiUpdater` after applying updates.

```json
{
  "version": "1.0.0",
  "installId": "uuid",
  "company": { "name": "...", "contactEmail": "...", "timezone": "Europe/Bucharest" },
  "database": {
    "mode": "embedded",
    "embedded": { "port": 55432 },
    "external": null
  },
  "storage": {
    "mode": "local",
    "local": { "path": "C:\\ProgramData\\OPSQAI\\data\\storage" },
    "s3": null
  },
  "ai": { "provider": "openai", "endpoint": "...", "keyRef": "vault:openai" },
  "updates": { "channel": "stable", "manifestUrl": "https://updates.opsqai.de/channel/stable/manifest.json" }
}
```

Secrets (`ai.keyRef`, DB password when external, S3 secret) are stored in
the Windows Credential Manager under a dedicated OPSQAI target, not in
`config.json`. The wizard writes them; services read them via
`wincred` / DPAPI at startup.

## Update flow

1. `OpsqaiUpdater` polls `https://updates.opsqai.de/channel/{channel}/manifest.json`.
2. Manifest is Ed25519-signed with the OPSQAI update-signing key (separate
   from the license-signing key, same crypto primitive).
3. If a newer version is available, updater downloads the package to
   `%ProgramData%\OPSQAI\updates\pending`, verifies signature + hash.
4. Apply: snapshot `current` symlink → stop services → swap files → run
   migrations → start services → hit `/health` on each. Any failure →
   restore snapshot, restart old version, report error.

## License system (unchanged)

Everything about tokens, module licenses, public-key verification, and
offline verification stays identical to today's Docker edition. The only
change is *where* the verifier binary lives on disk
(`%ProgramFiles%\OPSQAI\licensing\`) — the code and key material are
untouched.

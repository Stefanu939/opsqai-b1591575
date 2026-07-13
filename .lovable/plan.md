# OPSQAI Self-Hosted — Native Windows Migration Plan (v2, revised)

Revised per your feedback: keep the stack in **TypeScript / Node.js**, no .NET, no WPF. Only the deployment layer changes. Docker becomes optional (external services), never a prerequisite.

---

## 1. Guiding principles

- **App code is untouched.** Frontend (TanStack Start), backend server functions, AI, licensing, wizard-in-app — all stay identical to today.
- **One language across stack.** Everything the team maintains stays TypeScript/Node. Native Windows glue is limited to well-known off-the-shelf binaries (WinSW, Caddy, PostgreSQL portable).
- **No Docker, no WSL, no Hyper-V** required on the customer machine.
- **MinIO is not deleted.** Local filesystem is only for small deployments; enterprises keep S3-compatible (MinIO/AWS/Azure/Backblaze).
- **License system is byte-for-byte unchanged.**

---

## 2. What changes vs. what stays

### Unchanged

- Web application (frontend + server functions).
- Business logic, authorization, data model, SQL migrations.
- License system: installation token, module licenses, public-key verification, offline path.
- In-app setup wizard (if any) — untouched.
- Cloud edition — not affected.

### Changes (deployment only)

| Area                | Today                     | New                                                                                                          |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Runtime             | Docker containers         | Native Windows Services wrapping Node processes                                                              |
| App server          | Node in Linux container   | Bundled Node runtime under `%ProgramFiles%\OPSQAI\runtime\node`                                              |
| DB                  | `postgres:16` container   | **Embedded:** PostgreSQL Portable as a service. **External:** any PostgreSQL                                 |
| Storage             | `minio` container         | **Embedded:** filesystem driver. **External:** MinIO / AWS S3 / Azure Blob / Backblaze — kept as first-class |
| Reverse proxy / TLS | none                      | Bundled **Caddy** with auto local cert on `https://localhost`                                                |
| Installer           | Go CLI + `docker compose` | **NSIS** `OPSQAI-Setup.exe` with a TypeScript-driven wizard                                                  |
| Services            | `docker compose up`       | **WinSW** (XML-configured Windows Service wrappers)                                                          |
| Config              | `.env`                    | `%ProgramData%\OPSQAI\config\config.json` (ACL: Admins + service accounts)                                   |
| Logs                | `docker logs`             | Windows Event Log + rotating files in `%ProgramData%\OPSQAI\logs`                                            |
| Updates             | manual                    | Node-based updater service, signed manifests, rollback                                                       |
| Admin tools         | none                      | **Electron** app: Service Manager, logs, backup/restore, health, repair                                      |

---

## 3. Technology stack (final)

- **Installer:** **NSIS 3** (`OPSQAI-Setup.exe`). Small, scriptable, signs cleanly. Wizard UI written as an **Electron** app launched by NSIS in "wizard mode" — same code powers the post-install Service Manager. This keeps all UI in TS/React.
- **Service wrapping:** **WinSW** (single ~5 MB static exe per service, XML config, native Windows Service, auto-restart, Event Log). Chosen over NSSM because WinSW ships restart policies and log rotation out of the box.
- **Runtime:** Node.js LTS bundled (~35 MB) under `%ProgramFiles%\OPSQAI\runtime\node`.
- **Embedded DB:** **PostgreSQL Portable** (EDB zip, ~200 MB). Wrapped by WinSW as `OpsqaiDatabase`. SQLite is _not_ used — the app relies on PostgreSQL features (JSONB, RLS-style constructs, extensions).
- **Storage:**
  - _Embedded:_ local filesystem driver already in the app.
  - _External:_ existing S3 client path — MinIO, AWS S3, Azure Blob (via S3 gateway or native SDK), Backblaze. **Kept**, not removed.
- **Reverse proxy + HTTPS:** **Caddy** (single exe). ACME-internal for `localhost`, root CA installed into `LocalMachine\Root` during install so no browser warning.
- **Auto-update:** custom Node updater service reading a signed JSON manifest, verified with the existing license public-key infra (same crypto, different key pair).
- **Admin tool (Service Manager):** **Electron + React**, reuses the project's existing UI kit. Same binary contains the installer wizard and the admin tool (two entry modes).

No .NET, no WPF, no C#.

---

## 4. Project structure

```text
opsqai-windows/
├── installer/
│   ├── nsis/                     # OPSQAI-Setup.nsi + custom pages -> exe
│   └── wizard/                   # Electron+React app: 10-step wizard
├── admin-tool/                   # Electron+React app: Service Manager
│   └── shares components with installer/wizard
├── services/                     # Node entrypoints wrapped by WinSW
│   ├── platform/                 # runs the OPSQAI web app
│   ├── worker/                   # background jobs
│   ├── storage/                  # local storage HTTP API (embedded mode only)
│   └── updater/                  # polls + applies signed updates
├── winsw-configs/                # XML for each service
├── payload/                      # everything staged into %ProgramFiles%\OPSQAI
│   ├── runtime/node/
│   ├── app/                      # prebuilt OPSQAI server bundle
│   ├── pgsql/                    # PostgreSQL Portable (optional payload)
│   ├── caddy/                    # caddy.exe + Caddyfile.tmpl
│   └── licensing/                # existing verifier, unchanged
└── build/                        # CI, code-signing, NSIS build
```

Installed on disk:

```text
%ProgramFiles%\OPSQAI\           # binaries (read-only for users)
%ProgramData%\OPSQAI\
  ├── config\config.json
  ├── data\pgsql\                # embedded DB (mode 1)
  ├── data\storage\              # local files (mode 1)
  ├── logs\
  └── certs\                     # Caddy-managed local cert
```

---

## 5. Installer wizard — 10 steps

Identical to what you asked for, driven by an Electron window launched from NSIS:

1. Welcome + prereq check (Win 10 1809+ / Win 11, admin, 4 GB free).
2. License verification (installation token → existing verifier, offline OK).
3. Installation folder.
4. Company information.
5. Administrator account (first admin user).
6. AI provider (OpenAI / Azure OpenAI / OpenRouter / OpenAI-compatible / Ollama) with live key probe.
7. Database: **Embedded PostgreSQL** _(default)_ or **External PostgreSQL** with `SELECT 1` test.
8. Storage: **Local filesystem** _(default, small deployments)_ or **S3-compatible** with `HeadBucket` test — supports MinIO, AWS, Azure, Backblaze.
9. Install: copy files → register WinSW services → init DB → seed admin → issue local cert → start services → open browser. Progress bar with sub-steps.
10. Finish — launches `https://localhost`.

Cancel at any step rolls back cleanly; config is written atomically only after step 9 succeeds.

---

## 6. Windows Services (WinSW)

| Service          | Purpose                            | Present in                    |
| ---------------- | ---------------------------------- | ----------------------------- |
| `OpsqaiPlatform` | Node app server behind Caddy       | Always                        |
| `OpsqaiWorker`   | Background jobs                    | Always                        |
| `OpsqaiDatabase` | Supervises embedded `postgres.exe` | Only in embedded DB mode      |
| `OpsqaiStorage`  | Local storage HTTP API             | Only in embedded storage mode |
| `OpsqaiUpdater`  | Auto-update poller                 | Always                        |

All services: Automatic (Delayed) start, restart policy 5 s → 10 s → 60 s, Event Log source `OPSQAI`, dedicated low-privilege service account, ACL'd data dir.

---

## 7. HTTPS on localhost

Caddy runs inside `OpsqaiPlatform` (or as its own WinSW service — decision at implementation time). It auto-issues an internal cert for `localhost`; NSIS installs the Caddy root CA into `LocalMachine\Root` so no browser warning appears. For LAN access, Service Manager exports the root CA for other machines.

---

## 8. Auto-update

- Updater service polls `https://updates.opsqai.de/channel/stable/manifest.json`, signed with an Ed25519 key (same infra family as licensing, separate key).
- Downloads delta to `%ProgramData%\OPSQAI\updates\pending`.
- Apply: stop services → swap binaries via symlinked `current` → run migrations → start services → health check. Failure → automatic rollback to previous `current` symlink.
- Manual "Check for updates" in Service Manager.

---

## 9. Uninstall

Standard "Add or Remove Programs" entry, custom dialog:

- Remove application only _(default — keep data + DB + docs)_
- Remove application + all data
- Keep database
- Keep uploaded documents

Uninstaller stops + removes WinSW services, deletes files, removes Event Log source, optionally removes the Caddy root CA.

---

## 10. Admin tools — OPSQAI Service Manager (Electron)

Single Electron app in Start Menu, shares components with the installer wizard:

- Service status board (running / stopped / restart buttons)
- Live log tail (Event Log + files)
- Backup: `pg_dump` + storage tarball + config → single archive
- Restore from an archive
- Health check: DB, storage, AI provider, cert expiry, disk space, license
- Repair: re-register services, re-issue cert, re-apply ACLs, re-run migrations

---

## 11. Migration risks (revised)

| Risk                                               | Impact | Mitigation                                                                                                                           |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| SmartScreen/Defender warnings on unsigned exe      | High   | **EV code-signing cert required from day 1** (~$400/yr). Sign NSIS installer, Electron apps, and every Node service wrapper.         |
| PostgreSQL Portable size (~200 MB)                 | Low    | Ship as optional payload; web-installer variant downloads it on demand.                                                              |
| Bundled Node + Electron duplication                | Low    | Electron ships its own Node; the runtime services reuse a separate bundled Node LTS. Installer size ~180–220 MB total — acceptable.  |
| Local HTTPS cert on locked-down corporate machines | Medium | Provide silent-install switches and Group Policy ADMX.                                                                               |
| Auto-update breaks a running install               | High   | Mandatory pre-update snapshot + auto-rollback; separate `stable` / `beta` channels.                                                  |
| Existing Docker-edition customers                  | Medium | Migration tool: reads `postgres` + `minio` from a running compose stack (customer runs it once) and imports into the native install. |
| Windows service permissions / UAC edge cases       | Medium | Dedicated per-service local accounts; installer runs elevated only.                                                                  |
| WinSW vs NSSM — WinSW project activity             | Low    | Both are stable and used in production widely; pin a specific WinSW release, vendor it into the repo.                                |

---

## 12. Effort estimate (revised — single stack)

Single senior full-stack (TS) engineer + part-time devops:

| Workstream                                                                              | Effort             |
| --------------------------------------------------------------------------------------- | ------------------ |
| NSIS installer scaffolding + code-signing pipeline                                      | 1–1.5 weeks        |
| Electron wizard (10 steps, shared with admin tool)                                      | 3 weeks            |
| WinSW service configs + Node service entrypoints (platform, worker, storage, updater)   | 2 weeks            |
| PostgreSQL Portable packaging + init/migration                                          | 1.5 weeks          |
| Caddy integration + local cert + root CA install                                        | 1 week             |
| AI + DB + S3 validation probes                                                          | 1 week             |
| Auto-updater (signed manifest, delta apply, rollback)                                   | 2 weeks            |
| Admin tool (Service Manager)                                                            | 2 weeks            |
| Uninstaller with data-retention options                                                 | 0.5 week           |
| Docker→native migration tool                                                            | 1.5 weeks          |
| QA matrix (Win 10 1809/21H2, Win 11 22H2/23H2/24H2, Home/Pro/Enterprise, domain-joined) | 2 weeks continuous |
| Buffer / integration / hardening                                                        | 2 weeks            |

**Total: ~8–10 calendar weeks (2–2.5 months)** for one engineer full-time, or **~5–6 weeks** with a second engineer in parallel.

Hard costs: EV code-signing cert ($400/yr), Windows CI runner (~$50/mo), signed-update CDN (existing).

---

## 13. Phased delivery

1. **Phase 1 — Foundation (weeks 1–2):** NSIS + code-signing pipeline, one WinSW-wrapped "hello" service, silent install/uninstall. Deliverable: signed empty installer.
2. **Phase 2 — Runtime (weeks 2–5):** Node app as service, Caddy + HTTPS, embedded PostgreSQL, admin bootstrap. Deliverable: working single-machine install (no wizard yet).
3. **Phase 3 — Wizard + external modes (weeks 5–7):** All 10 wizard steps, external DB, external S3 (MinIO/AWS/Azure/Backblaze), AI probes.
4. **Phase 4 — Ops (weeks 7–9):** Auto-updater, Service Manager, backup/restore, health, uninstall variants.
5. **Phase 5 — Migration + release (weeks 9–10):** Docker→native migrator, QA matrix, docs, first signed public release.

---

## 14. Decisions I still need from you

1. **NSIS + Electron wizard confirmed** (vs. pure NSIS custom pages)? Recommendation: yes — shared code with Service Manager saves weeks.
2. **EV code-signing certificate:** do you have one, or do we need to procure it before Phase 1?
3. **Docker→native migrator required at v1**, or acceptable in a v1.1 minor release?
4. **Update channel hosting:** reuse `opsqai.de` / `updates.opsqai.de`, or a separate domain?
5. **Team:** solo (8–10 weeks) or two engineers in parallel (5–6 weeks)?

Once you answer these five, I produce Phase 1 in file-by-file detail and start implementation. No code will be written before your green light.

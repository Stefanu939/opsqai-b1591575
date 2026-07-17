
# OPSQAI Self-Hosted Refactor — Plan

**Status:** Approved Architecture
**Version:** 1.0
**Last Updated:** 2026-07-17

Every path, permission, service name and tool in this plan is Windows-native. No Linux idioms.

## Governing principle

**Cloud and Self-Hosted are independent deployment targets that share business logic, not infrastructure.** Any infrastructure-specific implementation (authentication, storage, migrations, licensing, updates, background services) must be isolated behind provider interfaces. New features must be implemented once in the shared business layer and integrated through providers rather than conditional platform logic.

## Non-negotiable rule

**The Self-Hosted product must have zero runtime dependency on Supabase.** This includes authentication, storage, migrations, generated clients, environment variables, SDKs, and imports. Enforced by an ESLint rule and a Vite build guard that fails the Self-Hosted build if `@supabase/*` or `src/integrations/supabase/*` appear in the emitted bundles.

## Goals

- Cloud (opsqai.de / MC / Portal) stays byte-identical.
- Self-Hosted becomes fully independent on vanilla PostgreSQL + local auth + local Windows storage.
- Cloud contact from Self-Hosted is limited to license validation, heartbeat, update manifest, signed update download.

## Supported platforms (v1)

- Windows Server 2022
- Windows Server 2025
- Windows 11 Pro / Enterprise (evaluation only)

### Minimum requirements

- CPU: 4 physical cores, x86_64
- RAM: 16 GB
- Storage: 100 GB free NTFS on the OPSQAI drive (`pgdata`, `objects`, `backups`)
- .NET / IIS / WSL / Hyper-V: **not required**

## Out of scope (v1)

The following are explicitly excluded and must not be implemented in v1:

- Linux deployment
- Docker / Docker Compose deployment
- Kubernetes deployment
- Multi-node clustering
- High Availability (HA) topologies
- PostgreSQL replication (streaming/logical)
- Multi-region deployments
- In-place upgrades from a legacy Supabase-shaped Self-Hosted database

## Breaking changes policy

Once Self-Hosted v1 is released, changes to the database schema, provider interfaces, installer configuration, or licensing protocol must remain backward compatible whenever possible. Any breaking change requires:

- An explicit migration path (data + config).
- A `schema_version` / `installer_version` increment.
- A documented upgrade note in the release manifest.

## API versioning

All Self-Hosted → Cloud endpoints are versioned under `/v1/`. Incompatible changes ship under `/v2/` alongside the existing `/v1/` route so existing installations keep working until they update on their own schedule. `/v1/` is not retired without an announced deprecation window.

## Root cause of current installer error

`services/bootstrap/migrate.mjs` applies whatever SQL lives in `<install>\app\migrations`. Today that's the Supabase set (99 files) referencing `auth.users`, `auth.uid()`, `authenticated`, `service_role`, `anon` — none exist in vanilla Postgres.

---

## Core architectural primitives

### DeploymentType (how the product is distributed)

```text
enum DeploymentType { Cloud, SelfHosted }   // future: Hybrid, DedicatedSaaS
```

### PlatformMode (internal runtime mode of the app)

```text
enum PlatformMode { Cloud, SelfHosted }
```

Today `PlatformMode` mirrors `DeploymentType`, but they are separate concepts so a future Hybrid or Dedicated-SaaS distribution can pick a `PlatformMode` independently of how it was delivered. All code reads the enums, never a raw string.

### Capabilities (feature-based, not mode-based)

```text
enum Capability {
  Authentication, Storage, SMTP, AI, Updates,
  Licensing, OfflineMode, Telemetry, SSO
}
```

Providers advertise capabilities; code asks the capability registry, not the mode.

### Edition

```text
enum Edition { Community, Professional, Enterprise }
```

Read from the validated license. Feature gates key off `Edition` + `Capability`, never off `PlatformMode`.

### Feature flags (developer-facing)

Table `feature_flags(key TEXT PRIMARY KEY, enabled BOOLEAN, edition_min TEXT, notes TEXT)`. Initial keys: `ai_agents`, `ocr`, `academy`, `support_portal`, `saml`.

## Decisions locked

- **In-place upgrades**: refused in v1. Legacy Supabase-shaped DB → "Clean install required".
- **`has_role(uuid, app_role)`**: same signature everywhere; two implementations.
- **SSO roadmap**: v1 local; v1.1 SAML; v1.2 OIDC + Entra ID + Google Workspace + Okta.
- **JWT**: EdDSA (Ed25519).
- **Machine fingerprint**: only SHA-256 of the normalized fingerprint stored; raw values never persisted.
- **Installation ID**: UUID v4, generated once, immutable — not regenerated on update/restart/repair.
- **Update rollback**: fully automatic, no manual intervention.
- **AI "Configure Later"**: valid, complete configuration — no warning.
- **License validation cadence**: at install, on heartbeat, and before update. Not on each login. Offline grace runs the app while the network is down.
- **Audit log**: append-only. No `UPDATE`, no `DELETE`. Enforced via grants + rule.
- **Telemetry**: `Disabled | Anonymous | Full`. Default `Disabled`.

## Windows storage & permissions

- Config: `%ProgramData%\OPSQAI\config\config.json` (non-secret only).
- Secrets: `%ProgramData%\OPSQAI\config\secrets.env`, ACL-locked to `NT AUTHORITY\SYSTEM` and `BUILTIN\Administrators` (inheritance disabled, `icacls`/`SetNamedSecurityInfo`).
- Data: `%ProgramData%\OPSQAI\pgdata`, `\objects`, `\backups`, `\rollback`, `\logs`, `\tls`.
- Binaries: `%ProgramFiles%\OPSQAI\`.
- Services (WinSW): `OpsqaiCaddy`, `OpsqaiDatabase`, `OpsqaiPlatform`, `OpsqaiWorker`, `OpsqaiUpdater`.

`secrets.env` holds: `JWT_ED25519_PRIVATE_KEY`, `JWT_ED25519_PUBLIC_KEY`, `OPSQAI_ENCRYPTION_KEY` (AES-256-GCM), `POSTGRES_PASSWORD`, `SMTP_PASSWORD?`, `AI_PROVIDER_API_KEY?`, `S3_SECRET_KEY?`, `LICENSE_TOKEN`. Sensitive DB columns encrypted at rest via `AesGcmCipher`.

---

## Phase 1 — Split the migration sets

```text
supabase/migrations/       ← Cloud, untouched
migrations/selfhost/       ← new, PostgreSQL-native only
```

Windows payload pulls only from `migrations/selfhost/`. Single owner role `opsqai`. No `auth.*`, no `authenticated`/`anon`/`service_role`, no RLS via `auth.uid()`. Self-Hosted ships its own `public.has_role(uuid, app_role)`.

New table `platform_metadata(platform_version, schema_version, installer_version, build_number, installation_id)`.

Initial table list: `users`, `sessions`, `refresh_tokens`, `password_resets`, `roles`, `permissions`, `role_permissions`, `user_roles`, `companies`, `departments`, `profiles`, `knowledge_documents`, `document_chunks`, `faqs`, `messages`, `threads`, `audit_log` (append-only), `notifications`, `sop_acknowledgements`, `academy_*`, `workspace_*`, `support_*`, `contact_submissions`, `licenses` (local mirror), `platform_config`, `platform_metadata`, `installation`, `feature_flags`.

## Phase 2 — Local authentication (Self-Hosted)

argon2id password hashing. JWT EdDSA (Ed25519). Module `services/auth-local/`: `login`, `logout`, `refresh`, `resetRequest`, `resetConfirm`, `me`. SAML in v1.1, OIDC in v1.2.

## Phase 3 — Provider abstraction

```text
src/lib/providers/
  auth/           IAuthProvider           → SupabaseAuthProvider   | LocalAuthProvider
  users/          IUserRepository         → SupabaseUserRepo       | PostgresUserRepo
  storage/        IStorageProvider        → SupabaseStorage        | FsStorage | S3Storage
  notifications/  INotificationProvider   → SupabaseEmail          | SmtpEmail
  licensing/      ILicensingProvider      → CloudLicensing         | SelfHostLicensing
  crypto/         ISecretsCipher          → NullCipher             | AesGcmCipher
  backup/         IBackupService          → NoopBackup             | WindowsBackupService (pg_dump today, VSS-ready)
  telemetry/      ITelemetrySink          → NoopTelemetry          | AnonymousTelemetry | FullTelemetry
```

Bound once at boot from `PlatformMode` + Capabilities. Cloud keeps Supabase implementations — zero behavior change.

## Phase 4 — Storage

- Cloud unchanged.
- Self-Hosted default: NTFS at `%ProgramData%\OPSQAI\objects\<bucket>\<key>`.
- Optional S3-compatible provider with Test Connection.

## Phase 5 — Cloud contact surface

Only:

- `POST /api/public/v1/license/validate`
- `POST /api/public/v1/license/heartbeat`
- `GET  /api/public/v1/license/releases`
- `GET  <signed url>` — signed update artifact

Every request carries `installation_id` and `machine_fingerprint_sha256`. Fingerprint drift is logged; not a hard block.

## Phase 6 — Installer wizard (Windows, 15 pages)

1. Welcome
2. EULA
3. Installation License (online validate or offline activation file)
4. License Details — Customer, Seats, Expiration, Support, Channel, Edition
5. Company Information (prefilled from license)
6. Administrator Account
7. Installation Location (`%ProgramFiles%\OPSQAI`, `%ProgramData%\OPSQAI`)
8. Database — Embedded default; External reveals fields + Test Connection
9. Storage — Local NTFS default; S3 reveals fields + Test Connection
10. AI Provider — default "Configure Later" (valid)
11. SMTP (Optional) — with Send Test Email
12. Telemetry — Disabled (default) / Anonymous / Full
13. Review (full summary)
14. Installing (live checklist)
15. Complete — Launch OPSQAI · Open Admin Console · View Installation Log

Installer writes `config.json`, ACL-locked `secrets.env`, immutable `installation_id`, `machine_fingerprint_sha256`, populates `platform_metadata`, seeds `feature_flags` per Edition. Legacy Supabase-shaped DB → clean-install screen.

## Phase 7 — Update pipeline with automatic rollback

1. Pre-flight (license, disk, no active repair)
2. `BackupService.snapshot()` → `%ProgramData%\OPSQAI\backups\<ts>\`
3. Copy `%ProgramFiles%\OPSQAI` → `%ProgramData%\OPSQAI\rollback\<ts>\`
4. Stop services → new binaries → new migrations → start services
5. Health check
6. Failure → fully automatic rollback (binaries + `BackupService.restore(<ts>)` + audit entry)
7. Success → retain snapshot 7 days

## Phase 8 — Health check + OPSQAI Doctor

**Health check** (installer + Admin Console + updater gate):

- PostgreSQL `SELECT 1`
- Platform API `/health`
- Web UI `/`
- AI provider (if configured)
- Storage probe (write + read + delete)
- License signature valid + not expired
- Encryption key available (decrypt canary)
- Migration version matches application version
- Background jobs alive with fresh heartbeat

**OPSQAI Doctor** (Admin Console + `opsqai doctor` CLI):

- Services stopped or in non-running state
- Free disk thresholds (`pgdata`, `objects`, `backups`)
- TLS certificates near expiry
- Backups older than policy
- License near expiry
- AI provider unreachable
- PostgreSQL slow queries / long transactions
- Missing indexes on hot tables
- Fingerprint drift since last successful heartbeat
- Feature-flag / edition mismatch vs license

Doctor produces a structured report (JSON + rendered green/amber/red) and can be scheduled by `OpsqaiWorker`.

## Phase 9 — Windows build pipeline

- `opsqai-windows/build/build.ps1` copies `migrations/selfhost/` into the payload, never `supabase/migrations/`.
- Vite with `PlatformMode=SelfHosted` swaps providers and excludes Supabase modules.
- Build guard fails Self-Hosted build if any `@supabase/*` module ID appears in emitted bundles.
- `services/bootstrap/init.js` on first run: generate immutable `installation_id`, compute `machine_fingerprint_sha256`, generate `OPSQAI_ENCRYPTION_KEY` + Ed25519 keypair, write ACL-locked `secrets.env`, populate `platform_metadata`, `createFirstAdmin(...)`, mark setup complete.

## Phase 10 — Verification

- `bun run build` for both `PlatformMode.Cloud` and `PlatformMode.SelfHosted` (guard catches Supabase leakage on Self-Hosted).
- Clean Windows Server VM: install → license activate → admin created → login → upload document → simulate failed update → automatic rollback → Health + Doctor green.
- Cloud regression: existing Playwright/portal flows green on `opsqai.de`.

---

## Non-goals

- Editing `supabase/migrations/` or `src/integrations/supabase/*`.
- MC / Portal / marketing site.
- In-place migration from a pre-existing Self-Hosted DB.

## Execution order once approved

1. Introduce `DeploymentType`, `PlatformMode`, `Capability`, `Edition` enums + provider registry.
2. Provider interfaces + Cloud implementations bound (no behavior change).
3. `migrations/selfhost/` authored (incl. `platform_metadata`, `feature_flags`, append-only `audit_log`); Windows payload switched over.
4. Local auth (Ed25519) + `PostgresUserRepo`.
5. `AesGcmCipher` + Windows ACL secrets flow.
6. Storage providers (NTFS + S3 with Test Connection).
7. Wizard rewrite (15 pages) + immutable `installation_id` + fingerprint hash + clean-install guard.
8. Update pipeline with fully automatic rollback + Health check.
9. OPSQAI Doctor module + Admin Console screen + `opsqai doctor` CLI.
10. Cloud + Self-Hosted end-to-end verification and Supabase-import build guard.

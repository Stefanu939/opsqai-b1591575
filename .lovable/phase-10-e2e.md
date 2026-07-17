# Phase 10 — End-to-End Verification

This is the acceptance runbook for the Windows Self-Hosted product. It is
executed on a clean Windows Server VM before every signed release, and
mirrored (where possible) as automated Vitest / build-pipeline checks that
run in CI.

## 1 — Automated (CI)

Executed on every PR that touches `src/lib/platform/**`,
`src/lib/providers/**`, `migrations/selfhost/**`, or `opsqai-windows/**`:

| Check | Command | Blocking |
| --- | --- | --- |
| Unit suite (platform + providers + services) | `bunx vitest run` | yes |
| Bundle scanner self-test | `bunx vitest run opsqai-windows/build/__tests__/verify-bundle.test.ts` | yes |
| Cloud production build | `bun run build` | yes |
| Self-Hosted production build | `bun run build:selfhosted` | yes |
| Self-Hosted bundle scan | `bun run verify:selfhost-bundle` | yes |
| Self-Hosted migration lint | `rg -n 'auth\.uid\|auth\.users\|to authenticated\|to anon\|to service_role' migrations/selfhost` — must be empty | yes |

The Windows installer build (`bun run build:installer`) re-runs the bundle
scanner and refuses to package if it fails.

## 2 — Manual (Windows Server VM)

Fresh Windows Server 2022 Standard, no OPSQAI artifacts present.

### 2.1  Install
1. Copy `OPSQAI-Setup.exe` to the VM. Confirm publisher chain and Authenticode timestamp in file properties.
2. Run the installer as Administrator. Complete the 10-step Setup Wizard.
3. Confirm services registered: `OpsqaiDatabase`, `OpsqaiPlatform`, `OpsqaiWorker`, `OpsqaiCaddy`, `OpsqaiUpdater` — all `Running`.

### 2.2  License activation
1. Open `https://<host>/` in the local browser; verify Caddy serves the app under HTTPS.
2. Paste the signed `.opsqai.lic` bundle. Expect green license card with expiry, edition, seats.
3. `opsqai license status` must report `valid=true` and match the UI.

### 2.3  Admin bootstrap
1. First-run flow creates the initial admin. Sign out, sign back in as that admin.
2. `psql` (via `opsqai psql`) — confirm the admin's row exists in `users` and has the `admin` role in `user_roles`.

### 2.4  Feature smoke
1. Upload a document > 5 MB. Confirm it lands under `OPSQAI_STORAGE_LOCAL_PATH` and the SHA-256 matches.
2. Send an SMTP test from Admin → Notifications. Confirm delivery.
3. Trigger `opsqai backup create --tag manual-smoke`; confirm entry via `opsqai backup list` and `opsqai backup verify <id>` → `ok`.

### 2.5  Update + rollback
1. Stage a **broken** update package (wrong SHA in manifest).
2. `opsqai update apply`. The updater must:
   - Take a `pre-update` tagged snapshot with SHA-256 verified.
   - Detect the manifest mismatch and abort **before** swapping app files.
3. Now stage a **valid** update package where the new app fails its post-swap health probe.
4. `opsqai update apply`. Expect: snapshot taken → files swapped → health probe fails → automatic `opsqai backup restore <pre-update-id>` → services back on old version → `opsqai update history` records the rollback with the reason.

### 2.6  Observability
1. `curl -k https://<host>/api/public/ready` → `200 { ok: true }`.
2. `curl -k https://<host>/api/public/health` → `200`, all probes `ok`.
3. `curl -k https://<host>/api/public/metrics` → Prometheus exposition, non-empty counters.
4. `curl -k https://<host>/api/public/doctor` → `200`, severity `green`.
5. `opsqai doctor` — colored green output, exit 0.

### 2.7  Air-gap guard
1. Block outbound network on the VM.
2. Every UI page, `opsqai doctor`, and `opsqai backup create` must still succeed.
3. Confirm no request to `*.supabase.co`, `*.lovable.app`, or `opsqai.de` in the Caddy access log or Windows firewall log.

## 3 — Cloud regression

Executed on the hosted `opsqai.de` deployment after every merge to main.

- MC portal login, tenant switch, license issuance, telemetry inbox — all
  covered by the existing Playwright suite. It must remain green; a red run
  blocks the Self-Hosted release too because both products share the
  provider registry.

## 4 — Definition of Done

A release ships only when:

- [ ] All CI checks in §1 pass on the release commit.
- [ ] Every step in §2 completed on a fresh VM with signed logs.
- [ ] §3 Cloud regression green on the same commit.
- [ ] `bundle-scan.log` from the installer build is archived alongside the `.exe`.
- [ ] `opsqai doctor` and `/api/public/doctor` both report `green`.
- [ ] A rollback drill in §2.5 succeeded end-to-end within the release SLA (< 5 min).

Approved, with one addition before you switch to build mode.

AMENDMENT — Regeneration warning for backup-restore collision

Scenario: a customer restores their own installation from their own local 

backup (DR scenario #1/#3), using the license bundle that was valid at 

backup time. Separately, an MC admin regenerates the installation package 

for the same order (e.g. requested by someone else at the customer who 

wasn't aware a backup-restore was already in progress). With the current 

default (previous bundle revoked on regenerate), the customer's 

legitimately-restored installation will silently lose its modules on next 

reconnect — with no warning given at the point of regeneration.

Add an explicit warning on the MC "Regenerate Package" button/dialog, 

shown whenever "keep previous bundle valid" is left unchecked (the 

default):

"This will revoke the previous bundle. If the customer is already running 

a restored installation using the previous license (e.g. from their own 

backup), it will lose access to paid modules on next reconnect. Check 

'keep previous bundle valid' if you're unsure whether an older bundle 

might still be in active use."

This doesn't change the underlying logic — CRL-on-regenerate stays the 

default — it just prevents an avoidable support incident by making the 

tradeoff visible at the moment of the decision.

CLARIFICATION — please confirm before building

"installer_version... latest GA by default" — confirm this means "latest 

version currently published on the Stable channel" (per the existing 

Release Management model: Stable / LTS / Beta), not a separate fourth 

category. If "GA" and "Stable" are meant to be synonyms here, use 

"Stable" consistently in code, UI labels, and docs to avoid introducing 

ambiguous terminology alongside the already-established channel names.

Also, once this phase is complete, update the DR runbook (5.5.4, 

"Installer reissue" scenario) to reference this concrete screen/flow by 

name, instead of describing it abstractly — the runbook should point 

directly at "Management Center → Orders → Installation Package → 

Regenerate."

Proceed to build mode with this amendment included.  
Phase 4.5 — Part 2: Installation Package Generation

Scope: build the full package generation flow in Management Center for paid + trial orders, on top of the Part 1 decoder fix that already landed.

## Resolved decisions (from your answers)

1. **Secrets in `.env**` — hybrid. MC generates only `OPSQAI_INSTALL_ID` and embeds the signed activation bundle. `POSTGRES_PASSWORD`, `MINIO_ROOT_USER/PASSWORD`, `OPSQAI_PUBLIC_URL`, SMTP creds → left as placeholders; `entrypoint.sh` generates strong random values on first boot when unset and writes them to a customer-owned volume. Complies with **AD-009** (MC holds no customer infra secrets).
2. **Delivery** — 24h signed URL delivered in email + persisted in Customer Portal (Portal button re-mints a fresh 24h URL on click; every download logged in `audit_log`).
3. **Regeneration semantics** — configurable per-order. Default: **invalidate previous bundle** by adding its per-license tokens to the CRL and pushing CRL to heartbeat. Escape hatch checkbox "keep previous bundle valid" for admins.
4. **installer_version** — latest GA by default; per-order `pinned_installer_version` column, editable by platform_admin.

## Deliverables

### 1. Database (migration)

- `license_installs` — add columns (nullable, backward-compatible):
  - `install_id uuid unique` (deterministic; see §2)
  - `installer_version text`
  - `package_generated_at timestamptz`
  - `package_generation_count integer default 0`
  - `package_storage_path text`
  - `package_checksum_sha256 text`
  - `previous_bundle_revoked boolean default true`
- `license_orders` — add `pinned_installer_version text null`, `technical_contact_email text null`.
- New table `installation_package_downloads` (audit-grade): `id`, `install_id`, `actor_user_id`, `actor_ip`, `signed_url_expires_at`, `downloaded_at`, `user_agent`.
- Grants + RLS (platform_admin only; customer sees own via Portal RPC).
- Bucket `installation-packages` (private, service-role write, no anon).

### 2. Deterministic `install_id`

Server-only helper `computeInstallId(orderId)`:

```
install_id = uuidv5(namespace=OPSQAI_INSTALL_NAMESPACE, name=`order:${orderId}`)
```

- Namespace UUID stored as env `OPSQAI_INSTALL_NAMESPACE` (generated once, backend-only).
- Regeneration for the same order returns the exact same `install_id`. Verified by test asserting `generate(order) === regenerate(order)`.

### 3. Server functions (`src/lib/installation-package.functions.ts`)

All gated by `platform_admin` via `requireSupabaseAuth` + `has_role`:

- `generateInstallationPackage({ order_id, installer_version?, keep_previous_bundle_valid? })`
  - Loads order + licenses (allow status `active` OR `trial`).
  - Computes/loads `install_id`.
  - Selects `installer_version` (arg → order.pinned → latest GA from `license_releases`).
  - Signs a fresh activation bundle (Ed25519, existing `license-signing.server.ts`) containing all current per-module tokens + active signing public keys + CRL.
  - Renders package tarball in memory:
    - `docker-compose.yml` (from `docker/docker-compose.yml` template, `INSTALLER_VERSION` baked)
    - `.env.template` with `OPSQAI_INSTALL_ID=<real>` and secret placeholders `__CHANGE_ME__`
    - `activation-bundle.json` (signed)
    - `entrypoint.sh` extended: generate `POSTGRES_PASSWORD` / `MINIO_ROOT_PASSWORD` if `__CHANGE_ME__`
    - `README.md` (quick-start, DR pointer, `install_id` printed)
    - `CHECKSUMS.sha256`
  - Uploads to `installation-packages/<install_id>/opsqai-<installer_version>-<yyyymmdd-hhmm>.tar.gz`.
  - If not `keep_previous_bundle_valid`: publishes previous bundle's tokens to CRL (`licenses.revoked_bundle_generation < current`).
  - Writes `audit_log` (`action=installation_package.generated`).
  - Enqueues app email to `technical_contact_email` via existing `/lovable/email/transactional/send` with template `installation-package-ready` (24h signed URL, install_id, checksum).
  - Returns `{ install_id, installer_version, checksum, signed_url, expires_at }`.
- `getInstallationPackageDownloadUrl({ order_id })` — re-mints a fresh 24h signed URL, logs a row in `installation_package_downloads`.
- `setOrderInstallerPin({ order_id, pinned_installer_version })` — platform_admin only.

### 4. Email template

New `src/lib/email-templates/installation-package-ready.tsx` (React Email, brand-styled, no attachments — link only, per AI Gateway rules). Registered in `registry.ts`.

### 5. Management Center UI

Route `src/routes/_authenticated/app.admin.orders.$orderId.tsx` (or extend existing licenses/orders detail):

- Section "Installation Package":
  - Status badge: Not generated / Generated &nbsp; / Regenerated N times
  - `install_id` display (copyable, deterministic — same across regenerations)
  - `installer_version` (with pin selector for platform_admin)
  - Checkbox "Keep previous bundle valid on regenerate" (default OFF)
  - Button **Generate Package** (when never generated, or trial)
  - Button **Regenerate Package** (when already generated)
  - Button **Download** → calls `getInstallationPackageDownloadUrl`, opens signed URL in new tab
  - Recent downloads table (last 10 from `installation_package_downloads`)
  - Tech contact email (editable inline)

### 6. Customer Portal

Extend Customer Portal "Available downloads" section: only `Download` (no generate/regenerate). Same re-minted 24h signed URL via a portal-scoped server fn that validates the caller owns the order's company. Audited.

### 7. Tests

- `installation-package.test.ts`:
  - `generate(order)` twice → identical `install_id`, identical package structure, new bundle contents & checksum
  - Trial-status order allowed
  - Non-platform_admin caller rejected
  - Previous bundle CRL revocation happens on regenerate (default)
  - `keep_previous_bundle_valid` skips revocation
- Snapshot of rendered email template.

### 8. Docs

- `docs/administrator-guide/02-installation.md` — add "obtaining your install package" section
- `docs/engineering/04-issue-a-license.md` — add package generation step
- `docs/security-documentation/05-license-security.md` — document CRL-on-regenerate policy

## Files created

```
supabase/migrations/<ts>_installation_packages.sql
src/lib/installation-package.functions.ts
src/lib/installation-package.server.ts          (tar assembly, template rendering)
src/lib/__tests__/installation-package.test.ts
src/lib/email-templates/installation-package-ready.tsx
src/routes/_authenticated/app.admin.orders.$orderId.tsx   (new detail view if absent)
```

## Files modified

```
src/lib/email-templates/registry.ts             (register new template)
docker/entrypoint.sh                            (auto-generate placeholder secrets)
src/lib/email-templates/... (no design changes elsewhere)
docs/administrator-guide/02-installation.md
docs/engineering/04-issue-a-license.md
docs/security-documentation/05-license-security.md
```

## Out of scope (deferred to post-GA)

- Kubernetes/Helm packaging (AD-021, v1.1 candidate)
- Package auto-push to customer S3 buckets
- Air-gap-only USB-bundle format (bundle-only, no compose)

## Report I will produce after implementation

1. Files created/modified (final list)
2. Test output proving `install_id` determinism across regeneration
3. Concrete description of what each button does in MC UI + Portal
4. Screenshot / DOM check of the MC order detail after a generate + regenerate cycle
5. Confirmation the previous-bundle CRL revocation path fires (unit + integration assertion)

If this looks good, approve and I switch to build mode.
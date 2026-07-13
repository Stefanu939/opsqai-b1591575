# Changelog

All notable changes to OPSQAI are documented here. This project adheres to Semantic Versioning.

## [1.0.0-rc.2] — 2026-07-12

Phase 4.5 Part 2 — Installation Package Generation.

### Added

- MC generates a signed ZIP installation package per install (`docker-compose.yml`, `.env.template`, `entrypoint.sh`, `activation-bundle.json`, `README.md`, `CHECKSUMS.sha256`).
- Hybrid secret policy (AD-009): MC ships only `OPSQAI_INSTALL_ID` and the signed activation bundle; `entrypoint.sh` generates infra secrets on first boot.
- Idempotent regeneration keyed on `install_id`. Previous bundle CRL-revoked by default; escape hatch "Keep previous bundle valid" for backup-restore scenarios.
- 24-hour signed download URL delivered by email + persistent Customer Portal button, with per-download audit rows (`installation_package_downloads`).
- Per-license installer-version pin (`licenses.pinned_installer_version`); latest **Stable** channel release used when unpinned.
- New template `installation-package-ready`.
- New route `/app/platform/installation-package/$installId` with generate, regenerate, pin, contact, and audit views.
- Docs: `administrator-guide/02-installation.md`, `engineering/04-issue-a-license.md`, `security-documentation/05-license-security.md` updated; DR runbook Scenario 8 (Installer reissue) added.

## [1.0.0] — 2026-07-11

First public release. Cuts the platform, licensing model, self-hosted packaging, disaster recovery, customer portal, deployment-mode gate, and the full documentation suite.

### Added

- Two-axis licensing (Installation + Module) with Ed25519 signing and versioned tokens (`license_version: 1`, `kind`, `install_id`, `key_id`).
- Central signing-key rotation with `key_id` and CRL, both propagated via signed activation bundles.
- Offline activation flow with signed bundles and `/app/platform/license-activation` UI.
- Installation and ownership transfer flow.
- Self-hosted packaging: Docker Compose reference, resumable Setup Wizard, `opsqai doctor` CLI + panel.
- Seven-scenario Disaster Recovery: break-glass secret (scrypt) + Bootstrap Recovery Token (Ed25519).
- Deployment-mode gate (`OPSQAI_MODE=mc|selfhost`) enforced both client-side and server-side (`assertMode`).
- Customer Portal (downloads, contract, release notes, tickets).
- Documentation: Product, Administrator, Technical, Security, Architecture Book, Engineering Handbook.
- `SECURITY.md` with coordinated disclosure address.
- DR-Verify runbook and Reference-install acceptance runbook.

### Security

- Roles held only in `user_roles`; `has_role()` is `SECURITY DEFINER` with pinned `search_path`.
- Every public-schema table has explicit `GRANT`s.
- Every privileged server function verified against a negative-path test.
- `platform_config` mutations use optimistic locking.

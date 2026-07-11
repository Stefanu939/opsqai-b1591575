# Changelog

All notable changes to OPSQAI are documented here. This project adheres to Semantic Versioning.

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

# OPSQAI v1.0.0 — Release Notes

**Release date:** 2026-07-11
**Installer version:** 1.0.0
**Application version:** 1.0.0
**Docs version:** 1.0

## Highlights

- Two-axis licensing (Installation + per-Module), signed with Ed25519.
- Self-hosted first: Docker Compose reference, resumable Setup Wizard, `opsqai doctor`.
- Seven-scenario Disaster Recovery with two independent paths (break-glass and Bootstrap Recovery Token).
- Customer Portal for downloads, contract, and release notes.
- Full documentation suite (Product, Admin, Technical, Security, Architecture Book) — rendered in-app and exportable as PDF.
- Deployment-mode gate — one codebase, two hardened deployments.

## Verification

- Reference install acceptance: `docs/engineering/runbooks/reference-install-v1.0.0.md`.
- DR-Verify: `docs/engineering/runbooks/dr-verify-v1.0.0.md`.
- Signed release manifest: `https://opsqai.de/releases/1.0.0/manifest.json`.
- Docker image: signed with cosign.
- SBOM: attached to the GitHub release (CycloneDX).

## Notes for administrators

- Back up the database **before** applying this release. The install prints its `install_id` on first boot; write it down.
- If the activation bundle is older than 60 days, download a fresh one from the Customer Portal.
- Enable Password HIBP check (Auth Settings) if you have not already.

## Marketing site refresh

The `/pricing`, `/product`, and `/trust/*` pages are refreshed alongside the engine cut. The site refresh may lag the engine tag by up to two weeks; the announcement is made once both are aligned.

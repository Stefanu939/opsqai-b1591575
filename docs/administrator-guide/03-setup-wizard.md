# 3. Setup Wizard

OPSQAI Self-Hosted ships two distinct setup surfaces. Do not confuse them.

## First-run wizard — `/first-run` (public, one-time)

Reached automatically the first time anyone loads the app on a fresh install.

- **Publicly reachable** while the install has zero platform admins. Once
  the wizard creates the first admin, the route redirects permanently to
  `/auth` — this is a security-critical boundary.
- **Resumable**: progress is stored in `platform_config.setup_progress` as
  an array of step ids. **No secrets are ever written to this column** —
  only step markers.
- **Secret handling**: AI provider API key, SMTP password, and backup
  destination credentials are written to `/var/lib/opsqai/secrets.env`
  (mode 0600, owned by the container runtime user) and sourced by
  `docker/entrypoint.sh` at container start. The database only stores
  non-secret identifiers (host, port, provider kind, bucket name). After
  finishing the wizard you MUST restart the container so the new env
  values are picked up: `docker compose restart opsqai`.
- **Backup completeness**: `secrets.env` lives on the same customer-owned
  data volume as PostgreSQL and object storage, so it is captured by the
  standard Config backup scope (see
  `docs/security-documentation/07-backup-security.md`). Losing it after a
  DR restore means re-entering AI/SMTP credentials.

### Steps

1. **Accept EULA** — displays terms; requires an explicit checkbox tick.
2. **Import Installation License** — paste the signed `opsqai.v1.…` token.
3. **Configure Storage** — probe upload/read/delete against the uploads bucket.
4. **Configure AI provider** — pick Lovable / Azure / OpenAI-compatible / Ollama; API key goes to `secrets.env`.
5. **Configure SMTP** — host, port, from-address; credentials go to `secrets.env`.
6. **Configure SSO** (optional) — SAML/OIDC can be skipped and configured later under Admin → SSO Setup.
7. **Configure Backup** — pick target (local / S3 / Azure Blob / NAS); credentials go to `secrets.env`.
8. **Test connections** — runs the same probes as the Doctor panel; a `fail` blocks progress.
9. **Create Admin** — creates the first Supabase Auth user and promotes them to `platform_owner` atomically (advisory-locked DB function, race-safe).
10. **Finish** — redirects to `/auth` for sign-in.

If you close the browser mid-way, reopen `/first-run` — the wizard resumes
at the first incomplete step. Once step 9 succeeds, `/first-run` is
permanently sealed.

## Post-setup Doctor panel — `/app/platform/setup` (authenticated)

The same URL that hosted the pre-1.0 wizard now serves the **Doctor**
health-check tool. Requires `platform_admin` and stays available for the
life of the install. Matches the `opsqai doctor` CLI command from the DR
runbook.

Use it any time to re-run health probes (database reachable, signing keys
present, AI provider registered, storage writable, SMTP reachable,
Installation License valid, heartbeat recent).

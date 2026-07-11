# 12. Database schema reference

Generated from `supabase/migrations/`. Regenerate with `bun run docs:schema`.

## Tables of highest security interest

- `licenses` — signed tokens, module + install kind.
- `license_signing_keys` — Ed25519 public keys with `active` flag and `key_id`.
- `license_installs`, `license_orders`, `license_releases` — MC-side registries.
- `dr_bootstrap_tokens` — audit of Bootstrap Recovery Tokens.
- `platform_config` — single-row god table (install_id, break-glass hash, recovery flags, setup progress).
- `user_roles` — RBAC anchor. Never write from client, never trust JWT for roles.
- `audit_log`, `audit_log_terminated_archive` — governance.

## Security definer function inventory

- `public.has_role(_user_id uuid, _role app_role) returns boolean`.

Any addition to this inventory requires an entry in the Engineering Handbook migration checklist and a positive/negative test.

## GRANT invariants

Every `CREATE TABLE public.*` migration includes a `GRANT` block. `anon` grants exist only for public read-only tables (`system_doc_catalog` public rows, `demo_sessions`, `contact_submissions` inserts). `service_role` receives full grants on every table.

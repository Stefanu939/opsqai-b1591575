# 10. Security overview

Short version — the full Security Documentation is the authoritative book.

- **Transport:** HTTPS everywhere. The customer supplies the certificate for their install.
- **At rest:** PostgreSQL data at rest encryption is the customer's responsibility (managed PG or `pgcrypto` for column-level).
- **Authentication:** Supabase Auth with email/password + Google + optional SAML SSO (Enterprise).
- **Authorization:** RBAC via `user_roles` + `has_role()` security-definer function. Roles are never stored on `profiles`.
- **Licensing crypto:** Ed25519 with `key_id`-based rotation. Signing keys never leave the MC.
- **Break-glass:** high-entropy secret hashed with scrypt (`N=2^15`, `r=8`, `p=1`); only the hash is stored.
- **Audit:** every governance-relevant action lands in `audit_log`.
- **DR:** two independent recovery paths, cryptographically distinct.

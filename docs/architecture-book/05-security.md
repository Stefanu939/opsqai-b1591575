# 5. Security

Full detail in Security Documentation. Architectural choices:

## Architecture Decisions

- **AD-010: Roles in a separate table, never on `profiles`, never in JWT.** Rationale: JWT is client-visible, `profiles` is user-editable through some flows. Consequence: `has_role()` is a security-definer function with pinned `search_path`.
- **AD-011: `has_role()` is `SECURITY DEFINER`.** Alternative (regular function) rejected: recursive RLS on `user_roles` when policies query it directly.
- **AD-012: Break-glass is scrypt-hashed, single-use, offline.** Alternative (TOTP or OAuth-based DR) rejected: assumes network + third parties in a disaster.
- **AD-013: Bootstrap Recovery Token is Ed25519-signed and `install_id`-bound.** Alternative (bearer token with server check) rejected: MC could be unreachable at DR time.

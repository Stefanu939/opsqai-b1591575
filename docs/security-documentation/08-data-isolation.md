# 8. Data isolation

## Between customers

Every install is a separate deployment with its own database, storage, and credentials. There is no shared datastore. The Management Center is the only shared component; it holds licensing metadata (customer name, install_id, contact email, tokens) — never operational content.

## Inside an install

- Row-Level Security is enabled on every table in `public`.
- Every policy invokes `has_role()` — a `SECURITY DEFINER` function whose `search_path` is pinned to `public`.
- All security-definer functions are inventoried in `docs/technical-documentation/12-database-schema-reference.md`. Any addition requires a review checklist entry (Engineering Handbook chapter 8).

## Grants

Every public-schema table declared in migrations has an explicit `GRANT` block. Tables carrying auth-only data (`user_roles`, `licenses`, `platform_config`) are NEVER granted to `anon`.

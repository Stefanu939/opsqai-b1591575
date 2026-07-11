# 7. Migrations — rules

- Additive only until Phase 6+; breaking changes require a documented migration path and version bump.
- Every migration ends with `GRANT` block for public-schema tables.
- Enable RLS in the same migration that creates the table.
- Policies use `has_role()` — never inline `EXISTS (SELECT ... FROM user_roles ...)`.
- No secrets in seed data.
- No production data mutation in migrations — use insert-tool operations, or add a one-off admin script gated by `platform_admin`.

## Review checklist

- [ ] RLS enabled?
- [ ] Explicit `GRANT`s?
- [ ] Policies cover SELECT / INSERT / UPDATE / DELETE where applicable?
- [ ] Audit path exists?
- [ ] `anon` grant justified (or absent)?
- [ ] Test negative-path (non-admin denied)?

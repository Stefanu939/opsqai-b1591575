-- 0020_superadmin_permission_coverage.sql
-- Superadmin coverage backfill.
--
-- 0013 granted every permission that existed AT THAT TIME to platform_owner
-- and platform_admin via a CROSS JOIN. Permissions introduced by later
-- migrations (e.g. `academy.assign` in 0018) were therefore never granted to
-- the installation owner, so an owner-only installation silently lost the
-- corresponding actions.
--
-- This migration re-runs the coverage join for the superadmin roles. It is
-- idempotent and grants nothing to non-superadmin roles, so the RBAC model
-- for manager/team_leader/employee/viewer is unchanged.

INSERT INTO public.role_permissions (role_key, permission_key)
SELECT r.role_key, p.key
FROM (VALUES ('platform_owner'),('platform_admin'),('admin')) AS r(role_key)
CROSS JOIN public.permissions p
ON CONFLICT DO NOTHING;

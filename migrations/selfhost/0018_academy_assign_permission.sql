-- 0018_academy_assign_permission.sql
-- Adds the missing `academy.assign` permission used by the Academy assignment
-- flow (UI gate + academy-lms.functions assignTraining). Idempotent.

INSERT INTO public.permissions (key, label, category) VALUES
  ('academy.assign','Assign Academy training','Academy')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category;

-- Admin keeps full coverage.
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT 'admin', 'academy.assign'
ON CONFLICT DO NOTHING;

-- Managers assign training; team leaders assign within their team.
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('manager','academy.assign'),
  ('team_leader','academy.assign')
ON CONFLICT DO NOTHING;

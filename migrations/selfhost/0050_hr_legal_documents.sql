-- OPSQAI HR — country legal review and immutable document metadata.
BEGIN;

ALTER TABLE public.hr_documents
  ADD COLUMN IF NOT EXISTS legal_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS legal_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_reviewed_by text,
  ADD COLUMN IF NOT EXISTS legal_review_notes text,
  ADD COLUMN IF NOT EXISTS legal_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS legal_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_verified_on date,
  ADD COLUMN IF NOT EXISTS legal_review_due date,
  ADD COLUMN IF NOT EXISTS salary_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS expected_pages text;

CREATE INDEX IF NOT EXISTS hr_documents_legal_review_idx
  ON public.hr_documents(company_id, legal_status, legal_review_due);

ALTER TABLE public.hr_document_templates
  ADD COLUMN IF NOT EXISTS legal_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS legal_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_verified_on date,
  ADD COLUMN IF NOT EXISTS legal_review_due date,
  ADD COLUMN IF NOT EXISTS expected_pages text;

INSERT INTO public.permissions (key, name, module_key, description)
VALUES ('hr.legal_review','Review HR legal documents','HR','Approve country-specific HR documents after legal review')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_key, permission_key)
SELECT r.role_key, 'hr.legal_review'
FROM (VALUES ('superadmin'),('platform_owner'),('workspace_owner'),('admin')) AS r(role_key)
WHERE EXISTS (SELECT 1 FROM public.roles ro WHERE ro.key = r.role_key)
ON CONFLICT DO NOTHING;

COMMIT;

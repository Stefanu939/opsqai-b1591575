-- 0036_transport_audit_pro.sql
-- Self-Hosted only. Upgrades the Transport periodic audit into a full
-- compliance loop:
--  * value limits (min/max) with automatic out-of-range detection;
--  * per-asset lines generated for every active vehicle / driver;
--  * photo / file evidence attached to each checklist line;
--  * auditor + approver identity and signature at closure;
--  * checklist template provenance for reusable audit templates.
-- Vanilla PostgreSQL; access control stays in the application layer.

ALTER TABLE public.transport_checklist_items
  ADD COLUMN IF NOT EXISTS value_min double precision,
  ADD COLUMN IF NOT EXISTS value_max double precision,
  ADD COLUMN IF NOT EXISTS per_asset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_key text;

ALTER TABLE public.transport_check_results
  ADD COLUMN IF NOT EXISTS subject_label text,
  ADD COLUMN IF NOT EXISTS value_min double precision,
  ADD COLUMN IF NOT EXISTS value_max double precision,
  ADD COLUMN IF NOT EXISTS out_of_range boolean NOT NULL DEFAULT false;

ALTER TABLE public.transport_checks
  ADD COLUMN IF NOT EXISTS signed_by uuid,
  ADD COLUMN IF NOT EXISTS signed_by_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS template_key text;

-- Evidence lives in the local database so a Self-Hosted installation keeps a
-- single backup surface; files are capped by the application layer.
CREATE TABLE IF NOT EXISTS public.transport_check_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  result_id uuid NOT NULL REFERENCES public.transport_check_results(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes integer NOT NULL DEFAULT 0,
  data bytea NOT NULL,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_check_evidence_result_idx
  ON public.transport_check_evidence(result_id);

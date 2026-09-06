-- 0035_transport_audit_values.sql
-- Self-Hosted only. Lets a checklist subject also capture a measured value
-- (numeric or free text) that is stored on the audit run itself.
-- Vanilla PostgreSQL; access control stays in the application layer.

ALTER TABLE public.transport_checklist_items
  ADD COLUMN IF NOT EXISTS value_kind text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS value_unit text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_checklist_items_value_kind_check'
  ) THEN
    ALTER TABLE public.transport_checklist_items
      ADD CONSTRAINT transport_checklist_items_value_kind_check
      CHECK (value_kind IN ('none','number','text'));
  END IF;
END $$;

ALTER TABLE public.transport_check_results
  ADD COLUMN IF NOT EXISTS value_kind text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS value_unit text,
  ADD COLUMN IF NOT EXISTS value_text text,
  ADD COLUMN IF NOT EXISTS value_number double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_check_results_value_kind_check'
  ) THEN
    ALTER TABLE public.transport_check_results
      ADD CONSTRAINT transport_check_results_value_kind_check
      CHECK (value_kind IN ('none','number','text'));
  END IF;
END $$;

-- OPSQAI Self-Hosted — 0047 FAQ department scope.
--
-- A department created in Organization must be selectable when publishing an
-- FAQ, exactly like knowledge documents already are. An FAQ without a
-- department stays company-wide; an FAQ with one only grounds answers for
-- members of that department (enforced in src/lib/department-scope.server.ts).

BEGIN;

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS department_id UUID
    REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS faqs_department_idx ON public.faqs (department_id);

COMMIT;

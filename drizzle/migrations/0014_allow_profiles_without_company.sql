ALTER TABLE public.profiles ALTER COLUMN company_id DROP NOT NULL;
COMMENT ON COLUMN public.profiles.company_id IS 'NULL for public KAI visitors; only authorized company enrolment assigns a company.';
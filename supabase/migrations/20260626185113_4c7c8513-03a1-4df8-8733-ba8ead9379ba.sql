-- Dedupe existing academy_certificates by enrollment_id, keeping the most recent row.
DELETE FROM public.academy_certificates a
USING public.academy_certificates b
WHERE a.enrollment_id = b.enrollment_id
  AND a.issued_at < b.issued_at;

-- Edge case: ties — keep the row with the larger id.
DELETE FROM public.academy_certificates a
USING public.academy_certificates b
WHERE a.enrollment_id = b.enrollment_id
  AND a.issued_at = b.issued_at
  AND a.id < b.id;

ALTER TABLE public.academy_certificates
  DROP CONSTRAINT IF EXISTS academy_certificates_enrollment_unique;
ALTER TABLE public.academy_certificates
  ADD CONSTRAINT academy_certificates_enrollment_unique UNIQUE (enrollment_id);

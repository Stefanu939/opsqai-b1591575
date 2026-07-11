-- Remove hard_expiry column. Final architecture keeps only:
--   expires_at            → module availability (blocks after this date)
--   maintenance_expires_at → updates/support window
ALTER TABLE public.licenses DROP COLUMN IF EXISTS hard_expiry;
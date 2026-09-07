-- OPSQAI Transport — editable CMR draft names.
-- A consignment note can be saved as a working draft under a human name
-- (for example "Rotterdam weekly run") before a number is ever allocated.

ALTER TABLE public.transport_cmr
  ADD COLUMN IF NOT EXISTS draft_name text;

CREATE INDEX IF NOT EXISTS transport_cmr_draft_name_idx
  ON public.transport_cmr (company_id, draft_name);

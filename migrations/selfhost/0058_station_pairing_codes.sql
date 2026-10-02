-- One-time pairing codes for workstations joining from another location.
-- Only the SHA-256 of the code is stored; codes expire after 15 minutes
-- and can be used once.
CREATE TABLE IF NOT EXISTS public.station_pairing_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash   TEXT NOT NULL UNIQUE,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  used_by_station UUID
);
CREATE INDEX IF NOT EXISTS station_pairing_codes_expires_idx ON public.station_pairing_codes (expires_at);

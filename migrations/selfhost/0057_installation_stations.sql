-- 0057_installation_stations.sql
-- Self-Hosted only. Workstations (PC 2, PC 3 …) paired with the main computer.
--
-- The main computer keeps the single installation licence and install_id.
-- Each workstation gets its own station id + Ed25519 public key at pairing,
-- so the company can see, rename and revoke every connected computer
-- (wherever it is located) without the licence ever being duplicated.

CREATE TABLE IF NOT EXISTS public.installation_stations (
  id            UUID PRIMARY KEY,
  name          TEXT NOT NULL,
  location      TEXT,
  public_key    TEXT NOT NULL,
  hostname      TEXT,
  paired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID
);

CREATE INDEX IF NOT EXISTS installation_stations_active_idx
  ON public.installation_stations (revoked_at);

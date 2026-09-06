-- 0030_transport_gps.sql
-- OPSQAI Transport — GPS/telematics registry, position history, audit runs and
-- richer settings. Self-Hosted only (vanilla PostgreSQL, app-layer access
-- control through transport_grants).

-- ── Settings: more specific configuration ────────────────────────────────
ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS week_start smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS doc_alert_windows jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_day smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS audit_owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS audit_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS map_center_lat double precision,
  ADD COLUMN IF NOT EXISTS map_center_lng double precision,
  ADD COLUMN IF NOT EXISTS map_zoom smallint NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS live_tracking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gps_poll_minutes smallint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS search_provider text NOT NULL DEFAULT 'auto';

-- ── GPS devices (per vehicle) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  vehicle_id uuid,
  provider text NOT NULL DEFAULT 'manual',
  device_id text NOT NULL,
  label text,
  api_base_url text,
  api_token text,
  poll_minutes smallint NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_error text,
  last_lat double precision,
  last_lng double precision,
  last_speed_kph double precision,
  last_fix_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_gps_devices_provider_check CHECK (provider IN
    ('manual','tcomm','webfleet','wialon','traccar','other')),
  CONSTRAINT transport_gps_devices_unique UNIQUE (company_id, provider, device_id)
);

CREATE INDEX IF NOT EXISTS transport_gps_devices_vehicle_idx
  ON public.transport_gps_devices(vehicle_id);

-- ── Position history ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_positions (
  id bigserial PRIMARY KEY,
  company_id uuid,
  vehicle_id uuid,
  device_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kph double precision,
  heading double precision,
  source text NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_positions_source_check CHECK (source IN
    ('manual','gps','import'))
);

CREATE INDEX IF NOT EXISTS transport_positions_vehicle_idx
  ON public.transport_positions(vehicle_id, recorded_at DESC);

-- ── Transport audit runs (the "run audit" button) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  score smallint NOT NULL DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ran_by uuid,
  ran_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_audit_runs_company_idx
  ON public.transport_audit_runs(company_id, created_at DESC);

-- ── Saved map places keep a company-scoped uniqueness ────────────────────
ALTER TABLE public.transport_places
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

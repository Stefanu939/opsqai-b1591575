-- 0048_transport_trips.sql
-- Self-Hosted only. Trip planner for OPSQAI Transport:
--   * a saved trip (departure, destination, stops, vehicle, driver, trailer)
--   * the computed driving/rest timeline (EU 561/2006) per trip
--   * the pre-departure checklist generated from real records
--   * route/weather caches so an offline installation keeps working
--   * WhatsApp dispatch state per trip
-- Vanilla PostgreSQL; access control stays in the application layer.

-- Truck routing needs the vehicle's dimensions; additive and nullable.
ALTER TABLE public.transport_vehicles
  ADD COLUMN IF NOT EXISTS gross_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS width_cm integer,
  ADD COLUMN IF NOT EXISTS length_cm integer,
  ADD COLUMN IF NOT EXISTS axle_count integer,
  ADD COLUMN IF NOT EXISTS adr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fuel_per_100km numeric;

ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS trip_speed_truck integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS trip_speed_car integer NOT NULL DEFAULT 95,
  ADD COLUMN IF NOT EXISTS trip_fuel_per_100km numeric NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS trip_break_split boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trip_external_lookups boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_channel text NOT NULL DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS whatsapp_from text,
  ADD COLUMN IF NOT EXISTS whatsapp_dispatcher text;

CREATE TABLE IF NOT EXISTS public.transport_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text,
  origin_label text NOT NULL,
  origin_lat double precision,
  origin_lng double precision,
  destination_label text NOT NULL,
  destination_lat double precision,
  destination_lng double precision,
  depart_at timestamptz NOT NULL,
  vehicle_id uuid,
  trailer_id uuid,
  driver_id uuid,
  vehicle_profile text NOT NULL DEFAULT 'truck',
  route_preference text NOT NULL DEFAULT 'fast',
  distance_km numeric,
  drive_minutes integer,
  total_minutes integer,
  toll_amount numeric,
  toll_currency text,
  arrival_at timestamptz,
  fuel_litres numeric,
  route_source text NOT NULL DEFAULT 'offline',
  route_geometry jsonb,
  already_driven_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'plan',
  notes text,
  whatsapp_channel text,
  whatsapp_to text,
  whatsapp_sent_at timestamptz,
  whatsapp_status text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_trips_company_idx
  ON public.transport_trips(company_id, depart_at DESC);
CREATE INDEX IF NOT EXISTS transport_trips_vehicle_idx
  ON public.transport_trips(vehicle_id, depart_at DESC);
CREATE INDEX IF NOT EXISTS transport_trips_driver_idx
  ON public.transport_trips(driver_id, depart_at DESC);

CREATE TABLE IF NOT EXISTS public.transport_trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 1,
  label text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_trip_stops_trip_idx
  ON public.transport_trip_stops(trip_id, position);

CREATE TABLE IF NOT EXISTS public.transport_trip_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 1,
  kind text NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  distance_km numeric,
  start_at timestamptz,
  end_at timestamptz,
  label text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_trip_legs_trip_idx
  ON public.transport_trip_legs(trip_id, position);

CREATE TABLE IF NOT EXISTS public.transport_trip_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  area text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  detail text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_trip_checks_trip_idx
  ON public.transport_trip_checks(trip_id, severity);

CREATE TABLE IF NOT EXISTS public.transport_route_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transport_route_cache_key_idx
  ON public.transport_route_cache(cache_key);

CREATE TABLE IF NOT EXISTS public.transport_weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transport_weather_cache_key_idx
  ON public.transport_weather_cache(cache_key);

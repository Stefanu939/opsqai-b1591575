-- 0034_transport_fleet_day.sql
-- Self-Hosted only. Adds the two registers the Transport Operations board needs:
--  * fuel entries (manually captured per company policy: litres, cost, route);
--  * driver duty days (who works today, who is off / on leave / sick).
-- Vanilla PostgreSQL; access control stays in the application layer.

CREATE TABLE IF NOT EXISTS public.transport_fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  entry_date date NOT NULL DEFAULT current_date,
  route text,
  litres numeric(12,2),
  cost numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',
  distance_km numeric(12,2),
  odometer_km integer,
  supplier text,
  reference text,
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_fuel_company_date_idx
  ON public.transport_fuel_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS transport_fuel_vehicle_idx
  ON public.transport_fuel_entries(vehicle_id);

CREATE TABLE IF NOT EXISTS public.transport_duty_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  driver_id uuid NOT NULL,
  duty_date date NOT NULL DEFAULT current_date,
  duty_kind text NOT NULL DEFAULT 'work',
  route text,
  vehicle_id uuid,
  shift_start time,
  shift_end time,
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_duty_days_unique UNIQUE (driver_id, duty_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_duty_days_kind_check'
  ) THEN
    ALTER TABLE public.transport_duty_days
      ADD CONSTRAINT transport_duty_days_kind_check
      CHECK (duty_kind IN ('work','off','leave','sick','training','standby'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS transport_duty_company_date_idx
  ON public.transport_duty_days(company_id, duty_date DESC);

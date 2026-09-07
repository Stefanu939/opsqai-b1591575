-- 0038_transport_trailers_couplings.sql
-- Self-Hosted only. Trailers become a first-class register and get their own
-- coupling board: one saved set = truck + trailer + driver for a given day.
-- Vanilla PostgreSQL; access control stays in the application layer.

CREATE TABLE IF NOT EXISTS public.transport_trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  plate text NOT NULL,
  kind text NOT NULL DEFAULT 'curtain',
  make text,
  model text,
  vin text,
  ownership text NOT NULL DEFAULT 'owned',
  payload_kg numeric(12,2),
  volume_m3 numeric(12,2),
  axles integer,
  base_location text,
  latitude double precision,
  longitude double precision,
  assigned_vehicle_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_trailers_status_check
    CHECK (status IN ('active','attention','blocked','inactive')),
  CONSTRAINT transport_trailers_ownership_check
    CHECK (ownership IN ('owned','leased','rented','subcontracted'))
);

CREATE INDEX IF NOT EXISTS transport_trailers_plate_idx
  ON public.transport_trailers(plate);
CREATE INDEX IF NOT EXISTS transport_trailers_status_idx
  ON public.transport_trailers(status, archived_at);

-- Trailer documents (inspection, insurance) reuse the document register.
DO $$
BEGIN
  ALTER TABLE public.transport_documents
    DROP CONSTRAINT IF EXISTS transport_documents_owner_kind_check;
  ALTER TABLE public.transport_documents
    ADD CONSTRAINT transport_documents_owner_kind_check
    CHECK (owner_kind IN ('vehicle','trailer','driver','carrier'));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.transport_notes
    DROP CONSTRAINT IF EXISTS transport_notes_owner_kind_check;
  ALTER TABLE public.transport_notes
    ADD CONSTRAINT transport_notes_owner_kind_check
    CHECK (owner_kind IN ('vehicle','trailer','driver','carrier','incident','request','check','cmr'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Couplings (truck + trailer + driver for one day) ─────────────────────
CREATE TABLE IF NOT EXISTS public.transport_couplings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  coupling_date date NOT NULL DEFAULT current_date,
  vehicle_id uuid,
  trailer_id uuid,
  driver_id uuid,
  route text,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_couplings_status_check
    CHECK (status IN ('planned','active','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS transport_couplings_company_date_idx
  ON public.transport_couplings(company_id, coupling_date DESC);
CREATE INDEX IF NOT EXISTS transport_couplings_trailer_idx
  ON public.transport_couplings(trailer_id);
CREATE INDEX IF NOT EXISTS transport_couplings_vehicle_idx
  ON public.transport_couplings(vehicle_id);

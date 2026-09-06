-- 0029_transport.sql
-- OPSQAI Transport product workspace (Self-Hosted only).
--
-- Registers (vehicles, drivers, carriers), documents with expiry tracking,
-- incidents and requests with an approval flow, notes, procedure links, an
-- editable weekly-audit checklist, per-user grants, map places/zones and
-- CMR consignment notes. Vanilla PostgreSQL only; access control is enforced
-- by the application layer (transport_grants + roles).

-- ── Settings (single row per installation/company) ────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_settings (
  company_id uuid PRIMARY KEY,
  country text NOT NULL DEFAULT 'generic',
  language text NOT NULL DEFAULT 'en',
  units text NOT NULL DEFAULT 'metric',
  alert_windows integer[] NOT NULL DEFAULT ARRAY[30, 60, 90],
  map_enabled boolean NOT NULL DEFAULT true,
  map_tile_url text,
  geocode_url text,
  allow_external_lookups boolean NOT NULL DEFAULT false,
  cmr_prefix text NOT NULL DEFAULT 'CMR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Per-user grants ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grant_key text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_grants_unique UNIQUE (user_id, grant_key),
  CONSTRAINT transport_grants_key_check CHECK (grant_key IN
    ('view','edit','approve','checklist','settings','export','cmr'))
);

CREATE INDEX IF NOT EXISTS transport_grants_user_idx
  ON public.transport_grants(user_id);

-- ── Vehicles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  plate text NOT NULL,
  kind text NOT NULL DEFAULT 'truck',
  make text,
  model text,
  vin text,
  ownership text NOT NULL DEFAULT 'owned',
  odometer_km integer,
  base_location text,
  latitude double precision,
  longitude double precision,
  zone_id uuid,
  assigned_driver_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_vehicles_status_check
    CHECK (status IN ('active','attention','blocked','inactive')),
  CONSTRAINT transport_vehicles_ownership_check
    CHECK (ownership IN ('owned','leased','rented','subcontracted'))
);

CREATE INDEX IF NOT EXISTS transport_vehicles_status_idx
  ON public.transport_vehicles(status, archived_at);
CREATE INDEX IF NOT EXISTS transport_vehicles_plate_idx
  ON public.transport_vehicles(plate);

-- ── Drivers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  full_name text NOT NULL,
  phone text,
  email text,
  licence_number text,
  licence_categories text,
  base_location text,
  latitude double precision,
  longitude double precision,
  zone_id uuid,
  assigned_vehicle_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_drivers_status_check
    CHECK (status IN ('active','attention','blocked','inactive'))
);

CREATE INDEX IF NOT EXISTS transport_drivers_status_idx
  ON public.transport_drivers(status, archived_at);

-- ── Carriers ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  registration_no text,
  vat_no text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  country text,
  latitude double precision,
  longitude double precision,
  zone_id uuid,
  requirements text,
  handling_rules text,
  rating integer,
  status text NOT NULL DEFAULT 'active',
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_carriers_status_check
    CHECK (status IN ('active','attention','blocked','inactive')),
  CONSTRAINT transport_carriers_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX IF NOT EXISTS transport_carriers_status_idx
  ON public.transport_carriers(status, archived_at);

-- ── Documents with expiry (vehicle / driver / carrier) ────────────────────
CREATE TABLE IF NOT EXISTS public.transport_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  owner_kind text NOT NULL,
  owner_id uuid NOT NULL,
  doc_type text NOT NULL,
  label text,
  reference text,
  issued_on date,
  expires_on date,
  file_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_documents_owner_kind_check
    CHECK (owner_kind IN ('vehicle','driver','carrier'))
);

CREATE INDEX IF NOT EXISTS transport_documents_owner_idx
  ON public.transport_documents(owner_kind, owner_id);
CREATE INDEX IF NOT EXISTS transport_documents_expiry_idx
  ON public.transport_documents(expires_on);

-- ── Incidents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  reference text,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'reported',
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  occurred_at timestamptz,
  vehicle_id uuid,
  driver_id uuid,
  carrier_id uuid,
  cmr_id uuid,
  action_agreed text,
  approved_by uuid,
  approved_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_incidents_severity_check
    CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT transport_incidents_status_check
    CHECK (status IN ('reported','in_review','action_agreed','closed','cancelled')),
  CONSTRAINT transport_incidents_category_check
    CHECK (category IN ('damage','delay','breakdown','dispute','safety','compliance','other'))
);

CREATE INDEX IF NOT EXISTS transport_incidents_status_idx
  ON public.transport_incidents(status, severity);
CREATE INDEX IF NOT EXISTS transport_incidents_occurred_idx
  ON public.transport_incidents(occurred_at DESC);

-- ── Requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  description text,
  owner_user_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  carrier_id uuid,
  incident_id uuid,
  cmr_id uuid,
  due_on date,
  decision_note text,
  approved_by uuid,
  approved_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_requests_kind_check
    CHECK (kind IN ('vehicle','repair','document','exception','driver','other')),
  CONSTRAINT transport_requests_priority_check
    CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT transport_requests_status_check
    CHECK (status IN ('open','in_review','approved','rejected','closed'))
);

CREATE INDEX IF NOT EXISTS transport_requests_status_idx
  ON public.transport_requests(status, priority);

-- ── Notes timeline (any transport record) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  owner_kind text NOT NULL,
  owner_id uuid NOT NULL,
  body text NOT NULL,
  author_user_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_notes_owner_kind_check
    CHECK (owner_kind IN ('vehicle','driver','carrier','incident','request','check','cmr'))
);

CREATE INDEX IF NOT EXISTS transport_notes_owner_idx
  ON public.transport_notes(owner_kind, owner_id, created_at DESC);

-- ── Procedure / knowledge links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  owner_kind text NOT NULL,
  owner_id uuid NOT NULL,
  target_kind text NOT NULL DEFAULT 'document',
  target_id uuid,
  title text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_links_owner_kind_check
    CHECK (owner_kind IN ('vehicle','driver','carrier','incident','request','category')),
  CONSTRAINT transport_links_target_kind_check
    CHECK (target_kind IN ('document','faq'))
);

CREATE INDEX IF NOT EXISTS transport_links_owner_idx
  ON public.transport_links(owner_kind, owner_id);

-- ── Weekly audit: editable checklist + runs + results ─────────────────────
CREATE TABLE IF NOT EXISTS public.transport_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  label text NOT NULL,
  hint text,
  scope text NOT NULL DEFAULT 'general',
  position integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_checklist_items_scope_check
    CHECK (scope IN ('general','vehicle','driver','carrier'))
);

CREATE INDEX IF NOT EXISTS transport_checklist_items_pos_idx
  ON public.transport_checklist_items(active, position);

CREATE TABLE IF NOT EXISTS public.transport_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  period_start date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  summary text,
  ran_by uuid,
  ran_by_name text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_checks_status_check
    CHECK (status IN ('in_progress','completed','cancelled'))
);

CREATE INDEX IF NOT EXISTS transport_checks_period_idx
  ON public.transport_checks(period_start DESC);

CREATE TABLE IF NOT EXISTS public.transport_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.transport_checks(id) ON DELETE CASCADE,
  item_id uuid,
  item_label text NOT NULL,
  subject_kind text,
  subject_id uuid,
  outcome text NOT NULL DEFAULT 'pending',
  note text,
  evidence_path text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_check_results_outcome_check
    CHECK (outcome IN ('pending','ok','issue','not_applicable'))
);

CREATE INDEX IF NOT EXISTS transport_check_results_check_idx
  ON public.transport_check_results(check_id);

-- ── Map: places cache + zones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  color text,
  description text,
  polygon jsonb,
  center_lat double precision,
  center_lng double precision,
  radius_km double precision,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transport_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  query text NOT NULL,
  label text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_places_query_unique UNIQUE (query),
  CONSTRAINT transport_places_source_check
    CHECK (source IN ('manual','geocode','import'))
);

-- ── CMR consignment notes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_cmr_series (
  company_id uuid PRIMARY KEY,
  prefix text NOT NULL DEFAULT 'CMR',
  next_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transport_cmr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  number text,
  country text NOT NULL DEFAULT 'generic',
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'draft',
  sender_name text,
  sender_address text,
  consignee_name text,
  consignee_address text,
  carrier_id uuid,
  carrier_name text,
  carrier_address text,
  successive_carrier text,
  vehicle_id uuid,
  vehicle_plate text,
  trailer_plate text,
  driver_id uuid,
  driver_name text,
  place_of_loading text,
  loading_on date,
  place_of_delivery text,
  delivery_on date,
  goods jsonb NOT NULL DEFAULT '[]'::jsonb,
  packages text,
  gross_weight_kg numeric,
  volume_m3 numeric,
  instructions text,
  payment_terms text,
  reservations text,
  documents_attached text,
  special_agreements text,
  established_at date,
  established_in text,
  signature_sender text,
  signature_carrier text,
  signature_consignee text,
  pdf_path text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_cmr_status_check
    CHECK (status IN ('draft','issued','cancelled'))
);

CREATE INDEX IF NOT EXISTS transport_cmr_status_idx
  ON public.transport_cmr(status, created_at DESC);
CREATE INDEX IF NOT EXISTS transport_cmr_number_idx
  ON public.transport_cmr(number);

-- ── updated_at triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transport_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transport_settings','transport_vehicles','transport_drivers',
    'transport_carriers','transport_documents','transport_incidents',
    'transport_requests','transport_checklist_items','transport_checks',
    'transport_zones','transport_cmr'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.transport_touch_updated_at()',
      t, t);
  END LOOP;
END $$;

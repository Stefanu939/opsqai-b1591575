-- Attach a CMR consignment note to a planned trip.
ALTER TABLE public.transport_trips
  ADD COLUMN IF NOT EXISTS cmr_id uuid REFERENCES public.transport_cmr(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transport_trips_cmr_idx ON public.transport_trips (cmr_id);

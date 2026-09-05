ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS presence_message text,
  ADD COLUMN IF NOT EXISTS presence_until timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_presence_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_presence_status_check
  CHECK (presence_status IN ('available','busy','away','dnd'));

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  decision_note text,
  calendar_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_off_requests_status_check CHECK (status IN ('pending','approved','rejected','cancelled')),
  CONSTRAINT time_off_requests_range_check CHECK (ends_on >= starts_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_off_requests TO authenticated;
GRANT ALL ON public.time_off_requests TO service_role;

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS time_off_requests_user_idx ON public.time_off_requests(user_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS time_off_requests_company_idx ON public.time_off_requests(company_id, status);

CREATE OR REPLACE FUNCTION public.can_manage_time_off(_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
      OR (
        _company IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','manager','superadmin','workspace_owner')
        )
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.company_id = _company
        )
      )
$$;

DROP POLICY IF EXISTS "time_off own read" ON public.time_off_requests;
CREATE POLICY "time_off own read" ON public.time_off_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_time_off(company_id));

DROP POLICY IF EXISTS "time_off own insert" ON public.time_off_requests;
CREATE POLICY "time_off own insert" ON public.time_off_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "time_off update" ON public.time_off_requests;
CREATE POLICY "time_off update" ON public.time_off_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_time_off(company_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_time_off(company_id));

DROP POLICY IF EXISTS "time_off delete own" ON public.time_off_requests;
CREATE POLICY "time_off delete own" ON public.time_off_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_time_off(company_id));

DROP TRIGGER IF EXISTS time_off_requests_touch ON public.time_off_requests;
CREATE TRIGGER time_off_requests_touch
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
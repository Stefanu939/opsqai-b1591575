
-- ============= portal_announcements =============
CREATE TABLE public.portal_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  body_md text NOT NULL DEFAULT '',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  pinned boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_announcements TO authenticated;
GRANT ALL ON public.portal_announcements TO service_role;
ALTER TABLE public.portal_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read published announcements"
  ON public.portal_announcements FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff insert announcements"
  ON public.portal_announcements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff update announcements"
  ON public.portal_announcements FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff delete announcements"
  ON public.portal_announcements FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE INDEX portal_announcements_status_pub_idx
  ON public.portal_announcements (status, pinned DESC, published_at DESC NULLS LAST);

-- ============= portal_download_modules =============
CREATE TABLE public.portal_download_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  version text,
  file_url text NOT NULL,
  file_size_bytes bigint,
  checksum text,
  icon_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_download_modules TO authenticated;
GRANT ALL ON public.portal_download_modules TO service_role;
ALTER TABLE public.portal_download_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read published modules"
  ON public.portal_download_modules FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff insert modules"
  ON public.portal_download_modules FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff update modules"
  ON public.portal_download_modules FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "platform staff delete modules"
  ON public.portal_download_modules FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE INDEX portal_download_modules_status_idx
  ON public.portal_download_modules (status, category, created_at DESC);

-- updated_at trigger (reuse existing function if present)
CREATE OR REPLACE FUNCTION public.tg_portal_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER portal_announcements_touch
  BEFORE UPDATE ON public.portal_announcements
  FOR EACH ROW EXECUTE FUNCTION public.tg_portal_touch_updated_at();

CREATE TRIGGER portal_download_modules_touch
  BEFORE UPDATE ON public.portal_download_modules
  FOR EACH ROW EXECUTE FUNCTION public.tg_portal_touch_updated_at();

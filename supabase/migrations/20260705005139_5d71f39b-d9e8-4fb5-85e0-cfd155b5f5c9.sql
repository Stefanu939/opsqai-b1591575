
-- Restrict internal-only company columns from tenant members.
-- RLS cannot filter columns, so use column-level GRANTs instead.
REVOKE SELECT (internal_notes, billing_override, suspension_reason)
  ON public.companies FROM authenticated;
REVOKE SELECT (internal_notes, billing_override, suspension_reason)
  ON public.companies FROM anon;
-- service_role keeps ALL privileges (used by supabaseAdmin for platform-admin UI).

-- Tighten subscription_events read access to platform admins only.
-- Company members previously saw internal reason/actor/metadata via se_company_read.
DROP POLICY IF EXISTS "se_company_read" ON public.subscription_events;
-- Platform-admin ALL policy (se_platform_all) already covers admin reads.
-- Server code that lists events uses the service_role client, so admin UI is unaffected.

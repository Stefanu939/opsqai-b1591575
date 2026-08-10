-- Portal release notes were invisible to customers: license_releases and
-- installer_releases only allowed platform staff to read, so the Customer
-- Portal "Release notes" and the in-app "Updates" screens returned nothing.
-- Signed-in users may now read published release metadata (no secrets stored
-- on these rows). Writes remain platform-staff only.

GRANT SELECT ON public.license_releases TO authenticated;
GRANT SELECT ON public.installer_releases TO authenticated;

DROP POLICY IF EXISTS "Authenticated users read published releases" ON public.license_releases;
CREATE POLICY "Authenticated users read published releases"
  ON public.license_releases FOR SELECT TO authenticated
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users read published installers" ON public.installer_releases;
CREATE POLICY "Authenticated users read published installers"
  ON public.installer_releases FOR SELECT TO authenticated
  USING (true);
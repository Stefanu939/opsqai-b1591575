ALTER TABLE public.license_releases
  ADD COLUMN IF NOT EXISTS package_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS notes_storage_path TEXT;

-- Storage policies for the 'releases' bucket
CREATE POLICY "Platform staff can upload release files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'releases'
    AND public.is_platform_admin()
  );

CREATE POLICY "Platform staff can update release files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'releases'
    AND public.is_platform_admin()
  )
  WITH CHECK (
    bucket_id = 'releases'
    AND public.is_platform_admin()
  );

CREATE POLICY "Platform staff can delete release files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'releases'
    AND public.is_platform_admin()
  );

CREATE POLICY "Authenticated users can read release files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'releases'
  );
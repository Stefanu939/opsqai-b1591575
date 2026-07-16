DROP POLICY IF EXISTS "avatars: authenticated can view" ON storage.objects;
CREATE POLICY "avatars: user can view own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
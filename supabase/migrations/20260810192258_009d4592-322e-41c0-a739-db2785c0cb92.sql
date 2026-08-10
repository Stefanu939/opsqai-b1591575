-- 1. Chat attachments: validate path structure before casting to uuid
DROP POLICY IF EXISTS chat_attach_read_members ON storage.objects;
DROP POLICY IF EXISTS chat_attach_write_members ON storage.objects;

CREATE POLICY chat_attach_read_members
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND array_length(storage.foldername(name), 1) >= 1
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.is_direct_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY chat_attach_write_members
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND array_length(storage.foldername(name), 1) >= 1
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.is_direct_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 2. Installation download logs: normalized email matching
DROP POLICY IF EXISTS "Portal customers read own downloads" ON public.installation_package_downloads;

CREATE POLICY "Portal customers read own downloads"
ON public.installation_package_downloads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.licenses l
    WHERE l.install_id = installation_package_downloads.install_id
      AND l.contact_email IS NOT NULL
      AND lower(btrim(l.contact_email)) = lower(btrim((
        SELECT u.email FROM auth.users u WHERE u.id = auth.uid()
      )::text))
  )
);

-- 3. role_permissions: allow authenticated users to read the role/permission catalogue
GRANT SELECT ON public.role_permissions TO authenticated;

DROP POLICY IF EXISTS "Authenticated read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated read role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

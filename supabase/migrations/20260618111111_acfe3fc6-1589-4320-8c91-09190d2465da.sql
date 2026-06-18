
-- Revoke execute on SECURITY DEFINER helper functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, double precision) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrictive policy: only admins may insert into user_roles (defense in depth)
DROP POLICY IF EXISTS "block non-admin role inserts" ON public.user_roles;
CREATE POLICY "block non-admin role inserts"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add admin-only UPDATE policy on knowledge-docs storage bucket
DROP POLICY IF EXISTS "admins update knowledge-docs" ON storage.objects;
CREATE POLICY "admins update knowledge-docs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'knowledge-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'knowledge-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));


-- 1) Move extensions out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure runtime search_path includes extensions so unqualified references keep working
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- Update SECURITY DEFINER functions that use pg_trgm / vector operators to include extensions in search_path
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.prolang <> (SELECT oid FROM pg_language WHERE lanname='c')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.sig);
    EXCEPTION WHEN OTHERS THEN
      -- keep going; some functions may not be alterable
      NULL;
    END;
  END LOOP;
END $$;

-- 2) Revoke EXECUTE from PUBLIC and anon on all app SECURITY DEFINER functions in public,
--    then re-grant to authenticated + service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.prolang <> (SELECT oid FROM pg_language WHERE lanname='c')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

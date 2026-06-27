
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='workspace_owner' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'workspace_owner';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='champion' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'champion';
  END IF;
END $$;

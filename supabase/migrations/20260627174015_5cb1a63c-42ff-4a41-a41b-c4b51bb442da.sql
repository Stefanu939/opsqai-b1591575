
ALTER TABLE public.customer_documents
  ADD COLUMN IF NOT EXISTS needs_update boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS input_hash text;

-- Trigger: when key profile fields change, mark all docs of that company as needing update
CREATE OR REPLACE FUNCTION public.customer_profile_mark_docs_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.general->>'legalName','')          IS DISTINCT FROM COALESCE(OLD.general->>'legalName','')
    OR COALESCE(NEW.general->>'address','')            IS DISTINCT FROM COALESCE(OLD.general->>'address','')
    OR COALESCE(NEW.general->>'registrationNumber','') IS DISTINCT FROM COALESCE(OLD.general->>'registrationNumber','')
    OR COALESCE(NEW.general->>'vatNumber','')          IS DISTINCT FROM COALESCE(OLD.general->>'vatNumber','')
    OR COALESCE(NEW.general->>'contactPerson','')      IS DISTINCT FROM COALESCE(OLD.general->>'contactPerson','')
    OR COALESCE(NEW.commercial->>'subscriptionPlan','') IS DISTINCT FROM COALESCE(OLD.commercial->>'subscriptionPlan','')
    THEN
      changed := true;
    END IF;
  END IF;
  IF changed THEN
    UPDATE public.customer_documents SET needs_update = true WHERE company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_profile_mark_docs_stale ON public.customer_profiles;
CREATE TRIGGER trg_customer_profile_mark_docs_stale
AFTER UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.customer_profile_mark_docs_stale();

-- Trigger: company name change also stales docs
CREATE OR REPLACE FUNCTION public.companies_mark_docs_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.name,'') IS DISTINCT FROM COALESCE(OLD.name,'') THEN
    UPDATE public.customer_documents SET needs_update = true WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_mark_docs_stale ON public.companies;
CREATE TRIGGER trg_companies_mark_docs_stale
AFTER UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.companies_mark_docs_stale();

REVOKE EXECUTE ON FUNCTION public.customer_profile_mark_docs_stale() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.companies_mark_docs_stale() FROM PUBLIC, anon, authenticated;

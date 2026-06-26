-- Public verification of academy certificates by certificate_code.
-- SECURITY DEFINER, returns ONLY whitelisted public fields. Treats NULL revoked as not revoked.
CREATE OR REPLACE FUNCTION public.academy_verify_certificate(_code uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'valid', COALESCE(c.revoked, false) = false,
    'issuedAt', c.issued_at,
    'score', c.final_score,
    'pathTitle', p.title,
    'company', co.name,
    'recipient', COALESCE(pr.full_name, ''),
    'certificateCode', c.certificate_code
  )
  FROM public.academy_certificates c
  JOIN public.academy_learning_paths p ON p.id = c.path_id
  JOIN public.companies co ON co.id = c.company_id
  LEFT JOIN public.profiles pr ON pr.id = c.user_id
  WHERE c.certificate_code = _code
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.academy_verify_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_verify_certificate(uuid) TO anon, authenticated;

-- Chat DM system: 1:1 conversations between same-company users + OPSQAI staff.

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE ON public.direct_conversations TO authenticated;
GRANT ALL ON public.direct_conversations TO service_role;
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.direct_conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dcm_user ON public.direct_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dcm_conv ON public.direct_conversation_members(conversation_id);

GRANT SELECT, INSERT, UPDATE ON public.direct_conversation_members TO authenticated;
GRANT ALL ON public.direct_conversation_members TO service_role;
ALTER TABLE public.direct_conversation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dm_conv_created ON public.direct_messages(conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of a given conversation?
CREATE OR REPLACE FUNCTION public.is_direct_conversation_member(_conv uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_conversation_members
    WHERE conversation_id = _conv AND user_id = _user
  )
$$;

-- Policies: direct_conversations
CREATE POLICY "dc_select_member" ON public.direct_conversations
  FOR SELECT TO authenticated
  USING (public.is_direct_conversation_member(id, auth.uid()));

CREATE POLICY "dc_update_member" ON public.direct_conversations
  FOR UPDATE TO authenticated
  USING (public.is_direct_conversation_member(id, auth.uid()))
  WITH CHECK (public.is_direct_conversation_member(id, auth.uid()));

-- Policies: members — user can see rows of conversations they belong to
CREATE POLICY "dcm_select_member" ON public.direct_conversation_members
  FOR SELECT TO authenticated
  USING (public.is_direct_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "dcm_update_self" ON public.direct_conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies: messages
CREATE POLICY "dm_select_member" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (public.is_direct_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "dm_insert_member" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_direct_conversation_member(conversation_id, auth.uid())
  );

CREATE POLICY "dm_update_own" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Bump last_message_at when a new message is inserted.
CREATE OR REPLACE FUNCTION public.direct_messages_touch_conv()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dm_touch_conv ON public.direct_messages;
CREATE TRIGGER trg_dm_touch_conv
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.direct_messages_touch_conv();

-- Find or create a 1:1 conversation between the caller and target user.
-- Enforces: target must be in the caller's company OR be OPSQAI staff.
CREATE OR REPLACE FUNCTION public.find_or_create_direct_conversation(_target uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _my_company uuid;
  _their_company uuid;
  _target_is_staff boolean;
  _me_is_staff boolean;
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _target = _me THEN RAISE EXCEPTION 'cannot_message_self'; END IF;

  SELECT company_id INTO _my_company FROM public.profiles WHERE id = _me;
  SELECT company_id INTO _their_company FROM public.profiles WHERE id = _target;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _target AND role IN ('platform_owner','platform_admin')) INTO _target_is_staff;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _me AND role IN ('platform_owner','platform_admin')) INTO _me_is_staff;

  IF NOT (
    _me_is_staff
    OR _target_is_staff
    OR (_my_company IS NOT NULL AND _my_company = _their_company)
  ) THEN
    RAISE EXCEPTION 'contact_not_allowed';
  END IF;

  -- Find existing 1:1
  SELECT a.conversation_id INTO _conv
  FROM public.direct_conversation_members a
  JOIN public.direct_conversation_members b
    ON b.conversation_id = a.conversation_id AND b.user_id = _target
  WHERE a.user_id = _me
  LIMIT 1;

  IF _conv IS NOT NULL THEN
    RETURN _conv;
  END IF;

  INSERT INTO public.direct_conversations(created_by) VALUES (_me) RETURNING id INTO _conv;
  INSERT INTO public.direct_conversation_members(conversation_id, user_id) VALUES (_conv, _me), (_conv, _target);
  RETURN _conv;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_create_direct_conversation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.find_or_create_direct_conversation(uuid) TO authenticated;

-- Contact search: colleagues + OPSQAI staff, filtered by name/email.
CREATE OR REPLACE FUNCTION public.search_chat_contacts(_q text, _limit int DEFAULT 15)
RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, is_staff boolean, is_colleague boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _my_company uuid;
  _pat text;
BEGIN
  IF _me IS NULL THEN RETURN; END IF;
  IF coalesce(length(trim(_q)), 0) < 2 THEN RETURN; END IF;
  _pat := '%' || trim(_q) || '%';
  SELECT company_id INTO _my_company FROM public.profiles WHERE id = _me;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(p.full_name, ''), NULLIF(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')), ''), '') AS full_name,
    p.email,
    p.avatar_url,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('platform_owner','platform_admin')) AS is_staff,
    (p.company_id IS NOT NULL AND p.company_id = _my_company) AS is_colleague
  FROM public.profiles p
  WHERE p.id <> _me
    AND COALESCE(p.is_active, true) = true
    AND (
      (p.company_id IS NOT NULL AND p.company_id = _my_company)
      OR EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('platform_owner','platform_admin'))
    )
    AND (
      p.full_name ILIKE _pat
      OR p.first_name ILIKE _pat
      OR p.last_name ILIKE _pat
      OR p.email ILIKE _pat
    )
  ORDER BY
    (p.company_id IS NOT NULL AND p.company_id = _my_company) DESC,
    COALESCE(p.full_name, p.email) ASC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_chat_contacts(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_chat_contacts(text, int) TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversation_members;

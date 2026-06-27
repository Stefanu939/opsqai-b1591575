
-- Support center: conversations + messages with RLS, realtime and notifications.

CREATE TYPE public.support_status AS ENUM ('open','pending','resolved','closed');
CREATE TYPE public.support_priority AS ENUM ('low','normal','high','critical');
CREATE TYPE public.support_sender_kind AS ENUM ('customer','platform');

CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status public.support_status NOT NULL DEFAULT 'open',
  priority public.support_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_customer int NOT NULL DEFAULT 0,
  unread_for_platform int NOT NULL DEFAULT 1,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_conversations_company_idx ON public.support_conversations(company_id, last_message_at DESC);
CREATE INDEX support_conversations_status_idx  ON public.support_conversations(status, priority, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Platform admins / owner: full access.
CREATE POLICY support_conv_platform_all ON public.support_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner'))
  WITH CHECK (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner'));

-- Customer-side select: same company AND one of the admin/manager-ish roles.
CREATE POLICY support_conv_company_select ON public.support_conversations
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_role(auth.uid(),'workspace_owner')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
    )
  );

CREATE POLICY support_conv_company_insert ON public.support_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND opened_by = auth.uid()
    AND (
      public.has_role(auth.uid(),'workspace_owner')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
    )
  );

CREATE POLICY support_conv_company_update_unread ON public.support_conversations
  FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_role(auth.uid(),'workspace_owner')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
    )
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_kind public.support_sender_kind NOT NULL,
  body text NOT NULL,
  internal_note boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_conv_idx ON public.support_messages(conversation_id, created_at);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_msg_platform_all ON public.support_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner'))
  WITH CHECK (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner'));

-- Customer select: only conversations in own company, no internal notes.
CREATE POLICY support_msg_company_select ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    internal_note = false
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id
        AND c.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (
          public.has_role(auth.uid(),'workspace_owner')
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'manager')
        )
    )
  );

CREATE POLICY support_msg_company_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_kind = 'customer'
    AND internal_note = false
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id
        AND c.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (
          public.has_role(auth.uid(),'workspace_owner')
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'manager')
        )
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public._support_touch_updated() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_support_conv_touch BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public._support_touch_updated();

-- On new message: bump conversation, audit, notify the other side.
CREATE OR REPLACE FUNCTION public._support_on_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.support_conversations WHERE id = NEW.conversation_id;

  UPDATE public.support_conversations
     SET last_message_at = NEW.created_at,
         updated_at = now(),
         unread_for_customer = CASE WHEN NEW.sender_kind = 'platform' AND NEW.internal_note = false
                                    THEN unread_for_customer + 1 ELSE unread_for_customer END,
         unread_for_platform = CASE WHEN NEW.sender_kind = 'customer'
                                    THEN unread_for_platform + 1 ELSE unread_for_platform END,
         status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
   WHERE id = NEW.conversation_id;

  INSERT INTO public.audit_log(actor_id, company_id, module, action, resource_id, severity, success, new_value)
  VALUES (NEW.sender_id, v_company, 'support',
          CASE WHEN NEW.internal_note THEN 'internal_note' ELSE 'reply' END,
          NEW.conversation_id::text, 'info', true,
          jsonb_build_object('sender_kind', NEW.sender_kind, 'has_attachments', jsonb_array_length(NEW.attachments) > 0));

  -- Notify the other side via existing notifications table.
  IF NEW.internal_note = false THEN
    IF NEW.sender_kind = 'customer' THEN
      -- notify all platform admins / owners
      INSERT INTO public.notifications(user_id, company_id, kind, title, body, link)
      SELECT ur.user_id, v_company, 'support_message',
             'New support message',
             left(NEW.body, 240),
             '/app/admin/support?c=' || NEW.conversation_id::text
        FROM public.user_roles ur
       WHERE ur.role IN ('platform_admin','platform_owner');
    ELSE
      -- notify company admins/managers/owners
      INSERT INTO public.notifications(user_id, company_id, kind, title, body, link)
      SELECT p.id, v_company, 'support_reply',
             'Support replied',
             left(NEW.body, 240),
             '/app?support=' || NEW.conversation_id::text
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
       WHERE p.company_id = v_company
         AND ur.role IN ('workspace_owner','admin','manager');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block message insert on notification/audit failures.
  RETURN NEW;
END $$;
CREATE TRIGGER trg_support_msg_after_insert AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public._support_on_message();

-- Audit on conversation create / status / assign / priority changes.
CREATE OR REPLACE FUNCTION public._support_audit_conv() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(actor_id, company_id, module, action, resource_id, severity, success, new_value)
    VALUES (NEW.opened_by, NEW.company_id, 'support', 'conversation_created', NEW.id::text, 'info', true,
            jsonb_build_object('subject', NEW.subject, 'priority', NEW.priority));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(actor_id, company_id, module, action, resource_id, severity, success, old_value, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'status_changed', NEW.id::text, 'info', true,
              jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.audit_log(actor_id, company_id, module, action, resource_id, severity, success, old_value, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'priority_changed', NEW.id::text,
              CASE WHEN NEW.priority = 'critical' THEN 'warning' ELSE 'info' END, true,
              jsonb_build_object('priority', OLD.priority), jsonb_build_object('priority', NEW.priority));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.audit_log(actor_id, company_id, module, action, resource_id, severity, success, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'assigned', NEW.id::text, 'info', true,
              jsonb_build_object('assigned_to', NEW.assigned_to));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
CREATE TRIGGER trg_support_conv_audit
  AFTER INSERT OR UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public._support_audit_conv();

-- Permissions: support.use (customer-side) + support.manage (platform).
INSERT INTO public.role_permissions(role, permission) VALUES
  ('platform_owner','support.use'), ('platform_owner','support.manage'),
  ('platform_admin','support.use'), ('platform_admin','support.manage'),
  ('workspace_owner','support.use'),
  ('admin','support.use'),
  ('manager','support.use')
ON CONFLICT DO NOTHING;

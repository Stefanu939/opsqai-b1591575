
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

  INSERT INTO public.audit_log(user_id, company_id, module, action, resource, severity, success, new_value)
  VALUES (NEW.sender_id, v_company, 'support',
          CASE WHEN NEW.internal_note THEN 'internal_note' ELSE 'reply' END,
          NEW.conversation_id::text, 'info', true,
          jsonb_build_object('sender_kind', NEW.sender_kind, 'has_attachments', jsonb_array_length(NEW.attachments) > 0));

  IF NEW.internal_note = false THEN
    IF NEW.sender_kind = 'customer' THEN
      INSERT INTO public.notifications(user_id, company_id, kind, title, body, link)
      SELECT ur.user_id, v_company, 'support_message',
             'New support message', left(NEW.body, 240),
             '/app/admin/support?c=' || NEW.conversation_id::text
        FROM public.user_roles ur
       WHERE ur.role IN ('platform_admin','platform_owner');
    ELSE
      INSERT INTO public.notifications(user_id, company_id, kind, title, body, link)
      SELECT p.id, v_company, 'support_reply',
             'Support replied', left(NEW.body, 240),
             '/app?support=' || NEW.conversation_id::text
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
       WHERE p.company_id = v_company
         AND ur.role IN ('workspace_owner','admin','manager');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public._support_on_message() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._support_audit_conv() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(user_id, company_id, module, action, resource, severity, success, new_value)
    VALUES (NEW.opened_by, NEW.company_id, 'support', 'conversation_created', NEW.id::text, 'info', true,
            jsonb_build_object('subject', NEW.subject, 'priority', NEW.priority));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(user_id, company_id, module, action, resource, severity, success, old_value, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'status_changed', NEW.id::text, 'info', true,
              jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.audit_log(user_id, company_id, module, action, resource, severity, success, old_value, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'priority_changed', NEW.id::text,
              CASE WHEN NEW.priority = 'critical' THEN 'warning' ELSE 'info' END, true,
              jsonb_build_object('priority', OLD.priority), jsonb_build_object('priority', NEW.priority));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.audit_log(user_id, company_id, module, action, resource, severity, success, new_value)
      VALUES (auth.uid(), NEW.company_id, 'support', 'assigned', NEW.id::text, 'info', true,
              jsonb_build_object('assigned_to', NEW.assigned_to));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public._support_audit_conv() FROM PUBLIC, anon, authenticated;

-- Workspace switch logger callable by clients via RPC.
CREATE OR REPLACE FUNCTION public.log_workspace_switch(p_previous uuid, p_next uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_platform boolean;
BEGIN
  v_is_platform := public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner');
  IF NOT v_is_platform THEN RETURN; END IF;
  INSERT INTO public.audit_log(user_id, company_id, module, action, severity, success, old_value, new_value)
  VALUES (auth.uid(), p_next, 'workspace', 'switch', 'info', true,
          jsonb_build_object('company_id', p_previous),
          jsonb_build_object('company_id', p_next));
END $$;
REVOKE EXECUTE ON FUNCTION public.log_workspace_switch(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_workspace_switch(uuid, uuid) TO authenticated;

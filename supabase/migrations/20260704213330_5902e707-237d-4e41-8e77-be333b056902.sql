
alter table public.companies
  add column if not exists trial_ends_at timestamptz,
  add column if not exists renewal_date timestamptz,
  add column if not exists grace_period_days integer not null default 14,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists internal_notes text,
  add column if not exists billing_override boolean not null default false,
  add column if not exists last_payment_at timestamptz,
  add column if not exists next_invoice_due_at timestamptz;

alter table public.companies
  drop constraint if exists companies_subscription_status_check;
alter table public.companies
  add constraint companies_subscription_status_check
  check (subscription_status in ('trial','active','grace_period','suspended','cancelled'));
alter table public.companies
  drop constraint if exists companies_grace_period_days_check;
alter table public.companies
  add constraint companies_grace_period_days_check
  check (grace_period_days between 0 and 90);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'system' check (actor_kind in ('system','platform_admin','company_admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.subscription_events to authenticated;
grant all on public.subscription_events to service_role;

alter table public.subscription_events enable row level security;

drop policy if exists "se_platform_all" on public.subscription_events;
create policy "se_platform_all" on public.subscription_events
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "se_company_read" on public.subscription_events;
create policy "se_company_read" on public.subscription_events
  for select to authenticated
  using (public.user_belongs_to_company(auth.uid(), company_id));

create index if not exists subscription_events_company_idx
  on public.subscription_events (company_id, created_at desc);

create or replace function public.is_workspace_suspended(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select subscription_status in ('suspended','cancelled') and not billing_override
     from public.companies where id = _company),
    false
  );
$$;

create or replace function public.has_workspace_write_access(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select subscription_status not in ('suspended','cancelled') or billing_override
     from public.companies where id = _company),
    true
  );
$$;

grant execute on function public.is_workspace_suspended(uuid) to authenticated;
grant execute on function public.has_workspace_write_access(uuid) to authenticated;

create or replace function public.enforce_workspace_write_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if public.is_platform_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then cid := old.company_id; else cid := new.company_id; end if;
  if cid is null then return coalesce(new, old); end if;
  if not public.has_workspace_write_access(cid) then
    raise exception 'WORKSPACE_SUSPENDED: Write access is disabled for this workspace. Please renew your subscription to continue.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

do $$
declare
  t text;
  gated_tables text[] := array[
    'messages','threads',
    'knowledge_documents','document_chunks',
    'customer_documents','customer_document_versions',
    'academy_lesson_progress','academy_quiz_attempts','academy_enrollments',
    'academy_certificates','academy_retraining_events',
    'workspace_sessions','workspace_messages','workspace_files','workspace_artifacts',
    'internal_requests','contact_submissions','faqs'
  ];
begin
  foreach t in array gated_tables loop
    execute format('drop trigger if exists trg_enforce_ws_write on public.%I;', t);
    execute format(
      'create trigger trg_enforce_ws_write before insert or update on public.%I
         for each row execute function public.enforce_workspace_write_access();',
      t
    );
  end loop;
end $$;

create or replace function public.subscription_apply_status(
  _company uuid, _to_status text, _reason text default null, _actor_kind text default 'system'
) returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  select subscription_status into cur from public.companies where id = _company;
  if cur is null then raise exception 'company % not found', _company; end if;

  update public.companies
    set subscription_status = _to_status,
        active = case when _to_status in ('suspended','cancelled') then false else true end,
        suspended_at = case
          when _to_status = 'suspended' then coalesce(suspended_at, now())
          when _to_status in ('active','trial') then null
          else suspended_at end,
        cancelled_at = case
          when _to_status = 'cancelled' then coalesce(cancelled_at, now())
          when _to_status in ('active','trial') then null
          else cancelled_at end,
        grace_period_ends_at = case
          when _to_status = 'grace_period' then coalesce(grace_period_ends_at, now() + (grace_period_days || ' days')::interval)
          when _to_status in ('active','trial','suspended','cancelled') then null
          else grace_period_ends_at end,
        updated_at = now()
    where id = _company;

  insert into public.subscription_events (company_id, event_type, from_status, to_status, reason, actor_id, actor_kind)
  values (_company, 'status_changed', cur, _to_status, _reason, auth.uid(), _actor_kind);
end $$;

grant execute on function public.subscription_apply_status(uuid, text, text, text) to authenticated;

create or replace function public.subscription_notify_admins(
  _company uuid, _kind text, _title text, _body text
) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.notifications (company_id, user_id, kind, title, body)
  select _company, p.id, _kind, _title, _body
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  where p.company_id = _company
    and r.role in ('admin','workspace_owner');
exception when others then null;
end $$;

grant execute on function public.subscription_notify_admins(uuid, text, text, text) to authenticated;

create or replace function public.subscription_lifecycle_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  trial_expired int := 0;
  invoice_overdue int := 0;
  reminder_sent int := 0;
  suspended_now int := 0;
  reactivated_now int := 0;
  renewal_warned int := 0;
begin
  for r in
    select id, name, grace_period_days from public.companies
    where subscription_status = 'trial' and trial_ends_at is not null and trial_ends_at < now() and not billing_override
  loop
    perform public.subscription_apply_status(r.id, 'grace_period', 'Trial expired', 'system');
    update public.companies set grace_period_ends_at = now() + (r.grace_period_days || ' days')::interval where id = r.id;
    perform public.subscription_notify_admins(r.id, 'billing_grace_started',
      'Trial ended — grace period started',
      format('Your trial has ended. You have %s days to add billing before your workspace is suspended.', r.grace_period_days));
    insert into public.subscription_events (company_id, event_type, from_status, to_status, reason, actor_kind)
      values (r.id, 'trial_expired', 'trial', 'grace_period', 'automatic', 'system');
    trial_expired := trial_expired + 1;
  end loop;

  for r in
    select id, name, grace_period_days from public.companies
    where subscription_status = 'active' and next_invoice_due_at is not null
      and next_invoice_due_at < now()
      and (last_payment_at is null or last_payment_at < next_invoice_due_at)
      and not billing_override
  loop
    perform public.subscription_apply_status(r.id, 'grace_period', 'Invoice overdue', 'system');
    update public.companies set grace_period_ends_at = now() + (r.grace_period_days || ' days')::interval where id = r.id;
    perform public.subscription_notify_admins(r.id, 'billing_invoice_overdue',
      'Invoice overdue — grace period started',
      format('An invoice is overdue. You have %s days to settle it before your workspace is suspended.', r.grace_period_days));
    insert into public.subscription_events (company_id, event_type, from_status, to_status, reason, actor_kind)
      values (r.id, 'invoice_overdue', 'active', 'grace_period', 'automatic', 'system');
    invoice_overdue := invoice_overdue + 1;
  end loop;

  for r in
    select id from public.companies
    where subscription_status = 'grace_period' and grace_period_ends_at is not null
      and grace_period_ends_at > now() and grace_period_ends_at < now() + interval '3 days'
  loop
    perform public.subscription_notify_admins(r.id, 'billing_grace_ending_soon',
      'Grace period ending soon',
      'Your workspace will be suspended shortly if billing is not resolved.');
    reminder_sent := reminder_sent + 1;
  end loop;

  for r in
    select id from public.companies
    where subscription_status = 'grace_period' and grace_period_ends_at is not null
      and grace_period_ends_at < now() and not billing_override
  loop
    perform public.subscription_apply_status(r.id, 'suspended', 'Grace period expired', 'system');
    perform public.subscription_notify_admins(r.id, 'workspace_suspended',
      'Workspace suspended',
      'Your workspace has been suspended because the grace period ended. Read-only access remains available.');
    suspended_now := suspended_now + 1;
  end loop;

  for r in
    select id from public.companies
    where subscription_status in ('suspended','grace_period')
      and last_payment_at is not null
      and last_payment_at > coalesce(next_invoice_due_at, '1970-01-01'::timestamptz) - interval '1 day'
  loop
    perform public.subscription_apply_status(r.id, 'active', 'Payment received', 'system');
    perform public.subscription_notify_admins(r.id, 'workspace_reactivated',
      'Workspace reactivated',
      'Your payment was received. Full write access has been restored.');
    reactivated_now := reactivated_now + 1;
  end loop;

  for r in
    select id from public.companies
    where subscription_status = 'active' and renewal_date is not null
      and renewal_date > now() and renewal_date < now() + interval '7 days'
  loop
    perform public.subscription_notify_admins(r.id, 'billing_renewal_upcoming',
      'Upcoming subscription renewal',
      'Your subscription will renew within the next 7 days.');
    renewal_warned := renewal_warned + 1;
  end loop;

  return jsonb_build_object(
    'trial_expired', trial_expired,
    'invoice_overdue', invoice_overdue,
    'grace_reminders', reminder_sent,
    'suspended', suspended_now,
    'reactivated', reactivated_now,
    'renewal_reminders', renewal_warned,
    'ran_at', now()
  );
end $$;

grant execute on function public.subscription_lifecycle_tick() to authenticated;

create or replace function public.get_subscription_state(_company uuid)
returns table (
  company_id uuid,
  name text,
  subscription_status text,
  subscription_plan text,
  trial_ends_at timestamptz,
  renewal_date timestamptz,
  grace_period_days int,
  grace_period_ends_at timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  suspension_reason text,
  billing_override boolean,
  last_payment_at timestamptz,
  next_invoice_due_at timestamptz,
  is_read_only boolean
) language sql stable security definer set search_path = public as $$
  select
    c.id, c.name, c.subscription_status, c.subscription_plan,
    c.trial_ends_at, c.renewal_date, c.grace_period_days, c.grace_period_ends_at,
    c.suspended_at, c.cancelled_at, c.suspension_reason, c.billing_override,
    c.last_payment_at, c.next_invoice_due_at,
    (c.subscription_status in ('suspended','cancelled') and not c.billing_override) as is_read_only
  from public.companies c
  where c.id = _company
    and (public.is_platform_admin() or public.user_belongs_to_company(auth.uid(), c.id));
$$;

grant execute on function public.get_subscription_state(uuid) to authenticated;

-- Local calendar (Self-Hosted).
--
-- The calendar was Cloud-only until now, so the Self-Hosted app failed with
-- "Cloud provider was reached inside a Self-Hosted build". These two tables
-- give the local install its own store:
--
--   calendar_events      — user-authored events (per owner)
--   calendar_feed_tokens — unguessable per-user ICS subscription tokens
--
-- Derived entries (license renewal, maintenance expiry) are computed at read
-- time from the local licensing provider and are never stored here.

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid,
    owner_user_id  uuid NOT NULL,
    title          text NOT NULL,
    description    text,
    kind           text NOT NULL DEFAULT 'meeting',
    location       text,
    starts_at      timestamptz NOT NULL,
    ends_at        timestamptz,
    all_day        boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_owner_starts_idx
    ON public.calendar_events (owner_user_id, starts_at);

CREATE TABLE IF NOT EXISTS public.calendar_feed_tokens (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token             text NOT NULL UNIQUE,
    user_id           uuid NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    revoked_at        timestamptz,
    last_accessed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS calendar_feed_tokens_user_idx
    ON public.calendar_feed_tokens (user_id)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE public.calendar_events IS
  'Local calendar events authored inside the Self-Hosted install.';
COMMENT ON TABLE public.calendar_feed_tokens IS
  'Private ICS subscription tokens (256-bit hex), rotatable from the calendar UI.';

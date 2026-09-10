CREATE TABLE public.social_scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL DEFAULT 'linkedin',
  variant TEXT,
  label TEXT,
  body TEXT NOT NULL,
  first_comment TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  published_urn TEXT,
  published_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_scheduled_posts_status_check CHECK (status IN ('scheduled','published','failed','paused','cancelled'))
);

CREATE INDEX social_scheduled_posts_due_idx ON public.social_scheduled_posts (status, scheduled_at);

GRANT ALL ON public.social_scheduled_posts TO service_role;
ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.social_cron_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.social_cron_tokens TO service_role;
ALTER TABLE public.social_cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.social_cron_tokens (token) VALUES (encode(gen_random_bytes(32), 'hex'));
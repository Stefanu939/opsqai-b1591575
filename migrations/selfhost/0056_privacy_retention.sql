-- GDPR: retention policy for AI chat history + anonymisation marker on users.
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id                   INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  chat_retention_days  INT CHECK (chat_retention_days IS NULL OR chat_retention_days BETWEEN 7 AND 3650),
  last_purge_at        TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.privacy_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

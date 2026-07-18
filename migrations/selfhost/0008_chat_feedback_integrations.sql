-- Wave C.2b.1 — chat threads, messages, message feedback, knowledge gaps,
-- and outbound-notification integration config for Self-Hosted.
--
-- No pgvector on Self-Hosted v1: knowledge-gap dedup falls back to exact
-- `question_normalized` match scoped to the tenant company. The embedding
-- column is kept as bytea so future upgrades can populate it without a
-- schema change.

BEGIN;

-- ------------------------------------------------------------------
-- threads
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New conversation',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS threads_user_updated_idx
  ON public.threads (user_id, updated_at DESC);

-- ------------------------------------------------------------------
-- messages (chat turns)
-- ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system', 'tool');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL,
  role         public.message_role NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  confidence   REAL,
  parts        JSONB,
  sources      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at);

-- ------------------------------------------------------------------
-- message_feedback (thumbs up / down)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL,
  rating      SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- ------------------------------------------------------------------
-- knowledge_gaps
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL,
  department_id         UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  question_normalized   TEXT NOT NULL,
  question_sample       TEXT NOT NULL,
  confidence            REAL,
  embedding             BYTEA,
  first_seen            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrences           INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'open',
  resolution            TEXT,
  resolution_date       TIMESTAMPTZ,
  resolved_document_id  UUID,
  resolved_faq_id       UUID,
  source_thread_id      UUID,
  source_message_id     UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS knowledge_gaps_company_status_idx
  ON public.knowledge_gaps (company_id, status);
CREATE INDEX IF NOT EXISTS knowledge_gaps_company_qn_idx
  ON public.knowledge_gaps (company_id, question_normalized);

-- ------------------------------------------------------------------
-- company_integrations (outbound webhooks: Slack, Teams, ...)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  provider      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'disconnected',
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at  TIMESTAMPTZ,
  connected_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, provider)
);

COMMIT;

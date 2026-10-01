ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS threads_user_pinned_idx
  ON public.threads (user_id, pinned DESC, updated_at DESC);
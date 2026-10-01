-- 0054 — Server-side pinned chat threads.
-- Pinned conversations move from localStorage to public.threads.pinned so
-- favorites follow the user across devices. Per-user ownership is unchanged.

BEGIN;

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS threads_user_pinned_idx
  ON public.threads (user_id, pinned DESC, updated_at DESC);

COMMIT;

-- OPSQAI update history — append-only audit trail for every update
-- attempt (pre-flight, snapshot, migrate, health, rollback outcome).
--
-- Rows are inserted by opsqai-windows/services/updater/apply.js as it
-- walks through the update state machine. Admin Console renders this
-- table for compliance auditing.

CREATE TABLE IF NOT EXISTS public.update_history (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    from_version TEXT NOT NULL,
    to_version TEXT NOT NULL,
    channel TEXT NOT NULL,
    -- The high-level state machine result.
    outcome TEXT NOT NULL
        CHECK (outcome IN ('running', 'success', 'rolled_back', 'failed_no_rollback')),
    -- Which step failed (if any). NULL on success.
    failed_step TEXT,
    -- Where the pre-swap snapshots live so an operator can restore by hand
    -- if the automatic rollback itself fails.
    snapshot_dir TEXT,
    rollback_dir TEXT,
    -- Free-form notes (release notes, error messages, health probe body).
    notes TEXT,
    -- Structured step log (JSON array). Bounded: only the last ~64 KiB
    -- is kept to prevent unbounded growth on pathological retries.
    step_log JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_update_history_started_at
    ON public.update_history (started_at DESC);
CREATE INDEX IF NOT EXISTS ix_update_history_outcome
    ON public.update_history (outcome);

GRANT SELECT ON public.update_history TO opsqai;
GRANT INSERT, UPDATE ON public.update_history TO opsqai;
GRANT USAGE, SELECT ON SEQUENCE public.update_history_id_seq TO opsqai;

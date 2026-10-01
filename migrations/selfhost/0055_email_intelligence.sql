-- Email Intelligence on Self-Hosted: reads the team inbox through Microsoft
-- Graph, classifies every message against the company Knowledge Base and
-- prepares grounded reply drafts. OPSQAI never sends email autonomously —
-- the employee reviews, edits and sends from their own mail client.
-- Everything stays in the installation's local database.

-- One shared team inbox per installation/company.
CREATE TABLE IF NOT EXISTS public.email_inbox_configs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL,
    label           text NOT NULL DEFAULT 'Shared inbox',
    mailbox         text NOT NULL,
    enabled         boolean NOT NULL DEFAULT true,
    poll_minutes    integer NOT NULL DEFAULT 30 CHECK (poll_minutes BETWEEN 5 AND 720),
    last_sync_at    timestamptz,
    last_status     text,
    last_error      text,
    last_counts     jsonb,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);

-- Every inbox message ever seen, kept on record even after the original
-- disappears from the mailbox, so history is auditable.
CREATE TABLE IF NOT EXISTS public.email_messages (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid NOT NULL,
    config_id         uuid REFERENCES public.email_inbox_configs(id) ON DELETE SET NULL,
    message_id        text NOT NULL,
    subject           text,
    from_name         text,
    from_email        text,
    received_at       timestamptz,
    preview           text,
    has_attachments   boolean NOT NULL DEFAULT false,
    attachment_names  text[] NOT NULL DEFAULT '{}',
    body_text         text,
    -- classification grounded in the Knowledge Base: request | complaint |
    -- order | invoice | internal | other (kept free-form fallback)
    classification    text,
    priority          text,
    summary           text,
    -- new | classified | handled | ignored
    status            text NOT NULL DEFAULT 'new',
    handled_by        uuid,
    handled_at        timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, message_id)
);

-- Draft replies proposed by OPSQAI. A draft is always human-reviewed: the
-- employee edits/approves it here, then sends it from their own mailbox.
CREATE TABLE IF NOT EXISTS public.email_drafts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL,
    message_id    uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    draft         text NOT NULL,
    -- citation metadata from the exact retrieved chunks — never model output
    sources       jsonb NOT NULL DEFAULT '[]',
    grounded      boolean NOT NULL DEFAULT true,
    -- draft | edited | approved | discarded
    status        text NOT NULL DEFAULT 'draft',
    edited_by     uuid,
    edited_at     timestamptz,
    approved_by   uuid,
    approved_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_messages_company_received_idx
    ON public.email_messages (company_id, received_at DESC);
CREATE INDEX IF NOT EXISTS email_drafts_message_idx
    ON public.email_drafts (message_id, created_at DESC);

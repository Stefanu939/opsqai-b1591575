-- Microsoft 365 on Self-Hosted: Entra ID sign-in and SharePoint folder sync.
-- Everything stays in the installation's local database.

-- Short-lived OIDC login state (state, PKCE verifier, nonce). One row per
-- sign-in attempt; consumed on callback.
CREATE TABLE IF NOT EXISTS public.sso_login_flows (
    state          text PRIMARY KEY,
    code_verifier  text NOT NULL,
    nonce          text NOT NULL,
    return_to      text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz NOT NULL
);

-- One-time handoff code: the callback never puts tokens in a URL. The browser
-- exchanges this code (hash stored) for a local session exactly once.
CREATE TABLE IF NOT EXISTS public.sso_login_handoffs (
    code_hash    text PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email        text NOT NULL,
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz
);

-- External identity binding (Entra object id → local user).
CREATE TABLE IF NOT EXISTS public.user_external_identities (
    provider     text NOT NULL,
    tenant_id    text NOT NULL,
    subject      text NOT NULL,
    user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    PRIMARY KEY (provider, tenant_id, subject)
);

-- SharePoint folders synchronised into the Knowledge Base.
CREATE TABLE IF NOT EXISTS public.sharepoint_sources (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL,
    label           text NOT NULL,
    site_url        text NOT NULL,
    folder_path     text NOT NULL DEFAULT '',
    site_id         text,
    drive_id        text,
    folder_item_id  text,
    category        text NOT NULL DEFAULT 'sharepoint',
    department_id   uuid,
    delta_link      text,
    enabled         boolean NOT NULL DEFAULT true,
    last_sync_at    timestamptz,
    last_status     text,
    last_error      text,
    last_counts     jsonb,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Source link on KB documents (citation "open source" button) and SharePoint
-- item binding for incremental updates.
ALTER TABLE public.knowledge_documents
    ADD COLUMN IF NOT EXISTS source_url text,
    ADD COLUMN IF NOT EXISTS external_source text,
    ADD COLUMN IF NOT EXISTS external_item_id text,
    ADD COLUMN IF NOT EXISTS external_etag text;

CREATE INDEX IF NOT EXISTS knowledge_documents_external_idx
    ON public.knowledge_documents (external_source, external_item_id)
    WHERE external_item_id IS NOT NULL;

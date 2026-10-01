// Email Intelligence sync engine (Self-Hosted only).
// Pulls new messages from the configured team inbox through Microsoft Graph,
// stores them in the local database and keeps the audit trail. Called by the
// server function ("Sync now") and by the background scheduler.

import { isMicrosoftConfigured, getMicrosoftConfig } from "@/lib/microsoft/entra.server";
import { listMailboxMessages } from "./mail.server";
import { mq } from "./db.server";

export interface SyncResult {
  ok: boolean;
  configId?: string;
  seen?: number;
  added?: number;
  error?: string;
}

/** Sync one inbox config by id. Failures are recorded on the config row. */
export async function syncEmailInbox(configId: string): Promise<SyncResult> {
  const rows = await mq<{
    id: string; company_id: string; mailbox: string; enabled: boolean;
  }>(
    `SELECT id, company_id, mailbox, enabled FROM public.email_inbox_configs WHERE id = $1`,
    [configId],
  );
  const cfg = rows[0];
  if (!cfg) return { ok: false, error: "Inbox configuration not found." };
  if (!cfg.enabled) return { ok: false, configId, error: "Inbox is disabled." };
  if (!isMicrosoftConfigured()) {
    return { ok: false, configId, error: "Microsoft 365 is not configured." };
  }

  try {
    const messages = await listMailboxMessages(cfg.mailbox, 40);
    let added = 0;
    for (const m of messages) {
      const res = await mq<{ id: string }>(
        `INSERT INTO public.email_messages
           (company_id, config_id, message_id, subject, from_name, from_email,
            received_at, preview, has_attachments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (company_id, message_id) DO NOTHING
         RETURNING id`,
        [
          cfg.company_id,
          cfg.id,
          m.id,
          m.subject?.slice(0, 500) ?? "(no subject)",
          m.from?.emailAddress?.name ?? null,
          m.from?.emailAddress?.address ?? null,
          m.receivedDateTime ? new Date(m.receivedDateTime) : null,
          (m.bodyPreview ?? "").slice(0, 500),
          m.hasAttachments,
        ],
      );
      if (res.length > 0) added += 1;
    }
    await mq(
      `UPDATE public.email_inbox_configs
          SET last_sync_at = now(), last_status = 'ok', last_error = NULL,
              last_counts = $2, updated_at = now()
        WHERE id = $1`,
      [configId, JSON.stringify({ seen: messages.length, added })],
    );
    await mq(
      `INSERT INTO public.audit_log (actor_id, action, target, detail)
       VALUES (NULL, 'email.sync', $1, $2)`,
      [`inbox:${cfg.mailbox}`, JSON.stringify({ severity: "info", success: true, seen: messages.length, added })],
    ).catch(() => undefined);
    return { ok: true, configId, seen: messages.length, added };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await mq(
      `UPDATE public.email_inbox_configs
          SET last_sync_at = now(), last_status = 'error', last_error = $2, updated_at = now()
        WHERE id = $1`,
      [configId, msg.slice(0, 500)],
    ).catch(() => undefined);
    return { ok: false, configId, error: msg };
  }
}

// ── Background schedule ────────────────────────────────────────────────────
// Ticks every minute; syncs each enabled inbox when its poll interval is due.
let timer: ReturnType<typeof setInterval> | null = null;
const due: string[] = [];
let ticking = false;

export function startEmailScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    void tick();
  }, 60_000);
  (timer as { unref?: () => void }).unref?.();
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    if (!isMicrosoftConfigured()) return;
    const rows = await mq<{ id: string; poll_minutes: number; last_sync_at: string | null }>(
      `SELECT id, poll_minutes, last_sync_at FROM public.email_inbox_configs WHERE enabled`,
    );
    for (const r of rows) {
      const last = r.last_sync_at ? new Date(r.last_sync_at).getTime() : 0;
      if (Date.now() - last >= r.poll_minutes * 60_000) {
        await syncEmailInbox(r.id).catch(() => undefined);
      }
    }
  } catch {
    /* table missing before migration, or DB unavailable — retry next tick */
  } finally {
    ticking = false;
  }
}

/** Company id used for the single-installation inbox (Self-Hosted = 1 company). */
export async function defaultCompanyId(): Promise<string | null> {
  const rows = await mq<{ id: string }>(
    `SELECT id FROM public.companies ORDER BY created_at LIMIT 1`,
  );
  return rows[0]?.id ?? null;
}

export { getMicrosoftConfig };

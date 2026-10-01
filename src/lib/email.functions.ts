// Email Intelligence — server functions (Self-Hosted only).
//
// Reads the configured team inbox through Microsoft Graph, classifies each
// message against the company Knowledge Base and prepares grounded reply
// drafts. The employee reviews, edits and sends from their own mail client —
// OPSQAI never sends email autonomously. Every step is audit-logged.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin, resolveCompanyForWrite } from "@/lib/authorization";
import { getKnowledgeRepository } from "@/lib/providers/registry";
import { generateAiText, resolveEmbedOne } from "@/lib/ai-provider.server";
import { detectLanguage } from "@/lib/chat-grounding";
import { isSelfHosted } from "@/lib/platform/mode";
import { syncEmailInbox, defaultCompanyId } from "@/lib/microsoft/email-sync.server";
import { getMailboxMessage, bodyToText, testMailboxAccess } from "@/lib/microsoft/mail.server";

const EMAIL_TEXT = z.string().max(100_000);

interface SourceRef {
  type: "document";
  document_id: string;
  chunk_id: string | null;
  title: string;
  code: string | null;
  section: string | null;
  page: number | null;
  page_end: number | null;
  similarity: number;
}

interface EmailListRow {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  preview: string | null;
  has_attachments: boolean;
  attachment_names: string[] | null;
  classification: string | null;
  priority: string | null;
  status: string;
  summary: string | null;
  draft_id: string | null;
  draft_status: string | null;
  draft_grounded: boolean | null;
}

interface EmailMessageRow {
  id: string;
  message_id: string | null;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  preview: string | null;
  has_attachments: boolean;
  attachment_names: string[] | null;
  body_text: string | null;
  classification: string | null;
  priority: string | null;
  summary: string | null;
  status: string;
}

interface EmailDraftRow {
  id: string;
  draft: string;
  sources: SourceRef[] | null;
  grounded: boolean | null;
  status: string;
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
}

/** Platform-admin + Self-Hosted gate, mirroring the Microsoft 365 module. */
async function guard(context: { supabase: unknown; userId: string }) {
  await requirePlatformAdmin(context);
  if (!isSelfHosted()) throw new Error("Email Intelligence is available on Self-Hosted only.");
}

async function requireCompanyId(context: { supabase: unknown; userId: string }) {
  const companyId = await resolveCompanyForWrite(context, null);
  if (!companyId) throw new Error("No company is configured for this installation.");
  return companyId;
}

async function audit(
  userId: string | null,
  action: string,
  target: string,
  detail: Record<string, unknown>,
) {
  try {
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `INSERT INTO public.audit_log (actor_id, action, target, detail)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, target, JSON.stringify({ severity: "info", success: true, ...detail })],
    );
  } catch {
    /* audit must never break the feature */
  }
}

/* ------------------------------ Settings ------------------------------ */

export const getEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    const cfg = (
      await mq<Record<string, unknown>>(
        `SELECT id, label, mailbox, enabled, poll_minutes,
                last_sync_at::text, last_status, last_error, last_counts
           FROM public.email_inbox_configs WHERE company_id = $1`,
        [companyId],
      )
    )[0];
    const counts = (
      await mq<{ new_count: string; total: string }>(
        `SELECT COUNT(*) FILTER (WHERE status IN ('new','classified')) AS new_count,
                COUNT(*) AS total
           FROM public.email_messages WHERE company_id = $1`,
        [companyId],
      )
    )[0];
    return {
      config: cfg
        ? {
            id: cfg.id as string,
            label: cfg.label as string,
            mailbox: cfg.mailbox as string,
            enabled: cfg.enabled as boolean,
            pollMinutes: cfg.poll_minutes as number,
            lastSyncAt: cfg.last_sync_at as string | null,
            lastStatus: cfg.last_status as string | null,
            lastError: cfg.last_error as string | null,
            lastCounts: cfg.last_counts as Record<string, number> | null,
          }
        : null,
      openCount: Number(counts?.new_count ?? 0),
      total: Number(counts?.total ?? 0),
    };
  });

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        label: z.string().trim().max(120).default("Shared inbox"),
        mailbox: z.string().trim().email("Enter a valid mailbox address."),
        enabled: z.boolean(),
        poll_minutes: z.number().int().min(5).max(720),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `INSERT INTO public.email_inbox_configs (company_id, label, mailbox, enabled, poll_minutes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id) DO UPDATE
         SET label = EXCLUDED.label, mailbox = EXCLUDED.mailbox,
             enabled = EXCLUDED.enabled, poll_minutes = EXCLUDED.poll_minutes,
             updated_at = now()`,
      [companyId, data.label, data.mailbox, data.enabled, data.poll_minutes, context.userId],
    );
    await audit(context.userId, "email.settings_saved", data.mailbox, { mailbox: data.mailbox, enabled: data.enabled });
    return { ok: true };
  });

export const testEmailInbox = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ mailbox: z.string().trim().min(3).max(320) }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    try {
      await testMailboxAccess(data.mailbox);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

export const syncEmailNow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    const cfg = (
      await mq<{ id: string }>(
        `SELECT id FROM public.email_inbox_configs WHERE company_id = $1`,
        [companyId],
      )
    )[0];
    if (!cfg) throw new Error("Configure the team inbox first.");
    const result = await syncEmailInbox(cfg.id);
    if (!result.ok) throw new Error(result.error ?? "Sync failed.");
    return { added: result.added ?? 0, seen: result.seen ?? 0 };
  });

/* ------------------------------- Inbox ------------------------------- */

export const listEmailMessages = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["open", "handled", "ignored", "all"]).default("open"),
        q: z.string().max(200).default(""),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    const where = data.status === "all" ? "" : data.status === "open" ? `AND m.status IN ('new','classified')` : `AND m.status = $2`;
    const params: unknown[] = [companyId, data.status];
    let search = "";
    if (data.q.trim()) {
      search = `AND (m.subject ILIKE $${params.length + 1} OR m.preview ILIKE $${params.length + 1} OR m.from_email ILIKE $${params.length + 1})`;
      params.push(`%${data.q.trim()}%`);
    }
    const rows = await mq<EmailListRow>(
      `SELECT m.id, m.subject, m.from_name, m.from_email,
              m.received_at::text AS received_at, m.preview, m.has_attachments,
              m.attachment_names, m.classification, m.priority, m.status,
              m.summary,
              (SELECT d.id FROM public.email_drafts d WHERE d.message_id = m.id
                 ORDER BY d.created_at DESC LIMIT 1) AS draft_id,
              (SELECT d.status FROM public.email_drafts d WHERE d.message_id = m.id
                 ORDER BY d.created_at DESC LIMIT 1) AS draft_status,
              (SELECT d.grounded FROM public.email_drafts d WHERE d.message_id = m.id
                 ORDER BY d.created_at DESC LIMIT 1) AS draft_grounded
         FROM public.email_messages m
        WHERE m.company_id = $1 ${where} ${search}
        ORDER BY COALESCE(m.received_at, m.created_at) DESC
        LIMIT ${data.limit}`,
      params,
    );
    return { messages: rows };
  });

export const getEmailMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    const rows = await mq<EmailMessageRow>(
      `SELECT m.id, m.message_id, m.subject, m.from_name, m.from_email,
              m.received_at::text AS received_at, m.preview, m.has_attachments,
              m.attachment_names, m.body_text, m.classification, m.priority,
              m.summary, m.status
         FROM public.email_messages m
        WHERE m.id = $1 AND m.company_id = $2`,
      [data.id, companyId],
    );
    const msg = rows[0];
    if (!msg) throw new Error("Message not found.");

    // Lazy body fetch: the list view keeps only previews; the full body is
    // pulled from Graph once, stored locally and never fetched again.
    if (!msg.body_text) {
      try {
        const cfg = (
          await mq<{ mailbox: string }>(
            `SELECT mailbox FROM public.email_inbox_configs WHERE company_id = $1`,
            [companyId],
          )
        )[0];
        if (cfg) {
          const full = await getMailboxMessage(cfg.mailbox, String(msg.message_id));
          const text = bodyToText(full);
          await mq(
            `UPDATE public.email_messages
                SET body_text = $2,
                    attachment_names = COALESCE(NULLIF($3, '{}'), attachment_names),
                    updated_at = now()
              WHERE id = $1`,
            [data.id, text, JSON.stringify((full.attachments ?? []).map((a) => a.name ?? ""))],
          );
          msg.body_text = text;
        }
      } catch (error) {
        console.error("[email:body-fetch]", error);
      }
    }

    const draftRows = await mq<EmailDraftRow>(
      `SELECT id, draft, sources, grounded, status, edited_by, edited_at::text,
              approved_by, approved_at::text, created_at::text
         FROM public.email_drafts
        WHERE message_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [data.id],
    );
    return { message: msg, draft: draftRows[0] ?? null };
  });

export const setEmailMessageStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "handled", "ignored"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `UPDATE public.email_messages
          SET status = $3,
              handled_by = CASE WHEN $3 IN ('handled','ignored') THEN $4 ELSE NULL END,
              handled_at = CASE WHEN $3 IN ('handled','ignored') THEN now() ELSE NULL END,
              updated_at = now()
        WHERE id = $1 AND company_id = $2`,
      [data.id, companyId, data.status, context.userId],
    );
    await audit(context.userId, "email.message_status", `message:${data.id}`, { status: data.status });
    return { ok: true };
  });

/* ------------------------------- Drafts ------------------------------- */

interface EmailAiOutput {
  category: "request" | "complaint" | "order" | "invoice" | "internal" | "other";
  priority: "low" | "normal" | "high" | "urgent";
  summary: string;
  reply: string;
  grounded: boolean;
}

export const generateEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");

    const rows = await mq<Pick<EmailMessageRow, "id" | "subject" | "from_name" | "from_email" | "body_text" | "preview" | "message_id">>(
      `SELECT m.id, m.message_id, m.subject, m.from_name, m.from_email, m.body_text, m.preview
         FROM public.email_messages m
        WHERE m.id = $1 AND m.company_id = $2`,
      [data.id, companyId],
    );
    const msg = rows[0];
    if (!msg) throw new Error("Message not found.");

    let body = String(msg.body_text ?? "");
    if (!body) {
      const cfg = (
        await mq<{ mailbox: string }>(
          `SELECT mailbox FROM public.email_inbox_configs WHERE company_id = $1`,
          [companyId],
        )
      )[0];
      if (cfg && msg.message_id) {
        const full = await getMailboxMessage(cfg.mailbox, String(msg.message_id));
        body = bodyToText(full);
        await mq(`UPDATE public.email_messages SET body_text = $2, updated_at = now() WHERE id = $1`, [data.id, body]);
      }
    }
    if (!body && !msg.preview) throw new Error("The message has no readable content yet. Sync again first.");

    const emailText = `${msg.subject ?? ""}\n\n${(body || String(msg.preview)).slice(0, 6000)}`;
    const language = detectLanguage(emailText);

    // Ground the classification and the draft in the company Knowledge Base,
    // exactly like AI Chat: only retrieved, approved documents may be used.
    const repo = getKnowledgeRepository(undefined);
    const matches = await repo.searchSimilar(companyId, await resolveEmbedOne(emailText), 8);
    const docs = matches.length
      ? await repo.getDocumentsByIds(Array.from(new Set(matches.map((m) => m.document_id))))
      : [];
    const meta = new Map(docs.map((d) => [d.id, d]));
    let chunkMeta = new Map<string, { id: string; section: string | null; page: number | null; page_end: number | null }>();
    try {
      const metaRows = await repo.getChunkMetadata(matches.map((m) => ({ document_id: m.document_id, chunk_index: m.chunk_index })));
      chunkMeta = new Map(metaRows.map((r) => [`${r.document_id}:${r.chunk_index}`, { id: r.id, section: r.section, page: r.page, page_end: r.page_end }]));
    } catch {
      /* chunk metadata optional */
    }
    const sources: SourceRef[] = matches
      .map((m) => {
        const doc = meta.get(m.document_id);
        const cm = chunkMeta.get(`${m.document_id}:${m.chunk_index}`);
        return {
          type: "document" as const,
          document_id: m.document_id,
          chunk_id: cm?.id ?? null,
          title: doc?.title ?? "Knowledge document",
          code: doc?.docCode ?? null,
          section: cm?.section ?? null,
          page: cm?.page ?? null,
          page_end: cm?.page_end ?? null,
          similarity: Number(m.similarity ?? 0),
        };
      });
    const confidence = matches.length
      ? matches.slice(0, 3).reduce((sum, m) => sum + Number(m.similarity ?? 0), 0) / Math.min(3, matches.length)
      : 0;
    const grounded = confidence >= 0.34;

    const contextBlock = sources
      .slice(0, 6)
      .map((s, i) => {
        const head = [`[Document ${i + 1}] ${s.code ? `${s.code} — ` : ""}${s.title}`];
        if (s.section) head.push(`Section: ${s.section}`);
        if (s.page != null) head.push(`Page: ${s.page_end ? `${s.page}-${s.page_end}` : s.page}`);
        return `${head.join(" | ")}\n${matches[i]?.content ?? ""}`;
      })
      .join("\n\n---\n\n");

    let out: EmailAiOutput;
    if (!grounded || !contextBlock) {
      out = {
        category: "other",
        priority: "normal",
        summary: "",
        reply:
          language === "ro"
            ? "Bună ziua,\n\nAm verificat procedurile interne și nu am găsit încă o bază documentată pentru răspunsul dumneavoastră. Acest mesaj a fost sesizat intern echipei responsabile, care vă va reveni cu un răspuns verificat.\n\nCu stimă,\nEchipa"
            : language === "de"
              ? "Guten Tag,\n\nich habe die internen Verfahren geprüft und keine dokumentierte Grundlage für eine Antwort auf Ihre Anfrage gefunden. Diese Anfrage wurde intern an das zuständige Team weitergeleitet, das Ihnen eine geprüfte Antwort zukommen lässt.\n\nMit freundlichen Grüßen\nDas Team"
              : "Hello,\n\nI reviewed the internal procedures and could not find a documented basis for answering your request. This request has been flagged internally to the responsible team, who will follow up with a verified answer.\n\nKind regards,\nThe team",
        grounded: false,
      };
    } else {
      const prompt = `Classify this incoming email and draft a professional reply in ${language}.

CLASSIFY: category = one of request|complaint|order|invoice|internal|other; priority = one of low|normal|high|urgent; summary = one sentence (max 200 chars).

REPLY RULES:
- Write ONLY from the COMPANY KNOWLEDGE below. Never invent facts, numbers, names, deadlines or prices.
- If the evidence answers the request, draft a courteous reply with the concrete answer and cite like (Source: SOP code — Title) only for facts you used.
- If the evidence does not fully answer, say politely that the request is being reviewed by the responsible team and what is missing. Never speculate.
- Keep it under 250 words. Professional tone. Match the email's language.

COMPANY KNOWLEDGE:
${contextBlock}

EMAIL:
${emailText}

Return only valid JSON: {"category":"...","priority":"...","summary":"...","reply":"...","grounded":true}`;
      const text = await generateAiText({ role: "chat", system: "You are OPSQAI's email assistant. Output only valid JSON, no markdown fences.", prompt });
      let parsed: Partial<EmailAiOutput> | null = null;
      try {
        const raw = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        parsed = start >= 0 && end > start ? (JSON.parse(raw.slice(start, end + 1)) as Partial<EmailAiOutput>) : null;
      } catch {
        parsed = null;
      }
      if (!parsed || !parsed.reply) throw new Error("The AI could not produce a draft. Try again.");
      out = {
        category: (["request", "complaint", "order", "invoice", "internal", "other"] as const).includes(parsed.category as EmailAiOutput["category"]) ? parsed.category! : "other",
        priority: (["low", "normal", "high", "urgent"] as const).includes(parsed.priority as EmailAiOutput["priority"]) ? parsed.priority! : "normal",
        summary: String(parsed.summary ?? "").slice(0, 300),
        reply: String(parsed.reply),
        grounded: parsed.grounded !== false,
      };
    }

    await mq(
      `INSERT INTO public.email_drafts (company_id, message_id, draft, sources, grounded, status)
       VALUES ($1,$2,$3,$4,$5,'draft')`,
      [companyId, data.id, out.reply, JSON.stringify(sources), out.grounded],
    );
    await mq(
      `UPDATE public.email_messages
          SET classification = $2, priority = $3, summary = $4,
              status = 'classified', updated_at = now()
        WHERE id = $1`,
      [data.id, out.category, out.priority, out.summary],
    );
    await audit(context.userId, "email.draft_generated", `message:${data.id}`, {
      grounded: out.grounded,
      category: out.category,
      priority: out.priority,
      sources: sources.length,
    });
    return {
      grounded: out.grounded,
      category: out.category,
      priority: out.priority,
      summary: out.summary,
      sources: sources.length,
    };
  });

export const updateEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), draft: EMAIL_TEXT }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `UPDATE public.email_drafts
          SET draft = $2, status = 'edited', edited_by = $3, edited_at = now(), updated_at = now()
        WHERE id = $1 AND company_id = $4`,
      [data.id, data.draft, context.userId, companyId],
    );
    await audit(context.userId, "email.draft_edited", `draft:${data.id}`, {});
    return { ok: true };
  });

export const approveEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `UPDATE public.email_drafts
          SET status = 'approved', approved_by = $3, approved_at = now(), updated_at = now()
        WHERE id = $1 AND company_id = $2`,
      [data.id, companyId, context.userId],
    );
    // The draft is approved for the employee to send from their own mailbox —
    // OPSQAI itself never connects an SMTP/send path.
    await audit(context.userId, "email.draft_approved", `draft:${data.id}`, {});
    return { ok: true };
  });

export const discardEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const companyId = await requireCompanyId(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `UPDATE public.email_drafts SET status = 'discarded', updated_at = now()
        WHERE id = $1 AND company_id = $2`,
      [data.id, companyId],
    );
    await audit(context.userId, "email.draft_discarded", `draft:${data.id}`, {});
    return { ok: true };
  });

/** Convenience for other modules (Teams bot) — the one company of this install. */
export { defaultCompanyId };

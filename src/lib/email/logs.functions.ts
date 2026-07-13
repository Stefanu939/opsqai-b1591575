import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authorization";

const QuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  template: z.string().nullable().optional(),
  status: z
    .enum(["sent", "failed", "dlq", "suppressed", "pending", "bounced", "complained"])
    .nullable()
    .optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

interface LogRow {
  message_id: string;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

/**
 * Returns deduplicated email send log entries (latest status per message_id).
 * Platform admin only — reads via service role to bypass row-level visibility.
 */
export const listEmailLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuerySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pull a generous slice, dedupe by message_id in code (Supabase has no DISTINCT ON).
    const { data: raw, error } = await supabaseAdmin
      .from("email_send_log")
      .select("message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", data.start)
      .lte("created_at", data.end)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const byMessageId = new Map<string, LogRow>();
    for (const r of (raw ?? []) as LogRow[]) {
      if (!r.message_id) continue;
      if (!byMessageId.has(r.message_id)) byMessageId.set(r.message_id, r);
    }

    let dedup = Array.from(byMessageId.values());
    if (data.template) dedup = dedup.filter((r) => r.template_name === data.template);
    if (data.status) dedup = dedup.filter((r) => r.status === data.status);

    const stats = {
      total: dedup.length,
      sent: dedup.filter((r) => r.status === "sent").length,
      failed: dedup.filter(
        (r) => r.status === "dlq" || r.status === "failed" || r.status === "bounced",
      ).length,
      suppressed: dedup.filter((r) => r.status === "suppressed").length,
      pending: dedup.filter((r) => r.status === "pending").length,
    };

    const page = dedup.slice(data.offset, data.offset + data.limit);

    const { data: distinctTemplates } = await supabaseAdmin
      .from("email_send_log")
      .select("template_name")
      .not("template_name", "is", null)
      .order("template_name")
      .limit(500);
    const templates = Array.from(
      new Set(
        ((distinctTemplates ?? []) as Array<{ template_name: string | null }>)
          .map((r) => r.template_name)
          .filter(Boolean) as string[],
      ),
    );

    return { rows: page, stats, total: dedup.length, templates };
  });

export const listSuppressedEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("suppressed_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

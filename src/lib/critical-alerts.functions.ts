/**
 * Critical alert email flush.
 *
 * In-app notifications are the primary channel. Anything marked `critical`
 * also gets one email to its own recipient. This runs per signed-in user for
 * their own rows only, and stamps `emailed_at` so an alert is never mailed
 * twice — no cron secret and no privileged fan-out required.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { categoryLabel } from "@/lib/activity-center";

const MAX_PER_RUN = 5;

export const flushMyCriticalAlertEmails = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) return { sent: 0 };

    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, category, created_at")
      .eq("user_id", context.userId)
      .eq("severity", "critical")
      .is("emailed_at", null)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(MAX_PER_RUN);
    if (error || !data?.length) return { sent: 0 };

    const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
    let sent = 0;
    for (const row of data as {
      id: string;
      title: string;
      body: string | null;
      category: string;
      created_at: string;
    }[]) {
      // Stamp first: a provider retry must never re-send the same alert.
      const { error: stampError } = await context.supabase
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() } as never)
        .eq("id", row.id)
        .is("emailed_at", null);
      if (stampError) continue;
      try {
        await dispatchTransactionalEmail({
          templateName: "critical-alert",
          recipientEmail: email,
          templateData: {
            alertTitle: row.title,
            alertBody: row.body ?? "An operational alert needs your attention.",
            area: categoryLabel(row.category),
            when: new Date(row.created_at).toUTCString(),
          },
        });
        sent += 1;
      } catch (e) {
        console.error("[critical-alerts] email failed", e instanceof Error ? e.message : e);
      }
    }
    return { sent };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

const SettingsSchema = z.object({
  sender_name: z.string().min(1).max(100),
  sender_email: z.string().email(),
  reply_to_email: z.string().email(),
  support_email: z.string().email(),
  contact_email: z.string().email(),
  security_email: z.string().email(),
  privacy_email: z.string().email(),
  website_url: z.string().url(),
  company_name: z.string().min(1).max(100),
  footer_text: z.string().min(1).max(280),
  logo_url: z.string().url(),
  provider: z
    .enum(["lovable", "smtp", "resend", "sendgrid", "mailgun", "postmark"])
    .default("lovable"),
});

export const getEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("platform_email_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { error } = await context.supabase
      .from("platform_email_settings")
      .update({ ...data, updated_by: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { dispatchTransactionalEmail } = await import("./dispatch.server");
    const { messageId } = await dispatchTransactionalEmail({
      templateName: "test-email",
      recipientEmail: data.to,
      templateData: {
        triggeredBy: context.claims.email ?? context.userId,
        triggeredAt: new Date().toLocaleString(),
        provider: "Lovable Emails",
      },
    });
    return { ok: true, messageId };
  });

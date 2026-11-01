import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  CONTACT_SUBJECT_LABELS,
  DEFAULT_MAILBOXES,
  routeContactSubject,
  type ContactSubject,
} from "@/lib/email/routing";
import { dispatchTransactionalEmail } from "@/lib/email/dispatch.server";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  subject: z.enum([
    "general",
    "demo",
    "pilot",
    "sales",
    "pricing",
    "support",
    "bug",
    "security",
    "privacy",
    "partnership",
    "other",
  ]),
  message: z.string().trim().min(10).max(8000),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  kind: z.enum(["contact", "diagnostic"]).optional(),
  // Honeypot — bots fill this; humans don't see it.
  website: z.string().max(0).optional().or(z.literal("")),
});

async function ipHash(req: Request): Promise<string | null> {
  const raw =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  if (!raw) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mailboxesFromSettings(s: any | null) {
  if (!s) return DEFAULT_MAILBOXES;
  return {
    contact: s.contact_email ?? DEFAULT_MAILBOXES.contact,
    support: s.support_email ?? DEFAULT_MAILBOXES.support,
    security: s.security_email ?? DEFAULT_MAILBOXES.security,
    privacy: s.privacy_email ?? DEFAULT_MAILBOXES.privacy,
  };
}

async function runInBackground(p: Promise<unknown>) {
  try {
    const spec = "cloudflare:workers";
    const mod: any = await import(/* @vite-ignore */ spec);
    if (typeof mod.waitUntil === "function") {
      mod.waitUntil(p);
      return;
    }
  } catch {
    // Not on Workers (dev server): the promise keeps running in Node.
  }
}

export const Route = createFileRoute("/api/public/contact-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sb;
        try {
          const mod = await import("@/lib/providers/cloud/service-role.server");
          sb = mod.createServiceRoleClient();
        } catch {
          return Response.json(
            { error: "Email service is temporarily unavailable. Please try again shortly." },
            { status: 503 },
          );
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch {
          return Response.json(
            { error: "Please review your details and try again." },
            { status: 400 },
          );
        }
        if ((parsed.website ?? "").length > 0) {
          // Silent honeypot success
          return Response.json({ ok: true, referenceId: "REQ-IGNORED" });
        }

        const { data: settings } = await sb
          .from("platform_email_settings")
          .select("*")
          .eq("id", true)
          .maybeSingle();
        const mailboxes = mailboxesFromSettings(settings);
        const subject = parsed.subject as ContactSubject;
        const routedTo = routeContactSubject(subject, mailboxes);
        const isDiagnostic = parsed.kind === "diagnostic";
        const storedMessage = isDiagnostic
          ? `[DIAGNOSTIC] Cerere diagnostic operațional\nFuncție: ${parsed.role || "-"}\n\n${parsed.message}`
          : parsed.message;

        const { data: row, error: insertErr } = await sb
          .from("contact_submissions")
          .insert({
            name: parsed.name,
            email: parsed.email,
            company: parsed.company || null,
            phone: parsed.phone || null,
            country: parsed.country || null,
            subject,
            message: storedMessage,
            routed_to: routedTo,
            user_agent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
            ip_hash: await ipHash(request),
          })
          .select("id, reference_code, created_at")
          .single();

        if (insertErr || !row) {
          console.error("[contact-submit] insert failed", insertErr?.message);
          return Response.json(
            { error: "We couldn't record your request. Please try again." },
            { status: 500 },
          );
        }

        // Internal routing notification — sent to the correct mailbox.
        // Uses the contact-confirmation layout for visual consistency.
        const subjectLabel = CONTACT_SUBJECT_LABELS[subject];
        const internalMessage =
          `New ${subjectLabel} inquiry from ${parsed.name} <${parsed.email}>` +
          (parsed.company ? ` · ${parsed.company}` : "") +
          (parsed.country ? ` · ${parsed.country}` : "") +
          (parsed.phone ? ` · ${parsed.phone}` : "") +
          `\n\n${storedMessage}`;

        try {
          // Internal mailbox copy (reply-to set to the inquirer for direct reply).
          await dispatchTransactionalEmail({
            templateName: "contact-confirmation",
            recipientEmail: routedTo,
            replyTo: parsed.email,
            templateData: {
              firstName: parsed.name.split(/\s+/)[0] ?? parsed.name,
              referenceId: row.reference_code,
              subjectLabel: `${subjectLabel} — internal copy\n\n${internalMessage}`,
              submittedAt: new Date(row.created_at as string).toLocaleString(),
              expectedResponse: "Routed automatically by OPSQAI Email Service",
            },
          });
        } catch (e) {
          console.error("[contact-submit] routed copy failed", (e as Error).message);
        }

        try {
          // Auto-acknowledgement to the inquirer.
          await dispatchTransactionalEmail({
            templateName: "contact-confirmation",
            recipientEmail: parsed.email,
            templateData: {
              firstName: parsed.name.split(/\s+/)[0] ?? parsed.name,
              referenceId: row.reference_code,
              subjectLabel,
              submittedAt: new Date(row.created_at as string).toLocaleString(),
              expectedResponse: "Within 1 business day (CET)",
            },
          });
        } catch (e) {
          console.error("[contact-submit] confirmation failed", (e as Error).message);
        }

        if (isDiagnostic) {
          // Pre-generate the AI diagnostic so staff find it ready on the lead;
          // send it automatically only when Strato auto-send is switched on.
          // Lead lookup + notes update are fast and done before replying, so the
          // panel always shows the latest request (also for returning leads).
          // The slow AI/SMTP work runs after the response via waitUntil.
          try {
            const { data: lead } = await sb
              .from("crm_leads")
              .select("id, company_name, contact_name")
              .ilike("email", parsed.email)
              .limit(1)
              .maybeSingle();
            if (lead) {
              await sb.from("crm_leads").update({ notes: storedMessage }).eq("id", lead.id);
              await sb.from("crm_leads").update({ source: "diagnostic_request" }).eq("id", lead.id).eq("source", "contact_form");
              const work = (async () => {
              const d = await import("@/lib/diagnostic.server");
              const text = await d.generateDiagnosticText({
                company: (lead.company_name as string) || parsed.company || parsed.name,
                contact: parsed.name,
                role: parsed.role || null,
                message: parsed.message,
              });
              await sb.from("crm_activities").insert({ lead_id: lead.id, kind: "note", subject: d.DIAGNOSTIC_SUBJECT, body: text });
              if (d.stratoAutoSend()) {
                const company = (lead.company_name as string) || parsed.company || parsed.name;
                await d.sendStratoMail({
                  to: parsed.email,
                  subject: `Diagnostic operațional OPSQAI — ${company}`,
                  text: d.diagnosticEmailBody(parsed.name, text, process.env.STRATO_FROM_NAME || "Echipa OPSQAI"),
                  attachment: { filename: d.pdfFilename(company), bytes: d.diagnosticPdf(company, parsed.name, text) },
                });
                await sb.from("crm_activities").insert({ lead_id: lead.id, kind: "email", subject: "Diagnostic trimis automat", body: `Strato → ${parsed.email}`, done_at: new Date().toISOString() });
              }
              })().catch((e) => console.error("[contact-submit] diagnostic bg failed", (e as Error).message));
              await runInBackground(work);
            }
          } catch (e) {
            console.error("[contact-submit] diagnostic failed", (e as Error).message);
          }
        }

        return Response.json({ ok: true, referenceId: row.reference_code });
      },
    },
  },
});

// OPSQAI Transport — morning briefing (server only, Self-Hosted).
//
// The critical lane of the overview, delivered once per day by email (through
// the installation's own SMTP settings) and optionally posted to a Teams or
// generic webhook. Everything is best-effort: a briefing must never break the
// workspace.

export interface DigestLine {
  label: string;
  count: number;
  hint?: string | null;
}

export interface DigestInput {
  companyId: string;
  title: string;
  now: DigestLine[];
  plan: DigestLine[];
  emails: string | null;
  webhookUrl: string | null;
  appLink?: string;
}

export interface DigestResult {
  sent: boolean;
  emailed: number;
  posted: boolean;
  reason?: string;
}

function esc(value: string): string {
  return value.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function lines(items: DigestLine[]): string {
  return items
    .map(
      (i) =>
        `<li><strong>${esc(i.label)}: ${i.count}</strong>${
          i.hint ? ` <span style="color:#64748b">— ${esc(i.hint)}</span>` : ""
        }</li>`,
    )
    .join("");
}

function plain(items: DigestLine[]): string {
  return items.map((i) => `- ${i.label}: ${i.count}${i.hint ? ` (${i.hint})` : ""}`).join("\n");
}

export async function sendTransportDigest(input: DigestInput): Promise<DigestResult> {
  if (input.now.length === 0 && input.plan.length === 0) {
    return { sent: false, emailed: 0, posted: false, reason: "nothing" };
  }

  const recipients = (input.emails ?? "")
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => x.includes("@"));

  const subject = `${input.title} — ${input.now.reduce((s, i) => s + i.count, 0)} critical`;
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0f172a">
    <h2 style="margin:0 0 8px">${esc(input.title)}</h2>
    <h3 style="margin:16px 0 4px;color:#b91c1c">Act now</h3>
    <ul>${lines(input.now) || "<li>Nothing critical.</li>"}</ul>
    <h3 style="margin:16px 0 4px;color:#b45309">Plan this week</h3>
    <ul>${lines(input.plan) || "<li>Nothing to plan.</li>"}</ul>
    ${input.appLink ? `<p style="margin-top:16px"><a href="${esc(input.appLink)}">Open the Transport overview</a></p>` : ""}
  </div>`;
  const text = `${input.title}\n\nAct now:\n${plain(input.now) || "-"}\n\nPlan this week:\n${
    plain(input.plan) || "-"
  }`;

  let emailed = 0;
  if (recipients.length) {
    try {
      const { getNotificationProvider } = await import("@/lib/providers/registry");
      await getNotificationProvider().sendEmail({
        to: recipients.join(", "),
        subject,
        html,
        text,
      });
      emailed = recipients.length;
    } catch {
      emailed = 0;
    }
  }

  let posted = false;
  if (input.webhookUrl) {
    try {
      const res = await fetch(input.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: subject, text }),
      });
      posted = res.ok;
    } catch {
      posted = false;
    }
  }

  return { sent: emailed > 0 || posted, emailed, posted };
}

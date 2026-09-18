// External verification of one generated HR document.
//
// A person outside the company opens a time-limited link and sees exactly that
// document, then sends back "verified" or "changes requested". No account, no
// other access. The token is never stored in clear text: only its SHA-256 hash
// is kept, and unknown / revoked / expired / already used links all answer the
// same way so they cannot be told apart.
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function resolve(token: string | null) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(token).digest("hex");
  const db = await import("@/lib/hr/db-ext.server");
  return db.reviewLinkByToken(hash);
}

export const Route = createFileRoute("/api/public/v1/hr/review")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentServerMode } = await import("@/lib/deployment-mode.server");
        if (currentServerMode() !== "selfhost") return new Response("Not found", { status: 404 });

        const token = new URL(request.url).searchParams.get("token");
        const link = await resolve(token);
        if (!link) return json({ ok: false, error: "invalid" }, 404);

        const db = await import("@/lib/hr/db-ext.server");
        await db.markReviewLinkOpened(link.id);
        return json({
          ok: true,
          title: link.title,
          body: link.body ?? "",
          country: link.country,
          language: link.language,
          reviewerName: link.reviewer_name,
          reviewerOrg: link.reviewer_org,
        });
      },
      POST: async ({ request }) => {
        const { currentServerMode } = await import("@/lib/deployment-mode.server");
        if (currentServerMode() !== "selfhost") return new Response("Not found", { status: 404 });

        let payload: { token?: unknown; verdict?: unknown; notes?: unknown; reviewerName?: unknown };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return json({ ok: false, error: "bad_request" }, 400);
        }
        const token = typeof payload.token === "string" ? payload.token : null;
        const verdict = payload.verdict === "changes_requested" ? "changes_requested" : "reviewed";
        const notes = typeof payload.notes === "string" ? payload.notes.trim().slice(0, 4000) : "";
        const declared = typeof payload.reviewerName === "string" ? payload.reviewerName.trim().slice(0, 160) : "";

        const link = await resolve(token);
        if (!link) return json({ ok: false, error: "invalid" }, 404);

        const db = await import("@/lib/hr/db-ext.server");
        const reviewer =
          link.reviewer_name ?? (declared || "External reviewer");
        const label = link.reviewer_org ? `${reviewer} (${link.reviewer_org})` : reviewer;

        if (verdict === "reviewed") {
          await db.recordExternalReview(link.company_id, link.document_id, {
            reviewerName: label,
            reviewerOrg: link.reviewer_org,
            reviewedOn: null,
            reference: null,
            notes,
            evidenceId: null,
            recordedBy: label,
          });
        } else {
          await db.requestDocumentChanges(link.company_id, link.document_id, label, notes);
        }
        await db.settleReviewLink(link.id, verdict, notes);
        return json({ ok: true, verdict });
      },
    },
  },
});

// POST /api/public/v1/social/publish-due
//
// Publishes scheduled social posts whose time has come (currently LinkedIn).
// Called by pg_cron with a shared token stored in public.social_cron_tokens.
//
// Safety: bounded batch (3 posts per run), single-flight lease per row,
// idempotent status marking, and a circuit breaker that parks the queue
// on gateway 402/403.

import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";
const BATCH = 3;
const LEASE_MINUTES = 10;

type PostRow = {
  id: string;
  network: string;
  body: string;
  first_comment: string | null;
  attempts: number;
};

async function linkedinAuthor(lovableKey: string, connKey: string) {
  const res = await fetch(`${GATEWAY}/v2/userinfo`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`userinfo failed [${res.status}]: ${text}`), {
      status: res.status,
    });
  }
  const sub = (JSON.parse(text) as { sub?: string }).sub;
  if (!sub) throw new Error("userinfo returned no member id");
  return `urn:li:person:${sub}`;
}

async function publishLinkedIn(
  lovableKey: string,
  connKey: string,
  author: string,
  body: string,
) {
  const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: body },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`ugcPosts failed [${res.status}]: ${text}`), {
      status: res.status,
    });
  }
  const parsed = JSON.parse(text) as { id?: string };
  return parsed.id ?? "";
}

async function commentLinkedIn(
  lovableKey: string,
  connKey: string,
  author: string,
  shareUrn: string,
  text: string,
) {
  // Comment on the share URN itself: the derived activity URN is not the same id.
  const res = await fetch(
    `${GATEWAY}/v2/socialActions/${encodeURIComponent(shareUrn)}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({ actor: author, message: { text } }),
    },
  );
  if (!res.ok) {
    // A failed first comment must not un-publish the post.
    console.error(
      `first comment failed [${res.status}]: ${await res.text()}`,
    );
  }
}

export const Route = createFileRoute("/api/public/v1/social/publish-due")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token =
          request.headers.get("x-social-cron-token") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!token || token.length < 20) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: tokenRow } = await supabaseAdmin
          .from("social_cron_tokens")
          .select("id")
          .eq("token", token)
          .maybeSingle();
        if (!tokenRow) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const lovableKey = process.env["LOVABLE_API_KEY"];
        const connKey = process.env["LINKEDIN_API_KEY"];
        if (!lovableKey || !connKey) {
          return Response.json(
            { error: "linkedin connector not configured" },
            { status: 503 },
          );
        }

        const nowIso = new Date().toISOString();
        const leaseUntil = new Date(
          Date.now() + LEASE_MINUTES * 60_000,
        ).toISOString();

        const { data: due, error: dueError } = await supabaseAdmin
          .from("social_scheduled_posts")
          .select("id, network, body, first_comment, attempts")
          .eq("status", "scheduled")
          .lte("scheduled_at", nowIso)
          .or(`locked_until.is.null,locked_until.lt.${nowIso}`)
          .order("scheduled_at", { ascending: true })
          .limit(BATCH);

        if (dueError) {
          return Response.json({ error: dueError.message }, { status: 500 });
        }

        const rows = (due ?? []) as PostRow[];
        if (rows.length === 0) {
          return Response.json({ ok: true, published: 0 });
        }

        let author: string;
        try {
          author = await linkedinAuthor(lovableKey, connKey);
        } catch (err) {
          const status = (err as { status?: number }).status;
          const message = err instanceof Error ? err.message : String(err);
          if (status === 402 || status === 403) {
            await supabaseAdmin
              .from("social_scheduled_posts")
              .update({ status: "paused", last_error: message })
              .in("status", ["scheduled"])
              .lte("scheduled_at", nowIso);
          }
          return Response.json({ error: message }, { status: 502 });
        }

        let published = 0;
        const failures: string[] = [];

        for (const row of rows) {
          // Single-flight lease: only the run that wins the lease proceeds.
          const { data: leased } = await supabaseAdmin
            .from("social_scheduled_posts")
            .update({ locked_until: leaseUntil, attempts: row.attempts + 1 })
            .eq("id", row.id)
            .eq("status", "scheduled")
            .or(`locked_until.is.null,locked_until.lt.${nowIso}`)
            .select("id")
            .maybeSingle();
          if (!leased) continue;

          try {
            const urn = await publishLinkedIn(
              lovableKey,
              connKey,
              author,
              row.body,
            );
            if (row.first_comment && urn) {
              await commentLinkedIn(
                lovableKey,
                connKey,
                author,
                urn,
                row.first_comment,
              );
            }
            await supabaseAdmin
              .from("social_scheduled_posts")
              .update({
                status: "published",
                published_urn: urn,
                published_at: new Date().toISOString(),
                locked_until: null,
                last_error: null,
              })
              .eq("id", row.id);
            published += 1;
          } catch (err) {
            const status = (err as { status?: number }).status;
            const message = err instanceof Error ? err.message : String(err);
            failures.push(message);
            const terminal =
              status === 400 ||
              status === 401 ||
              status === 402 ||
              status === 403 ||
              row.attempts + 1 >= 3;
            await supabaseAdmin
              .from("social_scheduled_posts")
              .update({
                status: terminal
                  ? status === 402 || status === 403
                    ? "paused"
                    : "failed"
                  : "scheduled",
                locked_until: null,
                last_error: message,
              })
              .eq("id", row.id);
            if (status === 402 || status === 403) break;
          }
        }

        return Response.json({ ok: true, published, failures });
      },
    },
  },
});

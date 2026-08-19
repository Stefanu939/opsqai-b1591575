// GET /api/public/calendar/<token>[.ics] — private ICS subscription feed.
//
// Subscribed by Outlook / Google Calendar / Apple Calendar. Authentication
// is the unguessable per-user token itself (256 bits of hex), which can be
// rotated from the calendar UI. The feed never exposes anything the token's
// owner cannot already see in the app.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { isSelfHosted } = await import("@/lib/platform");
        let ics: string | null = null;
        try {
          if (isSelfHosted()) {
            const local = await import("@/lib/calendar-selfhost.server");
            ics = await local.renderLocalFeed(String(params.token ?? ""));
          } else {
            const { renderFeed } = await import("@/lib/calendar-core.server");
            ics = await renderFeed(String(params.token ?? ""));
          }
        } catch {
          ics = null;
        }
        if (!ics) {
          return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        return new Response(ics, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="opsqai.ics"',
            "Cache-Control": "public, max-age=900",
          },
        });
      },
    },
  },
});

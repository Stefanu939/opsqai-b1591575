// GET /api/public/ready — shallow readiness probe.
//
// Phase 5. Cheap check meant for load balancers and process managers
// (WinSW, Caddy upstream health) that just need to know "can this
// process accept traffic right now?". Does NOT touch the database or
// call providers — those live under /health.

import { createFileRoute } from "@tanstack/react-router";
import { getPlatformMode } from "@/lib/platform";

export const Route = createFileRoute("/api/public/ready")({
  server: {
    handlers: {
      GET: async () => {
        let mode: string;
        try {
          mode = getPlatformMode();
        } catch {
          // Platform module loaded but bootstrap not finished yet.
          return new Response(
            JSON.stringify({ ready: false, reason: "bootstrap-pending" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            ready: true,
            mode,
            at: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});

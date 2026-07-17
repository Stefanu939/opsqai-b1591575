// GET /api/public/health — deep health check.
//
// Phase 5. Called by:
//   - the installer wizard's final page
//   - the updater orchestrator's post-install gate (rollback trigger)
//   - external monitors (Caddy, Uptime Kuma, k8s liveness probe)
//
// Returns HTTP 200 when overall status is "ok" or "warn", HTTP 503 on
// "fail", HTTP 200 on "n/a" (platform not yet bootstrapped — do not
// mark the box as failed while it's still starting up).

import { createFileRoute } from "@tanstack/react-router";
import { runHealthCheck } from "@/lib/platform/health";
import { counter } from "@/lib/platform/metrics";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const report = await runHealthCheck();
          counter("opsqai_health_checks_total", "Health check invocations", {
            outcome: report.overall,
          });
          const status =
            report.overall === "fail" ? 503 : 200;
          return new Response(JSON.stringify(report), {
            status,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          counter("opsqai_health_checks_total", "Health check invocations", {
            outcome: "error",
          });
          return new Response(
            JSON.stringify({
              overall: "fail",
              checks: [],
              generatedAt: new Date().toISOString(),
              error: err instanceof Error ? err.message : String(err),
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

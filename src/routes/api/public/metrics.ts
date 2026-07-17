// GET /api/public/metrics — Prometheus text exposition.
//
// Phase 5. Exposes the in-process counter registry so an external
// scraper (Prometheus / VictoriaMetrics / a Task Scheduler curl job)
// can pull throughput and error counts without a heavyweight client.
//
// Deliberately unauthenticated: the metrics are non-sensitive
// aggregates. On Self-Hosted, Caddy is expected to gate this behind
// mTLS or an IP allowlist if the operator wants strict privacy.

import { createFileRoute } from "@tanstack/react-router";
import { gauge, renderPrometheus } from "@/lib/platform/metrics";
import { getPlatformMode, getActiveEdition } from "@/lib/platform";

export const Route = createFileRoute("/api/public/metrics")({
  server: {
    handlers: {
      GET: async () => {
        // Refresh dynamic gauges just-in-time.
        try {
          gauge("opsqai_up", "1 if the platform is bootstrapped", 1, {
            mode: getPlatformMode(),
            edition: getActiveEdition(),
          });
        } catch {
          gauge("opsqai_up", "1 if the platform is bootstrapped", 0);
        }
        gauge(
          "opsqai_process_uptime_seconds",
          "Process uptime in seconds",
          typeof process !== "undefined" ? process.uptime() : 0,
        );

        return new Response(renderPrometheus(), {
          status: 200,
          headers: {
            "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

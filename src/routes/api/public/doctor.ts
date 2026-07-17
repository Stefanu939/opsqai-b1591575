// GET /api/public/doctor — Phase 8 operational report.
//
// Superset of /health: rolls in disk space, backup freshness, telemetry
// level, edition, and cipher canary in addition to the license check.
// Consumed by the Admin Console dashboard tile and the
// `opsqai doctor` CLI. Returns HTTP 200 with a JSON body regardless of
// severity — the caller reads `overall` to decide alerting.

import { createFileRoute } from "@tanstack/react-router";
import { runDoctor } from "@/lib/platform/doctor";
import { counter } from "@/lib/platform/metrics";

export const Route = createFileRoute("/api/public/doctor")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const report = await runDoctor();
          counter("opsqai_doctor_runs_total", "Doctor report invocations", {
            outcome: report.overall,
          });
          return new Response(JSON.stringify(report), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          counter("opsqai_doctor_runs_total", "Doctor report invocations", {
            outcome: "error",
          });
          return new Response(
            JSON.stringify({
              overall: "red",
              findings: [],
              generatedAt: new Date().toISOString(),
              error: err instanceof Error ? err.message : String(err),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

// POST /api/public/station-heartbeat — a paired workstation proves it is
// still allowed to connect (signed "<id>.<ts>"). Revoked or unknown
// workstations get 403 and the desktop app stops loading the platform.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  station_id: z.string().uuid(),
  ts: z.number().int(),
  signature: z.string().min(40).max(200),
});

export const Route = createFileRoute("/api/public/station-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.OPSQAI_MODE !== "selfhost") return new Response("no", { status: 404 });
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ status: "invalid" }), { status: 400 });
        }
        const { verifyStation } = await import("@/lib/selfhost-stations.server");
        const status = await verifyStation(input.station_id, input.ts, input.signature);
        return new Response(JSON.stringify({ status }), {
          status: status === "ok" ? 200 : 403,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

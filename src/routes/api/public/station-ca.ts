// GET /api/public/station-ca — the main computer's local certificate authority
// (public certificate only). Workstations download it while pairing and check
// its fingerprint against the one printed in the pairing code, then pin it.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/station-ca")({
  server: {
    handlers: {
      GET: async () => {
        if (process.env.OPSQAI_MODE !== "selfhost") return new Response("not found", { status: 404 });
        const { readCa } = await import("@/lib/selfhost-remote.server");
        const ca = await readCa();
        if (!ca) return new Response("ca_missing", { status: 503 });
        return new Response(ca.pem, {
          headers: { "Content-Type": "application/x-pem-file", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

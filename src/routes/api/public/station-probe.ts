// POST /api/public/station-probe — Self-Hosted workstation pairing check.
//
// Called by the Windows installer on PC 2, PC 3 … ("Workstation" mode) to
// confirm that the address the operator typed is the company's OPSQAI
// server AND that it is already activated with the same company licence.
// The first installation (the server) owns the licence and the first
// administrator; workstations never create accounts.
//
// Returns no PII: the company name is echoed only when it matches the
// licence the caller already holds.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  customer: z.string().max(200).nullable().optional(),
  install_id: z.string().max(100).nullable().optional(),
});

export const Route = createFileRoute("/api/public/station-probe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        if (process.env.OPSQAI_MODE !== "selfhost") {
          return json({ product: "opsqai", selfhost: false }, 404);
        }
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch {
          return json({ error: "invalid body" }, 400);
        }
        const { readInstallationOwner, companyKey } = await import(
          "@/lib/selfhost-tenant-binding.server"
        );
        const owner = await readInstallationOwner();
        if (!owner) {
          return json({ product: "opsqai-selfhost", activated: false, match: false });
        }
        const key = companyKey({ customer: input.customer, install_id: input.install_id });
        const match = !!key && key === owner.companyKey;
        return json({
          product: "opsqai-selfhost",
          activated: true,
          match,
          company_name: match ? owner.companyName : null,
        });
      },
    },
  },
});

// POST /api/public/station-register — pair a workstation with the main computer.
//
// The workstation sends the company licence it was given (signature verified
// here, so company and seats are trusted), plus its own station id and
// Ed25519 public key. Pairing only succeeds when the licence belongs to the
// same company this main computer is bound to. No account is created.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  license: z.string().min(20).max(20000),
  station_id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).nullable().optional(),
  hostname: z.string().trim().max(120).nullable().optional(),
  public_key: z.string().min(40).max(1000).regex(/BEGIN PUBLIC KEY/),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/station-register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.OPSQAI_MODE !== "selfhost") return json({ error: "not_selfhost" }, 404);
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch {
          return json({ error: "invalid_body" }, 400);
        }
        const { previewSelfHostLicense } = await import("@/lib/selfhost-license-activation.server");
        const { readInstallationOwner, companyKey } = await import(
          "@/lib/selfhost-tenant-binding.server"
        );
        const owner = await readInstallationOwner();
        if (!owner) return json({ error: "not_activated" }, 409);

        // The licence belongs to the main computer's install_id, so verify it
        // against that id rather than anything the caller claims.
        const lic = await previewSelfHostLicense(input.license, owner.installId ?? undefined);
        if (!lic.ok || (lic.kind !== "install" && lic.kind !== "bundle")) {
          return json({ error: "license_invalid" }, 403);
        }
        const key = companyKey({ customer: lic.customer, install_id: lic.install_id });
        if (!key || key !== owner.companyKey) return json({ error: "other_company" }, 403);

        const stations = await import("@/lib/selfhost-stations.server");
        const active = await stations.countActiveStations();
        const already = (await stations.listStations()).some(
          (s) => s.id === input.station_id && !s.revoked_at,
        );
        // Seats cover the main computer plus every active workstation.
        if (!already && lic.seats && active + 1 >= lic.seats) {
          return json({ error: "seats_exhausted" }, 409);
        }
        await stations.registerStation({
          id: input.station_id,
          name: input.name,
          location: input.location ?? null,
          publicKey: input.public_key,
          hostname: input.hostname ?? null,
        });
        return json({ ok: true, station_id: input.station_id, company_name: owner.companyName });
      },
    },
  },
});

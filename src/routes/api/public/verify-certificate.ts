// GET /api/public/verify-certificate?code=<certificate_code>
//
// Public, read-only verification of an Academy certificate. Works in both
// deployments: Cloud verifies against the Supabase academy tables, Self-Hosted
// against the local Postgres database. Returns only what the printed
// certificate already shows.

import { createFileRoute } from "@tanstack/react-router";

const CODE_RE = /^[0-9a-fA-F-]{8,64}$/;

export const Route = createFileRoute("/api/public/verify-certificate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
        const headers = { "Cache-Control": "no-store" };
        if (!CODE_RE.test(code)) {
          return Response.json({ found: false }, { status: 404, headers });
        }

        try {
          const { isSelfHosted } = await import("@/lib/platform");
          const { getAcademyRepository } = await import("@/lib/providers/registry");
          let repo;
          if (isSelfHosted()) {
            repo = getAcademyRepository(null);
          } else {
            const { createServiceRoleClient } = await import(
              "@/lib/providers/cloud/service-role.server"
            );
            repo = getAcademyRepository(createServiceRoleClient());
          }
          const result = await repo.verifyCertificate(code);
          if (!result || !result.certificateCode) {
            return Response.json({ found: false }, { status: 404, headers });
          }
          return Response.json({ found: true, certificate: result }, { headers });
        } catch {
          // Unknown code for this deployment (e.g. a Self-Hosted code scanned
          // against the Cloud site) — treat as not found, never as an error.
          return Response.json({ found: false }, { status: 404, headers });
        }

      },
    },
  },
});

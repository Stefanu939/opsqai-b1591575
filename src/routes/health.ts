import { createFileRoute } from "@tanstack/react-router";

import { getPlatformMode } from "@/lib/platform/mode";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(
            {
              ok: true,
              ready: true,
              mode: getPlatformMode(),
              at: new Date().toISOString(),
            },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          return Response.json(
            {
              ok: false,
              ready: false,
              error: error instanceof Error ? error.message : String(error),
              at: new Date().toISOString(),
            },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
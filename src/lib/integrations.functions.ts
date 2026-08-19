// Integration connect / disconnect server functions (thin wrappers only).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";

const PROVIDERS = ["outlook", "gmail", "teams"] as const;

export const connectIntegrationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        provider: z.enum(PROVIDERS),
        webhookUrl: z.string().trim().max(2000).nullable().optional(),
        method: z.enum(["companion", "calendar"]).nullable().optional(),
        accountEmail: z.string().trim().max(320).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/integrations.server");
    return mod.connectIntegration(context, data);
  });

export const disconnectIntegrationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ provider: z.enum(PROVIDERS) }).parse(d))
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/integrations.server");
    return mod.disconnectIntegration(context, data.provider);
  });

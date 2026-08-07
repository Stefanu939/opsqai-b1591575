// Company logo upload for Self-Hosted installations.
//
// Cloud keeps logos in Supabase Storage; Self-Hosted has no public bucket,
// so we store a small base64 data URL in config.json and serve it inline.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { getPlatformMode, PlatformMode } from "@/lib/platform";

const LogoInput = {
  data_base64: z.string().min(1),
  content_type: z.string().min(1),
};

import { z } from "zod";

const logoInput = z.object({
  data_base64: z.string().min(1),
  content_type: z.string().min(1),
});

export const getCompanyLogo = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    if (getPlatformMode() !== PlatformMode.SelfHosted) return { logo_url: null };
    const { readSelfHostConfig } = await import("@/lib/selfhost-config.server");
    const cfg = readSelfHostConfig();
    return { logo_url: (cfg.company?.logo_url as string | undefined) ?? null };
  });

export const saveCompanyLogo = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => logoInput.parse(d))
  .handler(async ({ data, context }) => {
    if (getPlatformMode() !== PlatformMode.SelfHosted) {
      throw new Error("Company logo upload is only available on Self-Hosted");
    }
    const { isPlatformAdmin, isCompanyAdmin } = await getActorRoles(context.supabase, context.userId);
    if (!isPlatformAdmin && !isCompanyAdmin) throw new Error("Forbidden");

    const { readSelfHostConfig, writeSelfHostConfig } = await import(
      "@/lib/selfhost-config.server"
    );
    const cfg = readSelfHostConfig();
    cfg.company = cfg.company ?? { name: "OPSQAI" };
    cfg.company.logo_url = `data:${data.content_type};base64,${data.data_base64}`;
    writeSelfHostConfig(cfg);
    return { logo_url: cfg.company.logo_url };
  });

import { getActorRoles } from "@/lib/authorization";

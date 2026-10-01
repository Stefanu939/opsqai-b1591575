import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

async function guard(context: unknown) {
  await requirePlatformAdmin(context as never);
  const { isSelfHosted } = await import("@/lib/platform/mode");
  if (!isSelfHosted()) throw new Error("Available on Self-Hosted only.");
  return (context as { userId: string }).userId;
}

export const anonymizeUserData = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await guard(context);
    const { anonymizeUser } = await import("@/lib/privacy.server");
    return anonymizeUser(data.user_id, actor);
  });

export const getPrivacyRetention = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const { getRetention } = await import("@/lib/privacy.server");
    return getRetention();
  });

export const setPrivacyRetention = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(7).max(3650).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await guard(context);
    const { setRetention } = await import("@/lib/privacy.server");
    return setRetention(data.days, actor);
  });

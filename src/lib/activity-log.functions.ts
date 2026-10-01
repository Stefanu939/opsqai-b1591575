import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

const Filters = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  actor: z.string().trim().max(200).optional(),
  severity: z.enum(["info", "warning", "critical", "error"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

/** Company activity log — Self-Hosted only, administrators only. */
export const listActivityLog = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => Filters.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("The activity log is available on Self-Hosted only.");
    const { listActivity } = await import("@/lib/activity-log.server");
    return listActivity(data);
  });

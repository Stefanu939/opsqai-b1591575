import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

/** Export everything stored about one user — Self-Hosted, administrators only. */
export const exportUserData = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("GDPR export is available on Self-Hosted only.");
    const { buildUserExport } = await import("@/lib/gdpr-export.server");
    const payload = await buildUserExport(data.user_id);
    try {
      const { Pool } = await import("pg");
      const p = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
      await p.query(
        `INSERT INTO public.audit_log (actor_id, action, target, detail) VALUES ($1,$2,$3,$4::jsonb)`,
        [
          (context as { userId: string }).userId,
          "gdpr.export",
          data.user_id,
          JSON.stringify({ module: "users", severity: "warning", success: true, tables: Object.keys(payload.tables) }),
        ],
      );
      await p.end();
    } catch {
      /* audit best-effort */
    }
    return JSON.stringify(payload, null, 2);
  });

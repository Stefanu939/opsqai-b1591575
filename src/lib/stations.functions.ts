// Connected computers (Self-Hosted workstations) — admin API.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePermission } from "@/lib/authorization";

function assertSelfHost() {
  if (process.env.OPSQAI_MODE !== "selfhost") throw new Error("Self-Hosted only");
}

export const listConnectedComputers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertSelfHost();
    await requirePermission(context, "rbac.manage");
    const { listStations } = await import("@/lib/selfhost-stations.server");
    return listStations();
  });

export const updateConnectedComputer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        location: z.string().trim().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertSelfHost();
    await requirePermission(context, "rbac.manage");
    const { updateStation } = await import("@/lib/selfhost-stations.server");
    await updateStation(data.id, { name: data.name, location: data.location });
    return { ok: true };
  });

export const revokeConnectedComputer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertSelfHost();
    await requirePermission(context, "rbac.manage");
    const { revokeStation } = await import("@/lib/selfhost-stations.server");
    await revokeStation(data.id, context.userId);
    return { ok: true };
  });

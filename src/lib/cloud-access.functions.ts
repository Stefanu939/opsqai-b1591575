import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { readCloudAccess } from "@/lib/cloud-access.server";

export const getCloudAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(({ context }) => readCloudAccess(context));
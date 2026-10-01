// Tells the sign-in screen whether to show "Sign in with Microsoft".
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/microsoft/status")({
  server: {
    handlers: {
      GET: async () => {
        const { isSelfHosted } = await import("@/lib/platform/mode");
        if (!isSelfHosted()) return Response.json({ enabled: false });
        const m = await import("@/lib/microsoft/entra.server");
        const cfg = m.getMicrosoftConfig();
        return Response.json({ enabled: Boolean(cfg.ssoEnabled && m.isMicrosoftConfigured(cfg)) });
      },
    },
  },
});

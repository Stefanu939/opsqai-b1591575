import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

// The OPSQAI application (`/app/*`) is the Self-Hosted Windows product.
// It runs INSIDE the customer's infrastructure. On the cloud deployment
// (`OPSQAI_MODE=mc`, opsqai.de), no company end user should ever reach it —
// they authenticate only into their local Windows installation.
//
// EXCEPTION — Staff Preview: OPSQAI staff (`platform_admin` / `platform_owner`)
// are allowed through on the cloud so they can demo, QA, and review the
// Self-Hosted UI from the Management Center. A visible banner (see
// `staff-preview-banner.tsx`, mounted by `app-shell.tsx`) makes it explicit
// that they are in a preview mode, not looking at a real customer install.
// Regular customers/members continue to be redirected to `/windows-only`.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async () => {
    if (getClientDeploymentMode() !== "mc") return;

    // Cloud mode — only OPSQAI staff may enter the Self-Hosted preview.
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/windows-only" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const isStaff = (roles ?? []).some(
      (r) => r.role === "platform_admin" || r.role === "platform_owner",
    );
    if (!isStaff) throw redirect({ to: "/windows-only" });
  },
  component: () => <Outlet />,
});

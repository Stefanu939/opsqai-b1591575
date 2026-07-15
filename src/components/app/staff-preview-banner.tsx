import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

// Staff Preview banner.
//
// Shown ONLY when an OPSQAI staff account (platform_admin / platform_owner)
// is viewing the Self-Hosted product (`/app/*`) from the cloud Management
// Center deployment. On real self-hosted Windows installs this component
// renders nothing, so customers never see it.
//
// Purpose: make it impossible for staff to mistake the demo cloud sandbox
// for a real customer install.
export function StaffPreviewBanner() {
  const { isPlatformAdmin } = useAuth();
  if (getClientDeploymentMode() !== "mc") return null;
  if (!isPlatformAdmin) return null;

  return (
    <div
      role="status"
      className="w-full border-b border-amber-500/40 bg-amber-500/10 text-amber-100 text-xs md:text-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
        <Eye className="h-4 w-4 flex-none" aria-hidden />
        <span>
          <strong className="font-semibold tracking-wide">STAFF PREVIEW</strong>
          <span className="opacity-80">
            {" "}
            — you are viewing the Self-Hosted product from the Management Center.
            This is a demo sandbox. Customers never see this view.
          </span>
        </span>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { DEMO_COMPANY_ID, DEMO_COMPANY_DISPLAY_NAME } from "@/lib/staff-preview";

// Staff Preview banner.
//
// Shown ONLY when an OPSQAI staff account (platform_admin / platform_owner)
// is viewing the Self-Hosted product (`/app/*`) from the cloud Management
// Center deployment. On real self-hosted Windows installs this component
// renders nothing, so customers never see it.
//
// Side effect: while mounted, it pins the staff user's active workspace
// to the seeded demo tenant ("Atlas Logistics GmbH"). All client-side
// queries in the Self-Hosted UI scope by `scopeCompanyId`, so this makes
// the preview show demo data — never a real customer tenant that a
// platform admin might have been inspecting from `/management/*`.
export function StaffPreviewBanner() {
  const { isPlatformAdmin, activeCompanyId, setActiveCompanyId } = useAuth();
  const isMc = getClientDeploymentMode() === "mc";
  const shouldPin = isMc && isPlatformAdmin;

  useEffect(() => {
    if (!shouldPin) return;
    if (activeCompanyId !== DEMO_COMPANY_ID) {
      setActiveCompanyId(DEMO_COMPANY_ID);
    }
  }, [shouldPin, activeCompanyId, setActiveCompanyId]);

  if (!shouldPin) return null;

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
            — you are viewing the Self-Hosted product from the Management
            Center. Data shown belongs to the demo tenant{" "}
            <em className="not-italic font-medium">{DEMO_COMPANY_DISPLAY_NAME}</em>.
            Customers never see this view.
          </span>
        </span>
      </div>
    </div>
  );
}

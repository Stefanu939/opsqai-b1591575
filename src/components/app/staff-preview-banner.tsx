import { useEffect } from "react";
import { Eye, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { DEMO_COMPANY_ID, DEMO_COMPANY_DISPLAY_NAME } from "@/lib/staff-preview";

export function StaffPreviewBanner() {
  const { isPlatformAdmin, activeCompanyId, setActiveCompanyId } = useAuth();
  const navigate = useNavigate();
  const isMc = getClientDeploymentMode() === "mc";
  const shouldPin = isMc && isPlatformAdmin;

  useEffect(() => {
    if (!shouldPin) return;
    if (activeCompanyId !== DEMO_COMPANY_ID) {
      setActiveCompanyId(DEMO_COMPANY_ID);
    }
  }, [shouldPin, activeCompanyId, setActiveCompanyId]);

  if (!shouldPin) return null;

  function exitDemo() {
    setActiveCompanyId(null);
    navigate({ to: "/management" });
  }

  return (
    <div
      role="status"
      className="w-full border-b border-amber-500/40 bg-amber-500/10 text-amber-100 text-xs md:text-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <Eye className="h-4 w-4 flex-none" aria-hidden />
        <span className="flex-1">
          <strong className="font-semibold tracking-wide">STAFF PREVIEW</strong>
          <span className="opacity-80">
            {" "}
            — you are viewing the Self-Hosted product from the Management
            Center. Data shown belongs to the demo tenant{" "}
            <em className="not-italic font-medium">{DEMO_COMPANY_DISPLAY_NAME}</em>.
            Customers never see this view.
          </span>
        </span>
        <button
          type="button"
          onClick={exitDemo}
          className="inline-flex flex-none items-center gap-1 rounded border border-amber-500/50 bg-amber-500/20 px-2 py-1 text-amber-50 hover:bg-amber-500/30 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Exit demo
        </button>
      </div>
    </div>
  );
}


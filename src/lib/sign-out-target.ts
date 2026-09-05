// Where a sign-out should land, so the sign-in screen comes back pre-set to the
// same surface the user just left (Management Center vs Customer Portal) instead
// of silently defaulting to the Customer Portal.
import { getClientDeploymentMode } from "@/lib/deployment-mode";

export type SignOutAudience = "mc" | "portal" | "company";

export function audienceForPath(pathname: string): SignOutAudience {
  if (getClientDeploymentMode() === "selfhost") return "company";
  if (pathname.startsWith("/management")) return "mc";
  if (pathname.startsWith("/portal")) return "portal";
  return "company";
}

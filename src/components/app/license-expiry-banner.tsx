// Self-Hosted licence expiry warning.
//
// Two states, no surprises for the customer:
//  - last 14 days: a calm warning with the exact date;
//  - after the date: read-only grace — reading and exporting still work,
//    creating and changing records is refused until the licence is extended.
//
// Extension is a new licence file; no reinstall, no data migration.

import { useLicense } from "@/lib/license";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useT } from "@/i18n";
import { AlertTriangle, Clock } from "lucide-react";

const DAY = 86_400;

export function LicenseExpiryBanner() {
  const { t } = useT();
  const license = useLicense();
  if (getClientDeploymentMode() !== "selfhost") return null;
  if (license.unlimited || !license.expires_at) return null;

  const now = Math.floor(Date.now() / 1000);
  const daysLeft = Math.ceil((license.expires_at - now) / DAY);
  if (daysLeft > 14) return null;

  const date = new Date(license.expires_at * 1000).toLocaleDateString();
  const expired = daysLeft <= 0;

  const title = expired
    ? t("licenseExpiredTitle").replace("{date}", date)
    : t("licenseExpiringTitle")
        .replace("{days}", String(daysLeft))
        .replace("{date}", date);

  return (
    <div
      role="status"
      className={
        expired
          ? "mx-4 mb-3 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"
          : "mx-4 mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
      }
    >
      {expired ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <div>
        <span className="font-medium">{title}</span>{" "}
        {expired ? t("licenseExpiredBody") : t("licenseExpiringBody")}
      </div>
    </div>
  );
}

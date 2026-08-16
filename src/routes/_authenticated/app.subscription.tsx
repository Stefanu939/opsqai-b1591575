import { createFileRoute } from "@tanstack/react-router";
import { useLicense } from "@/lib/license";
import { LICENSE_MODULE_CATALOG, BASIC_MODULES } from "@/lib/license-modules";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { Check, Lock } from "lucide-react";
import { ModulePage } from "@/components/app/module-page";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "Subscription — OPSQAI" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const license = useLicense();
  // Self-Hosted has no Cloud billing surface: modules are unlocked by the
  // activation bundle installed on this machine, so the copy must say so
  // instead of pointing at a purchase flow that does not exist offline.
  const selfhost = getClientDeploymentMode() === "selfhost";
  const modules = license.modules ?? [];
  const active = new Set<string>([...BASIC_MODULES, ...modules]);

  const basic = LICENSE_MODULE_CATALOG.filter((m) => m.inBasic);
  const addons = LICENSE_MODULE_CATALOG.filter((m) => !m.inBasic);

  return (
    <ModulePage
      eyebrow="Entitlements"
      title={selfhost ? "Licensed modules" : "Your subscription"}
      description={
        selfhost
          ? "Basic bundle is always included. Extra modules unlock from the activation bundle installed on this server — no internet connection required."
          : "Basic bundle is always included. Extra modules unlock when you purchase a license from OPSQAI."
      }
    >


      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Basic bundle (included)
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {basic.map((m) => (
            <li key={m.key} className="flex items-center gap-3 p-4">
              <Check className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Add-on modules
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {addons.map((m) => {
            const on = active.has(m.key);
            return (
              <li key={m.key} className="flex items-center gap-3 p-4">
                {on ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.description}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {on ? "Active" : `€${(m.defaultPriceCents / 100).toLocaleString("de-DE")}`}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          To request an add-on, contact your OPSQAI representative or open a support ticket.
        </p>
      </section>
    </ModulePage>
  );
}

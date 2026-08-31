import { createFileRoute } from "@tanstack/react-router";
import { useLicense } from "@/lib/license";
import {
  ADDON_CATALOG,
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  canonicalKey,
  resolveEffectiveConfig,
  workspacesForProduct,
} from "@/lib/product-architecture";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModulePage } from "@/components/app/module-page";
import { LicenseActivationPanel } from "@/components/app/license-activation-panel";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "License & Entitlements — OPSQAI" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const license = useLicense();
  // Self-Hosted has no Cloud billing surface: entitlements are unlocked by the
  // activation bundle installed on this machine, so the copy must say so
  // instead of pointing at a purchase flow that does not exist offline.
  const selfhost = getClientDeploymentMode() === "selfhost";

  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: (license.modules ?? []).map(canonicalKey),
  });
  const activeAddons = new Set<string>(cfg.addons);
  const enabledProducts = new Set<string>(cfg.products);

  return (
    <ModulePage
      eyebrow="Entitlements"
      title="License & entitlements"
      description={
        selfhost
          ? "The Core platform is always included. Products and add-ons resolve from the signed license installed on this server — no internet connection required."
          : "The Core platform is always included. Products and add-ons are enabled by OPSQAI through a signed license."
      }
    >
      {selfhost && <LicenseActivationPanel />}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Core platform — always included
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {CORE_CAPABILITIES.map((c) => (
            <li key={c.key} className="flex items-center gap-3 p-4">
              <Check className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          Core capabilities are never sold separately. Visibility is governed only by roles and
          permissions.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Your products
        </h2>
        {cfg.products.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-border p-4">
            No OPSQAI product is enabled for this installation. Your company profile determines
            which products are relevant — contact OPSQAI to have one enabled.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {PRODUCT_CATALOG.filter((p) => enabledProducts.has(p.key)).map((p) => {
              const shipped = workspacesForProduct(p.key).filter(
                (w) => w.status === "implemented",
              );
              return (
                <li key={p.key} className="flex items-start gap-3 p-4">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {shipped.length > 0 ? "Enabled" : "Enabled — workspaces in preparation"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Optional add-ons
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {ADDON_CATALOG.map((a) => {
            const on = activeAddons.has(a.key);
            return (
              <li key={a.key} className="flex items-center gap-3 p-4">
                {on ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.description}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {on ? "Active" : "Not licensed"}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          To request a product or add-on, contact your OPSQAI representative or open a support
          ticket.
        </p>
      </section>
    </ModulePage>
  );
}

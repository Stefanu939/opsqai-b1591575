// License & Entitlements (Self-Hosted / installation view).
//
// This is NOT a marketplace and NOT a price list. It answers three
// questions for the operator: what is my license, what is included in the
// OPSQAI platform, and which OPSQAI Products / add-ons are entitled to this
// installation. Purchasing conversations happen with OPSQAI, not here.

import { createFileRoute } from "@tanstack/react-router";
import { useLicense } from "@/lib/license";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import {
  ADDON_CATALOG,
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  resolveEffectiveConfig,
} from "@/lib/product-architecture";
import { LicenseActivationPanel } from "@/components/app/license-activation-panel";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Info, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/modules")({
  head: () => ({
    meta: [
      { title: "License & Entitlements — OPSQAI" },
      {
        name: "description",
        content:
          "Installation license, included OPSQAI platform capabilities, enabled products and optional add-ons.",
      },
      { property: "og:title", content: "License & Entitlements — OPSQAI" },
      {
        property: "og:description",
        content: "Installation license status, included capabilities and enabled OPSQAI Products.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntitlementsPage,
});

function fmtDate(sec: number | null): string {
  if (!sec) return "No expiry";
  return new Date(sec * 1000).toLocaleDateString();
}

function EntitlementsPage() {
  const license = useLicense();
  const selfhost = getClientDeploymentMode() === "selfhost";
  // Product / add-on entitlements travel in `license.products`; `license.modules`
  // only carries the legacy module vocabulary, so product keys never appear there.
  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: [...(license.products ?? []), ...(license.modules ?? [])],
  });
  const granted = new Set<string>([
    ...cfg.products,
    ...cfg.addons,
    ...(license.modules ?? []),
  ]);

  const products = PRODUCT_CATALOG.filter((p) => license.unlimited || granted.has(p.key));
  const addons = ADDON_CATALOG.filter((a) => license.unlimited || granted.has(a.key));

  const licenseStatus = license.revoked
    ? { label: "Revoked", variant: "destructive" as const }
    : license.install_id || license.unlimited
      ? { label: "Active", variant: "default" as const }
      : { label: "Not activated", variant: "outline" as const };

  return (
    <ModulePage
      eyebrow="Licensing"
      title="License & Entitlements"
      description="Your installation license, the OPSQAI platform capabilities included with it, and the products entitled to this installation."
    >
      {/* 1. License status */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Installation license</h2>
          </div>
          <Badge variant={licenseStatus.variant}>{licenseStatus.label}</Badge>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Customer</dt>
            <dd className="mt-1 font-medium">{license.company_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              Installation ID
            </dt>
            <dd className="mt-1 font-mono text-xs break-all">{license.install_id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Expires</dt>
            <dd className="mt-1 tabular-nums">{fmtDate(license.expires_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Maintenance</dt>
            <dd className="mt-1 tabular-nums">{fmtDate(license.maintenance_expires_at)}</dd>
          </div>
        </dl>
      </Card>

      <Panel glass bodyClassName="flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          OPSQAI platform capabilities are part of every installation and are never purchased
          separately — access to them is governed by roles and permissions. Products and add-ons are
          explicit entitlements distributed through your license.
        </div>
      </Panel>

      {/* 2. Active entitlements */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Active entitlements · included platform
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {CORE_CAPABILITIES.map((c) => (
            <Card key={c.key} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold">{c.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                <Check className="mr-1 h-3 w-3" />
                Included
              </Badge>
            </Card>
          ))}
        </div>
      </section>

      {/* OPSQAI Products */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          OPSQAI Products
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((p) => {
            return (
              <Card key={p.key} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-sm font-semibold">{p.label}</div>
                      <Badge variant="default" className="text-[10px]">
                        <Check className="mr-1 h-3 w-3" />
                        Enabled
                      </Badge>
                      {p.status === "planned" && (
                        <Badge variant="outline" className="text-[10px]">
                          Planned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {products.length === 0 ? <p className="text-sm text-muted-foreground">No product entitlement is active.</p> : null}
      </section>

      {/* Optional add-ons */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Optional add-ons
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {addons.map((a) => {
            return (
              <Card key={a.key} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-sm font-semibold">{a.label}</div>
                      <Badge variant="default" className="text-[10px]">Enabled</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {addons.length === 0 ? <p className="text-sm text-muted-foreground">No optional add-on is active.</p> : null}
      </section>

      {/* 3. Verification and local replacement */}
      {selfhost ? (
        <section className="mt-8">
          <LicenseActivationPanel onActivated={() => window.location.reload()} />
        </section>
      ) : null}
    </ModulePage>
  );
}

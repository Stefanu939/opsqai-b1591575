// License & Entitlements (Self-Hosted / installation view).
//
// This is NOT a marketplace and NOT a price list. It answers three
// questions for the operator: what is my license, what is included in the
// OPSQAI platform, and which OPSQAI Products / add-ons are entitled to this
// installation. Purchasing conversations happen with OPSQAI, not here.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLicense } from "@/lib/license";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import {
  ADDON_CATALOG,
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  getCompanyProfile,
  resolveEffectiveConfig,
} from "@/lib/product-architecture";
import { LicenseActivationPanel } from "@/components/app/license-activation-panel";
import { createInternalRequest } from "@/lib/internal-requests.functions";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Lock, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

  const products = PRODUCT_CATALOG.filter(
    (p) => granted.has(p.key) || p.status === "available" || license.unlimited,
  );
  const profile = getCompanyProfile(license.profile);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const createReq = useServerFn(createInternalRequest);

  const target =
    [...PRODUCT_CATALOG, ...ADDON_CATALOG].find((m) => m.key === openKey) ?? null;

  async function submit() {
    if (!target) return;
    setBusy(true);
    try {
      await createReq({
        data: {
          title: `Entitlement request: ${target.label}`,
          description: note || `Request to enable: ${target.label}`,
          category: "billing",
          priority: "normal",
        },
      });
      toast.success("Request sent. OPSQAI will follow up.");
      setOpenKey(null);
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

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
      {/* Installation license */}
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

      {/* Self-Hosted activates licenses locally — paste the JWT / bundle here. */}
      {selfhost && (
        <div className="my-6">
          <LicenseActivationPanel onActivated={() => window.location.reload()} />
        </div>
      )}

      <Panel glass bodyClassName="flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          OPSQAI platform capabilities are part of every installation and are never purchased
          separately — access to them is governed by roles and permissions. Products and add-ons are
          explicit entitlements distributed through your license.
        </div>
      </Panel>

      {/* Core platform capabilities */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Included OPSQAI platform
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
            const on = license.unlimited || granted.has(p.key);
            return (
              <Card key={p.key} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-sm font-semibold">{p.label}</div>
                      <Badge variant={on ? "default" : "outline"} className="text-[10px]">
                        {on ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 h-3 w-3" />
                            Not entitled
                          </>
                        )}
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
                {!on && (
                  <div className="border-t border-border pt-2">
                    <Button size="sm" variant="outline" onClick={() => setOpenKey(p.key)}>
                      Ask OPSQAI about {p.label}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Availability depends on your company profile ({profile.label} by default). OPSQAI enables
          products explicitly; they then arrive with your license.
        </p>
      </section>

      {/* Optional add-ons */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Optional add-ons
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ADDON_CATALOG.map((a) => {
            const on = license.unlimited || granted.has(a.key);
            return (
              <Card key={a.key} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-sm font-semibold">{a.label}</div>
                      <Badge variant={on ? "default" : "outline"} className="text-[10px]">
                        {on ? "Enabled" : "Not entitled"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </div>
                {!on && (
                  <div className="border-t border-border pt-2">
                    <Button size="sm" variant="outline" onClick={() => setOpenKey(a.key)}>
                      Request activation
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {target?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We will forward this to your OPSQAI account manager and issue the entitlement once
              approved.
            </p>
            <div>
              <Label>Additional context (optional)</Label>
              <Textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Seats, timeline, business reason…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenKey(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

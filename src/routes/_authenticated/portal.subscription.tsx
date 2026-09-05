import { ModulePage } from "@/components/app/module-page";
import {
  CORE_CAPABILITIES,
  classify,
  getAddon,
  getProduct,
} from "@/lib/product-architecture";
import { usePortalEntitlementsCopy } from "@/i18n/pages/portal-entitlements";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/subscription")({
  component: PortalSubscription,
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function MaintenanceRing({ daysLeft, totalDays = 365 }: { daysLeft: number; totalDays?: number }) {
  const clamped = Math.max(0, Math.min(daysLeft, totalDays));
  const pct = clamped / totalDays;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const stroke =
    daysLeft <= 0
      ? "var(--destructive)"
      : daysLeft < 30
        ? "var(--warning)"
        : "var(--primary)";
  return (
    <div className="relative shrink-0" style={{ width: 104, height: 104 }}>
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-display font-semibold tabular-nums leading-none">
          {daysLeft <= 0 ? "0" : daysLeft}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {daysLeft <= 0 ? "expired" : "days left"}
        </div>
      </div>
    </div>
  );
}

function PortalSubscription() {
  const c = usePortalEntitlementsCopy();
  const fn = useServerFn(getMyPortalOverview);
  const { data } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });

  const installs = data?.installs ?? [];

  const statusLabel = (e: { revoked: boolean; suspended?: boolean | null }) =>
    e.revoked ? c.revoked : e.suspended ? c.suspended : c.active;

  return (
    <ModulePage
      eyebrow={c.eyebrow}
      title={c.title}
      description={c.description}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/portal/support">{c.contactCta}</Link>
        </Button>
      }
    >
      {installs.length === 0 ? (
        <EmptyState icon={Inbox} title={c.emptyTitle} description={c.emptyBody} />
      ) : (
        installs.map((inst) => {
          const days = daysUntil(inst.install_license?.maintenance_expires_at);
          const active = inst.module_licenses.filter((m) => !m.revoked && !m.suspended);
          const products = active.filter((m) => classify(m.module_key) === "product");
          const addons = active.filter((m) => classify(m.module_key) !== "product");
          return (
            <Card key={inst.install_id} className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-5 items-center min-w-0">
                  {days !== null && <MaintenanceRing daysLeft={days} />}
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {c.install}
                    </div>
                    <div className="font-mono text-sm truncate">{inst.install_id}</div>
                    <div className="text-base font-medium mt-0.5">{inst.company_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {c.maintenanceUntil} {fmt(inst.install_license?.maintenance_expires_at)}
                    </div>
                  </div>
                </div>
                <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
                  {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
                </Badge>
              </div>

              {/* LICENSE */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  {c.license}
                </div>
                {inst.install_license ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm rounded-lg border border-border bg-muted/20 p-4">
                    <div>
                      <div className="text-muted-foreground text-xs">{c.seats}</div>
                      <div className="font-medium tabular-nums">
                        {inst.install_license.seats ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{c.maintenanceUntil}</div>
                      <div className="font-medium">
                        {fmt(inst.install_license.maintenance_expires_at)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{c.expires}</div>
                      <div className="font-medium">{fmt(inst.install_license.expires_at)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{c.status}</div>
                      <div className="font-medium">{statusLabel(inst.install_license)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{c.licenseNotIssued}</div>
                )}
              </section>

              {/* CORE PLATFORM — included, read-only */}
              <section>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.coreTitle}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {c.coreSubtitle}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CORE_CAPABILITIES.filter((cap) => cap.key !== "bilingual_ui").map((cap) => (
                    <span
                      key={cap.key}
                      className="rounded-md border border-border bg-muted/20 px-2 py-1 text-xs"
                    >
                      {cap.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{c.coreNote}</p>
              </section>

              {/* YOUR PRODUCTS */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  {c.productsTitle}
                </div>
                {products.length ? (
                  <div className="rounded-lg border border-border divide-y divide-border text-sm overflow-hidden">
                    {products.map((m) => (
                      <div
                        key={m.module_key}
                        className="px-3 py-2 flex items-center justify-between flex-wrap gap-2"
                      >
                        <span className="text-xs">{entitlementLabel(m.module_key)}</span>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {c.maintenanceUntil} {fmt(m.maintenance_expires_at)}
                          </span>
                          <span>
                            {c.expires} {fmt(m.expires_at)}
                          </span>
                          <span className="text-emerald-600 font-medium">{c.active}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{c.productsEmpty}</div>
                )}
              </section>

              {/* OPTIONAL ADD-ONS */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  {c.addonsTitle}
                </div>
                {addons.length ? (
                  <div className="rounded-lg border border-border divide-y divide-border text-sm overflow-hidden">
                    {addons.map((m) => (
                      <div
                        key={m.module_key}
                        className="px-3 py-2 flex items-center justify-between flex-wrap gap-2"
                      >
                        <span className="text-xs">{entitlementLabel(m.module_key)}</span>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {c.expires} {fmt(m.expires_at)}
                          </span>
                          <span className="text-emerald-600 font-medium">{c.active}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{c.addonsEmpty}</div>
                )}
              </section>
            </Card>
          );
        })
      )}
    </ModulePage>
  );
}

// Entitlement keys are technical; show the product / add-on name when known.
function entitlementLabel(key: string): string {
  return getProduct(key)?.label ?? getAddon(key)?.label ?? key;
}

import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck, Building2, Users, BarChart3, ScrollText, HardDrive,
  Activity, Cpu, Mail, ListChecks, Flag, Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ComponentType, SVGProps } from "react";

export const Route = createFileRoute("/_authenticated/app/admin/platform")({
  component: PlatformAdminLanding,
});

type Tile = {
  to?: string;
  href?: string;
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  status?: "live" | "soon";
};

const MODULES: Array<Tile> = [
  { to: "/app/admin/companies", title: "Companies", desc: "Create, suspend, restore and inspect every tenant.", icon: Building2, status: "live" },
  { to: "/app/admin/platform-admins", title: "Platform Super Admins", desc: "Grant and revoke unrestricted platform access.", icon: ShieldCheck, status: "live" },
  { to: "/app/admin/users", title: "Global Users", desc: "Browse and manage every user across all companies.", icon: Users, status: "live" },
  { to: "/app/admin/analytics", title: "Platform Analytics", desc: "Cross-tenant usage, AI confidence and adoption KPIs.", icon: BarChart3, status: "live" },
  { to: "/app/admin/audit", title: "Platform Audit Log", desc: "Every question and answer, with sources.", icon: ScrollText, status: "live" },
  { title: "Subscriptions & Billing", desc: "Plan management, invoices and overage tracking.", icon: HardDrive, status: "soon" },
  { title: "Storage Usage", desc: "Per-tenant storage consumption and quotas.", icon: HardDrive, status: "soon" },
  { title: "Feature Flags", desc: "Roll out modules to selected tenants or cohorts.", icon: Flag, status: "soon" },
  { title: "AI Configuration", desc: "Model selection, prompt limits and provider keys.", icon: Cpu, status: "soon" },
  { title: "Email Queue", desc: "Inspect, retry and clear queued transactional emails.", icon: Mail, status: "soon" },
  { title: "Background Jobs", desc: "Workers, retries and dead-letter inspection.", icon: ListChecks, status: "soon" },
  { title: "Scheduled / Cron Jobs", desc: "Quarterly reports, outdated-knowledge sweeps, cleanups.", icon: Activity, status: "soon" },
  { title: "System Health", desc: "Database, storage and AI gateway availability.", icon: Activity, status: "soon" },
  { title: "Platform Settings", desc: "Branding, domains, defaults and policies.", icon: Settings, status: "soon" },
];

function PlatformAdminLanding() {
  const { isPlatformAdmin, isPlatformOwner } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner) throw redirect({ to: "/app" });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 max-w-6xl">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider text-[10px] font-medium">
            {isPlatformOwner ? "Platform Owner" : "Platform Super Admin"}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Platform Administration</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Govern every tenant, role and platform-wide setting. Platform Owner permissions
          bypass every company restriction and cannot be removed by any deployment or migration.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const body = (
            <Card className="p-5 h-full hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{m.title}</h3>
                    {m.status === "soon" && (
                      <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </Card>
          );
          if (m.to) return <Link key={m.title} to={m.to}>{body}</Link>;
          return <div key={m.title} className="opacity-70 cursor-not-allowed">{body}</div>;
        })}
      </div>
    </div>
  );
}

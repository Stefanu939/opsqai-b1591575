import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck, Building2, Users, BarChart3, ScrollText, Mail, Inbox, Sparkles, FileText, Plug,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ComponentType, SVGProps } from "react";

export const Route = createFileRoute("/_authenticated/app/admin/platform")({
  component: PlatformAdminLanding,
});

type Tile = {
  to: string;
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Only modules that deliver immediate enterprise value are exposed here.
// Speculative/dev-only tooling (feature flags, background jobs, cron, storage
// quotas, subscription editor, prompt limits) is intentionally hidden until
// it is production-ready — a clean surface beats a cluttered "coming soon" page.
const MODULES: Array<Tile> = [
  { to: "/app/admin/companies", title: "Companies", desc: "Create, suspend, restore and inspect every tenant.", icon: Building2 },
  { to: "/app/admin/platform-admins", title: "Platform Super Admins", desc: "Grant and revoke unrestricted platform access.", icon: ShieldCheck },
  { to: "/app/admin/users", title: "Global Users", desc: "Browse and manage every user across all companies.", icon: Users },
  { to: "/app/admin/analytics", title: "Platform Analytics", desc: "Cross-tenant usage, AI confidence and adoption KPIs.", icon: BarChart3 },
  { to: "/app/admin/audit", title: "Platform Audit Log", desc: "Every question and answer, with sources.", icon: ScrollText },
  { to: "/app/admin/customers", title: "Enterprise Documents", desc: "Contracts, DPAs and per-tenant documentation.", icon: FileText },
  { to: "/app/admin/support", title: "Support Inbox", desc: "Centralised support requests from every tenant.", icon: Inbox },
  { to: "/app/admin/email", title: "Email Settings", desc: "Custom domain, DKIM/SPF and outbound configuration.", icon: Mail },
  { to: "/app/admin/email-logs", title: "Email Logs", desc: "Inspect delivery, bounces and unsubscribe activity.", icon: ScrollText },
  { to: "/app/brand", title: "Brand Center", desc: "Logos, tokens and marketing assets governance.", icon: Sparkles },
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
        {MODULES.map((m) => (
          <Link key={m.title} to={m.to}>
            <Card className="p-5 h-full hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm">{m.title}</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plug, Search, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  INTEGRATIONS, CATEGORY_ORDER, CATEGORY_LABEL,
  type IntegrationDef,
} from "@/lib/integrations-catalog";

export const Route = createFileRoute("/_authenticated/app/admin/integrations")({
  component: IntegrationsHub,
});

type IntegrationRow = { provider: string; status: string };

function IntegrationsHub() {
  const { isPlatformAdmin, isPlatformOwner, hasRole, activeCompanyId } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner && !hasRole("admin")) {
    throw redirect({ to: "/app" });
  }

  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!activeCompanyId) return;
    supabase
      .from("company_integrations")
      .select("provider, status")
      .eq("company_id", activeCompanyId)
      .then(({ data }) => setRows((data ?? []) as IntegrationRow[]));
  }, [activeCompanyId]);

  const statusByProvider = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.provider, r.status);
    return m;
  }, [rows]);

  const connectedCount = rows.filter((r) => r.status === "connected").length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return INTEGRATIONS;
    return INTEGRATIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.vendor.toLowerCase().includes(needle) ||
        i.summary.toLowerCase().includes(needle),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, IntegrationDef[]>();
    for (const it of filtered) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-6xl mx-auto w-full">
      {/* Back link for mobile hierarchy */}
      <Link
        to="/app/admin/platform"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Platform Administration
      </Link>

      {/* Header — mobile-first: stacked, no cramped inline widgets */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
          <Plug className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider text-[10px] font-medium">Integrations</span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Integrations</h1>
          <span className="text-sm text-muted-foreground">
            {connectedCount} connected · {INTEGRATIONS.length} available
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Connect OPSQAI to the tools your teams already use. Everything is scoped per-tenant, audited,
          and revocable at any time.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search integrations…"
          className="pl-9 h-11"
        />
      </div>

      {/* Grouped grid */}
      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat} className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => (
                  <IntegrationCard
                    key={it.provider}
                    def={it}
                    status={statusByProvider.get(it.provider)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No integrations match “{q}”.
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationCard({ def, status }: { def: IntegrationDef; status?: string }) {
  const connected = status === "connected";
  const hasError = status === "error";
  return (
    <Link
      to="/app/admin/integrations/$provider"
      params={{ provider: def.provider }}
      className="group block"
    >
      <Card className="h-full p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 shrink-0 rounded-lg border grid place-items-center ${def.accent}`}
          >
            <def.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{def.name}</h3>
              {connected && (
                <Badge variant="outline" className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
              )}
              {hasError && (
                <Badge variant="outline" className="h-5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
                  Attention
                </Badge>
              )}
              {!connected && !hasError && def.hint === "beta" && (
                <Badge variant="outline" className="h-5 border-blue-500/30 bg-blue-500/10 text-blue-500 text-[10px]">
                  Beta
                </Badge>
              )}
              {!connected && !hasError && def.hint === "roadmap" && (
                <Badge variant="outline" className="h-5 border-muted-foreground/20 text-muted-foreground text-[10px]">
                  Roadmap
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{def.vendor}</p>
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
              {def.summary}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

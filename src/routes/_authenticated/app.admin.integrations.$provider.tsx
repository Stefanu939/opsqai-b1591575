import { createFileRoute, redirect, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, ExternalLink, Loader2, Power, ShieldCheck, Info,
} from "lucide-react";
import { findIntegration } from "@/lib/integrations-catalog";

export const Route = createFileRoute("/_authenticated/app/admin/integrations/$provider")({
  component: IntegrationDetail,
  loader: ({ params }) => {
    const def = findIntegration(params.provider);
    if (!def) throw notFound();
    return { def };
  },
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">
      Integration not found.{" "}
      <Link to="/app/admin/integrations" className="text-primary underline">
        Back to integrations
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Error: {error.message}</div>
  ),
});

type IntegrationRow = {
  id: string;
  status: string;
  connected_at: string | null;
  last_error: string | null;
};

function IntegrationDetail() {
  const { def } = Route.useLoaderData();
  const { isPlatformAdmin, isPlatformOwner, isAdmin, activeCompanyId, user } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner && !isAdmin) {
    throw redirect({ to: "/app" });
  }

  const [row, setRow] = useState<IntegrationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    setLoading(true);
    supabase
      .from("company_integrations")
      .select("id, status, connected_at, last_error")
      .eq("company_id", activeCompanyId)
      .eq("provider", def.provider)
      .maybeSingle()
      .then(({ data }) => {
        setRow((data as IntegrationRow | null) ?? null);
        setLoading(false);
      });
  }, [activeCompanyId, def.provider]);

  const connected = row?.status === "connected";
  const isRoadmap = def.hint === "roadmap";

  async function connect() {
    if (!activeCompanyId || !user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("company_integrations")
      .upsert(
        {
          company_id: activeCompanyId,
          provider: def.provider,
          status: "connected",
          connected_at: new Date().toISOString(),
          connected_by: user.id,
          last_error: null,
        },
        { onConflict: "company_id,provider" },
      )
      .select("id, status, connected_at, last_error")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRow(data as IntegrationRow);
    toast.success(`${def.name} enabled`);
  }

  async function disconnect() {
    if (!activeCompanyId) return;
    setBusy(true);
    const { error } = await supabase
      .from("company_integrations")
      .update({ status: "disconnected", last_error: null })
      .eq("company_id", activeCompanyId)
      .eq("provider", def.provider);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRow((r) => (r ? { ...r, status: "disconnected" } : r));
    toast.success(`${def.name} disabled`);
  }

  async function requestAccess() {
    if (!activeCompanyId || !user) return;
    setBusy(true);
    const { error } = await supabase.from("company_integrations").upsert(
      {
        company_id: activeCompanyId,
        provider: def.provider,
        status: "pending",
        connected_by: user.id,
      },
      { onConflict: "company_id,provider" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRow((r) => ({
      id: r?.id ?? "",
      status: "pending",
      connected_at: null,
      last_error: null,
    }));
    toast.success("Interest registered — our team will reach out.");
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-4xl mx-auto w-full">
      <Link
        to="/app/admin/integrations"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All integrations
      </Link>

      {/* Hero — mobile-first grid layout, icon shrinks, title truncates */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
        <div className={`h-14 w-14 shrink-0 rounded-2xl border grid place-items-center ${def.accent}`}>
          <def.icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{def.vendor}</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight truncate">
            {def.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {connected ? (
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            ) : row?.status === "pending" ? (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Pending activation
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
            {def.hint === "beta" && (
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-500">
                Beta
              </Badge>
            )}
            {def.hint === "roadmap" && (
              <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">
                Roadmap
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Description */}
      <Card className="p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{def.description}</p>
      </Card>

      {/* Self-service setup shortcut for SSO providers */}
      {(def.provider === "microsoft-sso" || def.provider === "saml-sso") && (
        <Card className="p-5 sm:p-6 space-y-3 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Self-service configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure SSO for your company: paste your IdP metadata URL, list the email domains, and we'll activate it. All Service Provider endpoints (ACS URL, Entity ID) are provided.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/app/admin/sso-setup">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open SSO setup
            </Link>
          </Button>
        </Card>
      )}

      {/* Live notifications setup for Slack / Teams */}
      {(def.provider === "slack" || def.provider === "teams") && (
        <Card className="p-5 sm:p-6 space-y-3 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Live notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste your incoming-webhook URL and pick which OPSQAI events forward to your channel. No IT ticket required — {def.name} setup takes under two minutes.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link
              to="/app/admin/notifications/$provider"
              params={{ provider: def.provider }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Configure {def.name} notifications
            </Link>
          </Button>
        </Card>
      )}





      {/* Actions — sticky-feel row, full-width on mobile, inline on desktop */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Connection</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
          </div>
        ) : isRoadmap ? (
          <div className="space-y-3">
            <div className="flex gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                This integration is on our roadmap. Register your interest and we'll notify you when it
                ships — enterprise customers can request priority delivery.
              </p>
            </div>
            <Button
              onClick={requestAccess}
              disabled={busy || row?.status === "pending"}
              className="w-full sm:w-auto"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {row?.status === "pending" ? "Interest registered" : "Request early access"}
            </Button>
          </div>
        ) : connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connected
              {row?.connected_at ? ` on ${new Date(row.connected_at).toLocaleDateString()}` : ""}.
              Disabling will not delete data already imported.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={disconnect}
                disabled={busy}
                className="w-full sm:w-auto"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                Disable integration
              </Button>
              {def.provider === "webhooks" ? (
                <Button asChild variant="default" className="w-full sm:w-auto">
                  <Link to="/app/admin/webhooks">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage endpoints
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" className="w-full sm:w-auto" disabled>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage configuration
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enabling {def.name} will register the integration for this workspace. Configuration steps
              (redirect URIs, OAuth consent, IdP metadata) are guided from the manage screen.
            </p>
            <Button onClick={connect} disabled={busy} className="w-full sm:w-auto">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enable {def.name}
            </Button>
          </div>
        )}

        {row?.last_error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3 border border-destructive/20">
            Last error: {row.last_error}
          </div>
        )}
      </Card>

      {/* Compliance footer */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        All integrations are scoped to the active company, changes are audit-logged, and credentials
        are stored server-side. Only company admins and platform admins can modify connection state.
      </p>
    </div>
  );
}

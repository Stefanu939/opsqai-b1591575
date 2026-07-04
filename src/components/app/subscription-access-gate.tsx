import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert, XCircle, Lock, CreditCard, Mail, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type State = {
  company_id: string;
  name: string;
  subscription_status: string;
  grace_period_ends_at: string | null;
  trial_ends_at: string | null;
  renewal_date: string | null;
  is_read_only: boolean;
} | null;

const BLOCKED_STATUSES = new Set(["suspended", "cancelled"]);

/**
 * Blocks interactive modules (chat, workspace, generators) for suspended /
 * cancelled workspaces with an enterprise-grade billing notice.
 * Platform admins always retain access.
 */
export function SubscriptionAccessGate({
  children,
  feature = "this feature",
}: {
  children: ReactNode;
  feature?: string;
}) {
  const { session, scopeCompanyId, isPlatformAdmin } = useAuth();
  const [state, setState] = useState<State>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session?.user || !scopeCompanyId) {
      setState(null);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    supabase
      .rpc("get_subscription_state", { _company: scopeCompanyId })
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setState((data as unknown as State) ?? null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, scopeCompanyId]);

  if (!loaded) return <>{children}</>;
  if (isPlatformAdmin) return <>{children}</>;
  if (!state || !BLOCKED_STATUSES.has(state.subscription_status)) return <>{children}</>;

  const isCancelled = state.subscription_status === "cancelled";

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="border-b border-border bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent px-6 py-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              {isCancelled ? <XCircle className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                {isCancelled ? "Subscription cancelled" : "Workspace suspended"}
              </div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">
                {state.name}
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 md:py-8 space-y-6">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm md:text-base text-foreground leading-relaxed">
                Access to <span className="font-medium">{feature}</span> is currently restricted.{" "}
                {isCancelled
                  ? "Your subscription has been cancelled, so interactive modules — chat, AI assistants, generators and workspace tools — are no longer available."
                  : "Your workspace has been suspended for non-payment. Interactive modules — chat, AI assistants, generators and workspace tools — are paused until the subscription is brought back into good standing."}{" "}
                Historical data remains preserved and can be reviewed in read-only mode from the dashboard.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                What to do next
              </div>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">1</span>
                  <span>Settle any outstanding invoices to restore your subscription.</span>
                </li>
                <li className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">2</span>
                  <span>Once payment is confirmed, access is reactivated automatically — no data is lost.</span>
                </li>
                <li className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">3</span>
                  <span>Need assistance or a billing dispute review? Contact our support team.</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/app/settings">
                  <CreditCard className="h-4 w-4" />
                  Manage billing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href="mailto:billing@opsqai.de?subject=Subscription%20reactivation%20request">
                  <Mail className="h-4 w-4" />
                  Contact billing
                </a>
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground border-t border-border pt-4">
              Reference: workspace <span className="font-mono">{state.company_id.slice(0, 8)}</span> · status{" "}
              <span className="font-medium uppercase">{state.subscription_status.replace("_", " ")}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";

type State = {
  company_id: string;
  name: string;
  subscription_status: string;
  grace_period_ends_at: string | null;
  trial_ends_at: string | null;
  renewal_date: string | null;
  is_read_only: boolean;
} | null;

/** Realtime-lite banner: warns admins & users when the workspace is in grace, suspended or cancelled. */
export function SubscriptionStatusBanner() {
  const { session, scopeCompanyId, isPlatformAdmin } = useAuth();
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    if (!session?.user || !scopeCompanyId) {
      setState(null);
      return;
    }
    let cancelled = false;
    supabase
      .rpc("get_subscription_state", { _company: scopeCompanyId })
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setState((data as unknown as State) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, scopeCompanyId]);

  if (!state) return null;
  const status = state.subscription_status;

  // Nothing to show when active/trial and no key dates are near.
  const trialLeft = state.trial_ends_at ? daysUntil(state.trial_ends_at) : null;
  const renewalLeft = state.renewal_date ? daysUntil(state.renewal_date) : null;
  const graceLeft = state.grace_period_ends_at ? daysUntil(state.grace_period_ends_at) : null;

  const showTrialNudge = status === "trial" && trialLeft !== null && trialLeft <= 7;
  const showRenewalNudge = status === "active" && renewalLeft !== null && renewalLeft <= 7;

  if (status === "active" && !showRenewalNudge) return null;
  if (status === "trial" && !showTrialNudge) return null;

  const tone =
    status === "suspended" || status === "cancelled"
      ? "danger"
      : status === "grace_period"
        ? "warning"
        : "info";

  const cls =
    tone === "danger"
      ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
      : tone === "warning"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
        : "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300";

  const Icon =
    status === "suspended"
      ? ShieldAlert
      : status === "cancelled"
        ? XCircle
        : status === "grace_period"
          ? Clock
          : AlertTriangle;

  return (
    <div className={`border-b px-4 py-2.5 text-xs md:text-sm flex items-center gap-3 ${cls}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {status === "suspended" && "Workspace suspended — read-only access only."}
          {status === "cancelled" && "Subscription cancelled — workspace is read-only."}
          {status === "grace_period" &&
            graceLeft !== null &&
            graceLeft > 0 &&
            `Grace period active — ${graceLeft} day${graceLeft === 1 ? "" : "s"} left before suspension.`}
          {status === "grace_period" &&
            (graceLeft === null || graceLeft <= 0) &&
            "Grace period ending — workspace will be suspended shortly."}
          {showTrialNudge && `Trial ends in ${trialLeft} day${trialLeft === 1 ? "" : "s"}.`}
          {showRenewalNudge &&
            `Subscription renews in ${renewalLeft} day${renewalLeft === 1 ? "" : "s"}.`}
        </span>
      </div>
      <Link
        to="/app/subscription"
        className="underline underline-offset-2 whitespace-nowrap font-medium"
      >
        Manage subscription
      </Link>
    </div>
  );
}

function daysUntil(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

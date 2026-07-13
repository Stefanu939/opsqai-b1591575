/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listWorkspaceLifecycle,
  listSubscriptionEvents,
  changeSubscriptionStatus,
  adjustGracePeriod,
  updateRenewalDate,
  setBillingOverride,
  setInternalNotes,
  recordPayment,
  runLifecycleTick,
  setGracePeriodDays,
} from "@/lib/subscription-lifecycle.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Wallet,
  CalendarClock,
  FileText,
  Sparkles,
  Ban,
  ChevronRight,
  History,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/subscriptions")({
  beforeLoad: ({ context }: any) => {
    const a = context?.auth;
    if (a && !(a.isPlatformAdmin || a.isPlatformOwner)) throw redirect({ to: "/app" });
  },
  component: SubscriptionsPage,
});

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  trial: { label: "Trial", tone: "bg-sky-500/10 text-sky-600 border-sky-500/30", icon: Sparkles },
  active: {
    label: "Active",
    tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: ShieldCheck,
  },
  grace_period: {
    label: "Grace Period",
    tone: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    tone: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: Ban,
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-neutral-500/10 text-neutral-600 border-neutral-500/30",
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${meta.tone}`}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}
function daysUntil(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function SubscriptionsPage() {
  const { isPlatformAdmin, isPlatformOwner } = useAuth();
  const allowed = isPlatformAdmin || isPlatformOwner;
  const qc = useQueryClient();

  const list = useServerFn(listWorkspaceLifecycle);
  const tick = useServerFn(runLifecycleTick);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-lifecycle"],
    queryFn: () => list({ data: {} } as never),
    enabled: allowed,
  });

  const tickMut = useMutation({
    mutationFn: () => tick({ data: {} } as never),
    onSuccess: (res: any) => {
      toast.success(
        `Automation tick complete · ${res.suspended} suspended · ${res.reactivated} reactivated`,
      );
      qc.invalidateQueries({ queryKey: ["subscription-lifecycle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const companies = (data?.companies ?? []) as any[];
  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (statusFilter !== "all" && c.subscription_status !== statusFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [companies, q, statusFilter]);

  const counts = useMemo(() => {
    const c = { trial: 0, active: 0, grace_period: 0, suspended: 0, cancelled: 0 } as Record<
      string,
      number
    >;
    for (const co of companies) c[co.subscription_status] = (c[co.subscription_status] ?? 0) + 1;
    return c;
  }, [companies]);

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Platform administrator access required.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-7xl w-full">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">
            Platform
          </p>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Subscription Lifecycle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated trial, grace period, suspension and reactivation — with full manual overrides.
          </p>
        </div>
        <Button onClick={() => tickMut.mutate()} disabled={tickMut.isPending} variant="outline">
          {tickMut.isPending ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Run automation now
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["trial", "active", "grace_period", "suspended", "cancelled"] as const).map((k) => {
          const meta = STATUS_META[k];
          const Icon = meta.icon;
          return (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{counts[k] ?? 0}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search company"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="grace_period">Grace period</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Trial ends</th>
                <th className="px-4 py-3 font-medium">Renewal</th>
                <th className="px-4 py-3 font-medium">Grace ends</th>
                <th className="px-4 py-3 font-medium">Override</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.subscription_status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.trial_ends_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.renewal_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.grace_period_ends_at ? (
                      <span>
                        {formatDate(c.grace_period_ends_at)}{" "}
                        <span className="text-[10px]">({daysUntil(c.grace_period_ends_at)}d)</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.billing_override ? (
                      <Badge variant="secondary">Bypass on</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 inline text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && !filtered.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No workspaces match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <LifecycleDialog company={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog with all admin actions
// ---------------------------------------------------------------------------

function LifecycleDialog({ company, onClose }: { company: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const listEvents = useServerFn(listSubscriptionEvents);
  const change = useServerFn(changeSubscriptionStatus);
  const adjustGrace = useServerFn(adjustGracePeriod);
  const updateRenewal = useServerFn(updateRenewalDate);
  const setOverride = useServerFn(setBillingOverride);
  const setNotes = useServerFn(setInternalNotes);
  const recPayment = useServerFn(recordPayment);
  const setGraceDays = useServerFn(setGracePeriodDays);

  const [reason, setReason] = useState("");
  const [notes, setNotesState] = useState<string>("");
  const [renewal, setRenewal] = useState<string>("");
  const [invoiceDue, setInvoiceDue] = useState<string>("");
  const [graceDays, setGraceDaysState] = useState<number>(14);

  const events = useQuery({
    queryKey: ["subscription-events", company?.id],
    queryFn: () => listEvents({ data: { company_id: company!.id } }),
    enabled: !!company,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subscription-lifecycle"] });
    qc.invalidateQueries({ queryKey: ["subscription-events", company?.id] });
  };

  const action = <T = void,>(fn: (v: T) => Promise<any>, ok: string) =>
    useMutation<any, Error, T>({
      mutationFn: fn as any,
      onSuccess: () => {
        toast.success(ok);
        refresh();
      },
      onError: (e: Error) => toast.error(e.message),
    });

  const changeMut = action(
    async (to_status: string) =>
      change({ data: { company_id: company!.id, to_status: to_status as any, reason } }),
    "Status updated",
  );
  const graceExtendMut = action(
    async (days: number) =>
      adjustGrace({ data: { company_id: company!.id, add_days: days, reason } }),
    "Grace period adjusted",
  );
  const overrideMut = action(
    async (enabled: boolean) => setOverride({ data: { company_id: company!.id, enabled, reason } }),
    "Billing override updated",
  );
  const paymentMut = action(
    async () => recPayment({ data: { company_id: company!.id, reactivate: true, reason } }),
    "Payment recorded",
  );
  const renewalMut = action(
    async () =>
      updateRenewal({
        data: {
          company_id: company!.id,
          renewal_date: renewal ? new Date(renewal).toISOString() : null,
          next_invoice_due_at: invoiceDue ? new Date(invoiceDue).toISOString() : null,
          reason,
        },
      }),
    "Renewal updated",
  );
  const notesMut = action(
    async () => setNotes({ data: { company_id: company!.id, notes: notes || null } }),
    "Notes saved",
  );
  const graceDaysMut = action(
    async () => setGraceDays({ data: { company_id: company!.id, days: graceDays } }),
    "Grace length updated",
  );

  return (
    <Dialog
      open={!!company}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-4xl">
        {company && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>{company.name}</span>
                <StatusBadge status={company.subscription_status} />
                {company.billing_override && <Badge variant="secondary">Override active</Badge>}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manual status controls */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Manual controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("active")}
                      disabled={changeMut.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" /> Activate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("suspended")}
                      disabled={changeMut.isPending}
                    >
                      <Pause className="h-4 w-4 mr-1" /> Suspend
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("grace_period")}
                      disabled={changeMut.isPending}
                    >
                      <Clock className="h-4 w-4 mr-1" /> Start grace
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("trial")}
                      disabled={changeMut.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-1" /> Set trial
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("cancelled")}
                      disabled={changeMut.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeMut.mutate("active")}
                      disabled={company.subscription_status !== "suspended" || changeMut.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Reactivate
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Label className="text-xs">Reason (goes to audit log)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Retention hold; goodwill extension"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Grace period */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Grace period
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Ends:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(company.grace_period_ends_at)}
                    </span>
                    {company.grace_period_ends_at ? (
                      <> · {daysUntil(company.grace_period_ends_at)} days left</>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button size="sm" variant="outline" onClick={() => graceExtendMut.mutate(-3)}>
                      -3d
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => graceExtendMut.mutate(-1)}>
                      -1d
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => graceExtendMut.mutate(3)}>
                      +3d
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => graceExtendMut.mutate(7)}>
                      +7d
                    </Button>
                  </div>
                  <div className="pt-2 border-t space-y-2">
                    <Label className="text-xs">Default grace length (days)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={90}
                        value={graceDays}
                        onChange={(e) => setGraceDaysState(Number(e.target.value))}
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => graceDaysMut.mutate()}
                        disabled={graceDaysMut.isPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing / renewal */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" /> Renewal &amp; billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Renewal:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(company.renewal_date)}
                    </span>
                    <br />
                    Invoice due:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(company.next_invoice_due_at)}
                    </span>
                    <br />
                    Last payment:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(company.last_payment_at)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Renewal date</Label>
                      <Input
                        type="date"
                        value={renewal}
                        onChange={(e) => setRenewal(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Next invoice due</Label>
                      <Input
                        type="date"
                        value={invoiceDue}
                        onChange={(e) => setInvoiceDue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => renewalMut.mutate()}
                      disabled={renewalMut.isPending}
                    >
                      Save dates
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => paymentMut.mutate()}
                      disabled={paymentMut.isPending}
                    >
                      <Wallet className="h-4 w-4 mr-1" /> Record payment &amp; reactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Override + notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Override &amp; notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      Billing override{" "}
                      <span className="text-muted-foreground">(bypass suspension)</span>
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={company.billing_override ? "default" : "outline"}
                        onClick={() => overrideMut.mutate(true)}
                      >
                        On
                      </Button>
                      <Button
                        size="sm"
                        variant={!company.billing_override ? "default" : "outline"}
                        onClick={() => overrideMut.mutate(false)}
                      >
                        Off
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Internal notes</Label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotesState(e.target.value)}
                      placeholder={
                        company.internal_notes ??
                        "Add internal context — visible to platform admins only."
                      }
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={() => notesMut.mutate()}
                        disabled={notesMut.isPending}
                      >
                        Save notes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audit trail */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" /> Audit trail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Event</th>
                        <th className="px-3 py-2">From → To</th>
                        <th className="px-3 py-2">Actor</th>
                        <th className="px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(events.data?.events ?? []).map((e: any) => (
                        <tr key={e.id} className="border-t">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">{e.event_type.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2">
                            {e.from_status ?? "—"} → {e.to_status ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {e.actor_kind}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{e.reason ?? "—"}</td>
                        </tr>
                      ))}
                      {!events.data?.events?.length && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                            No events yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

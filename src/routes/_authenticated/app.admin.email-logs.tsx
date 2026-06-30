import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { listEmailLogs, listSuppressedEmails } from "@/lib/email/logs.functions";
import { Mail, RefreshCw, Inbox, AlertCircle, Ban, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/email-logs")({
  component: EmailLogsPage,
});

type Status = "sent" | "failed" | "dlq" | "suppressed" | "pending" | "bounced" | "complained";

type PresetKey = "24h" | "7d" | "30d" | "custom";

function presetRange(p: PresetKey, customStart?: string, customEnd?: string) {
  const now = new Date();
  if (p === "custom" && customStart && customEnd) {
    return { start: new Date(customStart).toISOString(), end: new Date(customEnd + "T23:59:59").toISOString() };
  }
  const ms = p === "24h" ? 24 * 3600e3 : p === "7d" ? 7 * 86400e3 : 30 * 86400e3;
  return { start: new Date(now.getTime() - ms).toISOString(), end: now.toISOString() };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    sent: { label: "Sent", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" },
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300" },
    dlq: { label: "Failed", className: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300" },
    failed: { label: "Failed", className: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300" },
    bounced: { label: "Bounced", className: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300" },
    suppressed: { label: "Suppressed", className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300" },
    complained: { label: "Complaint", className: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function EmailLogsPage() {
  const { isPlatformAdmin, isPlatformOwner } = useAuth();
  const [preset, setPreset] = useState<PresetKey>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [template, setTemplate] = useState<string>("__all");
  const [status, setStatus] = useState<string>("__all");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof listEmailLogs>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [suppressed, setSuppressed] = useState<Array<Record<string, unknown>>>([]);

  const range = useMemo(() => presetRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listEmailLogs({
        data: {
          start: range.start,
          end: range.end,
          template: template === "__all" ? null : template,
          status: status === "__all" ? null : (status as Status),
          limit: 50,
          offset: page * 50,
        },
      });
      setData(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlatformAdmin && !isPlatformOwner) return;
    void refresh();
    listSuppressedEmails().then((s) => setSuppressed(s as Array<Record<string, unknown>>)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStart, customEnd, template, status, page, isPlatformAdmin, isPlatformOwner]);

  if (!isPlatformAdmin && !isPlatformOwner) return <Navigate to="/app" />;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Email Logs</h1>
            <p className="text-sm text-muted-foreground">Delivery, suppressions and retries across the entire platform.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Time range</label>
            <div className="flex items-center gap-1">
              {(["24h", "7d", "30d", "custom"] as PresetKey[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={preset === p ? "default" : "outline"}
                  onClick={() => { setPreset(p); setPage(0); }}
                >
                  {p === "24h" ? "Last 24h" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "Custom"}
                </Button>
              ))}
            </div>
          </div>
          {preset === "custom" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(0); }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }} />
              </div>
            </>
          ) : null}
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Template</label>
            <Select value={template} onValueChange={(v) => { setTemplate(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All templates</SelectItem>
                {(data?.templates ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="dlq">Failed</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Inbox} label="Total" value={data?.stats.total ?? 0} />
        <StatCard icon={Mail} label="Sent" value={data?.stats.sent ?? 0} tone="success" />
        <StatCard icon={AlertCircle} label="Failed" value={data?.stats.failed ?? 0} tone="danger" />
        <StatCard icon={Ban} label="Suppressed" value={data?.stats.suppressed ?? 0} tone="warning" />
      </div>

      {/* Log table */}
      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">Sent emails (deduplicated)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Template</th>
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Sent</th>
                <th className="px-4 py-2.5">Error</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r) => (
                <tr key={r.message_id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{r.template_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.recipient_email}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400">{r.error_message ?? ""}</td>
                </tr>
              ))}
              {!loading && (data?.rows ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No emails in this range.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {data && data.total > 50 ? (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Suppression list */}
      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" /> Suppression list
          <span className="text-xs font-normal text-muted-foreground">({suppressed.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Added</th>
              </tr>
            </thead>
            <tbody>
              {suppressed.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{String(s.email ?? "")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{String(s.reason ?? s.type ?? "—")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.created_at ? new Date(String(s.created_at)).toLocaleString() : ""}</td>
                </tr>
              ))}
              {suppressed.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">No suppressed addresses.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: "success" | "danger" | "warning" }) {
  const tint =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "danger" ? "text-red-600 dark:text-red-400"
    : tone === "warning" ? "text-amber-600 dark:text-amber-400"
    : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tint}`}>{value}</div>
    </Card>
  );
}

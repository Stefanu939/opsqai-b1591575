import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { testWebhook, generateWebhookSecret, emitTestEvent } from "@/lib/webhooks.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Webhook, PlayCircle, Trash2, Copy, Loader2, CheckCircle2,
  XCircle, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/webhooks")({
  component: WebhooksPage,
});

const ALL_EVENTS = [
  { id: "chat.answered", label: "Chat — answered" },
  { id: "sop.published", label: "SOP — published" },
  { id: "sop.acknowledged", label: "SOP — acknowledged" },
  { id: "incident.opened", label: "Incident — opened" },
  { id: "incident.resolved", label: "Incident — resolved" },
  { id: "user.provisioned", label: "User — provisioned" },
  { id: "user.deprovisioned", label: "User — de-provisioned" },
  { id: "audit.exported", label: "Audit — exported" },
];

type Endpoint = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
};

type Delivery = {
  id: string;
  endpoint_id: string;
  event: string;
  status_code: number | null;
  ok: boolean;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
};

function WebhooksPage() {
  const { isPlatformAdmin, isPlatformOwner, isAdmin, activeCompanyId, user } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner && !isAdmin) throw redirect({ to: "/app" });

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [emitOpen, setEmitOpen] = useState(false);
  const [emitEvent, setEmitEvent] = useState("knowledge.published");
  const [emitting, setEmitting] = useState(false);

  const testFn = useServerFn(testWebhook);
  const genSecretFn = useServerFn(generateWebhookSecret) as unknown as () => Promise<{ secret: string }>;
  const emitFn = useServerFn(emitTestEvent);

  async function refresh() {
    if (!activeCompanyId) return;
    setLoading(true);
    const [{ data: eps }, { data: dls }] = await Promise.all([
      supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("webhook_deliveries")
        .select("id, endpoint_id, event, status_code, ok, latency_ms, error, created_at")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setEndpoints((eps ?? []) as Endpoint[]);
    setDeliveries((dls ?? []) as Delivery[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const res = await testFn({ data: { endpoint_id: id } });
      if (res.ok) {
        toast.success(`Delivered · HTTP ${res.statusCode} · ${res.latency_ms}ms`);
      } else {
        toast.error(`Failed · ${res.error ?? `HTTP ${res.statusCode}`}`);
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this webhook endpoint?")) return;
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Endpoint removed");
      refresh();
    }
  }

  async function toggleActive(ep: Endpoint) {
    const { error } = await supabase
      .from("webhook_endpoints")
      .update({ active: !ep.active })
      .eq("id", ep.id);
    if (error) toast.error(error.message);
    else refresh();
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-5xl mx-auto w-full">
      <Link
        to="/app/admin/integrations/$provider"
        params={{ provider: "webhooks" }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Outbound Webhooks
      </Link>

      {/* Header: mobile-first grid, no cramped inline widgets */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
        <div className="h-12 w-12 shrink-0 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 grid place-items-center">
          <Webhook className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Developer</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight">
            Webhook Endpoints
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Push OPSQAI events to any HTTPS endpoint. Payloads are HMAC-SHA256 signed.
          </p>
        </div>
      </header>

      {/* Add button — full-width on mobile */}
      <div className="flex">
        <CreateEndpointDialog
          open={createOpen}
          setOpen={setCreateOpen}
          companyId={activeCompanyId}
          userId={user?.id ?? null}
          genSecretFn={genSecretFn}
          onCreated={refresh}
        />
      </div>

      {/* Endpoints list */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Endpoints ({endpoints.length})
        </h2>

        {loading ? (
          <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </Card>
        ) : endpoints.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center">
              <Webhook className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No webhook endpoints yet. Add one to start receiving events.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <EndpointCard
                key={ep.id}
                ep={ep}
                testing={testingId === ep.id}
                onTest={() => handleTest(ep.id)}
                onDelete={() => handleDelete(ep.id)}
                onToggle={() => toggleActive(ep)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Deliveries */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent deliveries
        </h2>
        {deliveries.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">
            No deliveries yet. Send a test to see them here.
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden">
            {deliveries.map((d) => (
              <div key={d.id} className="p-3 sm:p-4 flex items-center gap-3">
                {d.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono truncate">{d.event}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    HTTP {d.status_code ?? "—"} · {d.latency_ms ?? "?"}ms
                    {d.error ? ` · ${d.error}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Docs snippet */}
      <Card className="p-5 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Verifying signatures</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Each request includes an <code className="text-foreground">X-OPSQAI-Signature</code> header:
          <code className="text-foreground"> sha256=&lt;hmac_sha256(secret, raw_body)&gt;</code>. Compute the
          HMAC on the raw request body and constant-time compare against the header.
        </p>
        <pre className="text-[11px] bg-background border rounded-md p-3 overflow-x-auto">
{`// Node.js example
const sig = req.headers["x-opsqai-signature"];
const expected = "sha256=" + crypto
  .createHmac("sha256", process.env.OPSQAI_WEBHOOK_SECRET)
  .update(rawBody).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
  return res.status(401).end();
}`}
        </pre>
      </Card>
    </div>
  );
}

/* ---------- Endpoint card ---------- */

function EndpointCard({
  ep, testing, onTest, onDelete, onToggle,
}: {
  ep: Endpoint;
  testing: boolean;
  onTest: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      {/* Row 1 — mobile grid to survive small widths */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{ep.name}</h3>
            {ep.active ? (
              <Badge variant="outline" className="h-5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 text-muted-foreground text-[10px]">
                Paused
              </Badge>
            )}
            {ep.failure_count > 0 && (
              <Badge variant="outline" className="h-5 border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
                {ep.failure_count} fail
              </Badge>
            )}
          </div>
          <code className="mt-1 block text-[11px] text-muted-foreground truncate">{ep.url}</code>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggle}
          className="shrink-0 h-8 px-2 text-xs"
        >
          {ep.active ? "Pause" : "Enable"}
        </Button>
      </div>

      {/* Events */}
      <div className="flex flex-wrap gap-1.5">
        {ep.events.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">All events</span>
        ) : (
          ep.events.map((e) => (
            <Badge key={e} variant="secondary" className="text-[10px] font-mono">
              {e}
            </Badge>
          ))
        )}
      </div>

      {/* Secret */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="shrink-0">Signing secret:</span>
        <code className="font-mono truncate">
          {showSecret ? ep.secret : ep.secret.slice(0, 6) + "…" + ep.secret.slice(-4)}
        </code>
        <button
          type="button"
          onClick={() => setShowSecret((s) => !s)}
          className="text-primary hover:underline shrink-0"
        >
          {showSecret ? "hide" : "reveal"}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(ep.secret);
            toast.success("Secret copied");
          }}
          className="text-primary hover:underline shrink-0 inline-flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> copy
        </button>
      </div>

      {/* Actions — full-width on mobile */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={testing}
          className="w-full sm:w-auto"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <PlayCircle className="h-3.5 w-3.5 mr-2" />}
          Send test
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="w-full sm:w-auto text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Create dialog ---------- */

function CreateEndpointDialog({
  open, setOpen, companyId, userId, genSecretFn, onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  companyId: string | null;
  userId: string | null;
  genSecretFn: () => Promise<{ secret: string }>;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && /^https:\/\//i.test(url.trim()),
    [name, url],
  );

  function toggleEvent(id: string) {
    setEvents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!companyId || !userId || !canSubmit) return;
    setBusy(true);
    try {
      const { secret } = await genSecretFn();
      const { error } = await supabase.from("webhook_endpoints").insert({
        company_id: companyId,
        name: name.trim(),
        url: url.trim(),
        secret,
        events,
        active: true,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      toast.success("Endpoint created");
      setName("");
      setUrl("");
      setEvents([]);
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add endpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New webhook endpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Datadog SIEM"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">HTTPS URL</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://siem.example.com/opsqai"
            />
            {url && !/^https:\/\//i.test(url) && (
              <p className="text-[11px] text-destructive">Must start with https://</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Events (leave empty for all)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ALL_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-2 text-[13px] cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="min-w-0 truncate">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create endpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

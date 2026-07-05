/**
 * Live Slack / Teams notifications setup — mobile-first, single scroll,
 * self-service. Admin pastes the incoming-webhook URL, picks which events
 * to forward, hits "Send test". Config lives in company_integrations.config.
 */
import { createFileRoute, redirect, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, ExternalLink, Loader2, Power, Send, Bell, ShieldCheck,
} from "lucide-react";
import {
  getNotificationConfig, saveNotificationConfig,
  testNotification, disconnectNotification,
  NOTIFICATION_EVENTS, type NotificationEvent,
} from "@/lib/notifications.functions";

type Provider = "slack" | "teams";

const PROVIDER_META: Record<Provider, {
  name: string; accent: string;
  urlLabel: string; urlHint: string; urlPlaceholder: string;
  docsHref: string; docsLabel: string;
}> = {
  slack: {
    name: "Slack",
    accent: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    urlLabel: "Slack Incoming Webhook URL",
    urlHint: "Slack → Apps → Incoming Webhooks → Add to Workspace → pick a channel → copy the URL.",
    urlPlaceholder: "https://hooks.slack.com/services/T.../B.../…",
    docsHref: "https://api.slack.com/messaging/webhooks",
    docsLabel: "Slack webhook docs",
  },
  teams: {
    name: "Microsoft Teams",
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    urlLabel: "Teams Incoming Webhook URL",
    urlHint: "Teams → channel → ⋯ → Connectors → Incoming Webhook → Configure → copy the URL.",
    urlPlaceholder: "https://<tenant>.webhook.office.com/webhookb2/…",
    docsHref: "https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
    docsLabel: "Teams webhook docs",
  },
};

const EVENT_META: Record<NotificationEvent, { label: string; hint: string }> = {
  "sop.published": { label: "SOP published", hint: "New or updated SOP goes live." },
  "incident.opened": { label: "Incident opened", hint: "A new operational incident is logged." },
  "user.provisioned": { label: "User provisioned", hint: "New user added via SCIM or manually." },
  "audit.critical": { label: "Critical audit event", hint: "Any audit entry marked critical." },
  "chat.flagged": { label: "Chat flagged", hint: "A user flags an AI answer for review." },
};

export const Route = createFileRoute("/_authenticated/app/admin/notifications/$provider")({
  head: () => ({ meta: [{ title: "Notifications — OPSQAI" }] }),
  loader: ({ params }) => {
    if (params.provider !== "slack" && params.provider !== "teams") throw notFound();
    return { provider: params.provider as Provider };
  },
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">
      Notification provider not supported.{" "}
      <Link to="/app/admin/integrations" className="text-primary underline">
        Back to integrations
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Error: {error.message}</div>
  ),
  component: NotificationsSetup,
});

function NotificationsSetup() {
  const loaderData = Route.useLoaderData();
  const provider = loaderData.provider as Provider;
  const { isPlatformAdmin, isPlatformOwner, isAdmin } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner && !isAdmin) {
    throw redirect({ to: "/app" });
  }

  const meta = PROVIDER_META[provider];
  const load = useServerFn(getNotificationConfig);
  const save = useServerFn(saveNotificationConfig);
  const test = useServerFn(testNotification);
  const disconnect = useServerFn(disconnectNotification);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "test" | "off" | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    load({ data: { provider } })
      .then((r) => {
        setStatus(r.status);
        setUrl(r.webhook_url);
        setEvents(r.events);
        setConnectedAt(r.connected_at);
        setLastError(r.last_error);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [load, provider]);

  function toggleEvent(ev: NotificationEvent) {
    setEvents((cur) => cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]);
  }

  async function onSave() {
    if (!url.trim()) return toast.error("Paste your webhook URL first.");
    setBusy("save");
    try {
      await save({ data: { provider, webhook_url: url.trim(), events } });
      setStatus("connected");
      setConnectedAt(new Date().toISOString());
      setLastError(null);
      toast.success(`${meta.name} notifications saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function onTest() {
    setBusy("test");
    try {
      const r = await test({ data: { provider } });
      if (r.ok) toast.success("Test delivered — check your channel.");
      else { toast.error(`Delivery failed (${r.status || "network"})`); setLastError(`Test failed (${r.status}): ${r.body}`); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function onDisconnect() {
    setBusy("off");
    try {
      await disconnect({ data: { provider } });
      setStatus("disconnected"); setUrl(""); setEvents([]); setConnectedAt(null); setLastError(null);
      toast.success("Notifications disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  const connected = status === "connected";

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-3xl mx-auto w-full">
      <Link
        to="/app/admin/integrations/$provider"
        params={{ provider }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {meta.name}
      </Link>

      <header className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
        <div className={`h-14 w-14 shrink-0 rounded-2xl border grid place-items-center ${meta.accent}`}>
          <Bell className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Notifications</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight truncate">
            {meta.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {connected ? (
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
            )}
            {connectedAt && (
              <span className="text-[11px] text-muted-foreground">
                since {new Date(connectedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 1. Webhook URL */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">1. Incoming webhook</h2>
        </div>
        <p className="text-sm text-muted-foreground">{meta.urlHint}</p>
        <div className="space-y-2">
          <Label htmlFor="webhook-url" className="text-xs">{meta.urlLabel}</Label>
          <Input
            id="webhook-url"
            placeholder={meta.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </div>
        <a
          href={meta.docsHref} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> {meta.docsLabel}
        </a>
      </Card>

      {/* 2. Events */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">2. Events to forward</h2>
        </div>
        <div className="space-y-3">
          {NOTIFICATION_EVENTS.map((ev) => {
            const m = EVENT_META[ev];
            const checked = events.includes(ev);
            return (
              <label key={ev} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleEvent(ev)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.hint}</div>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      {/* 3. Actions */}
      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold">3. Save & test</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onSave} disabled={busy !== null} className="w-full sm:w-auto">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save configuration
            </Button>
            <Button
              variant="outline" onClick={onTest}
              disabled={busy !== null || !connected}
              className="w-full sm:w-auto"
            >
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send test
            </Button>
            {connected && (
              <Button
                variant="ghost" onClick={onDisconnect}
                disabled={busy !== null}
                className="w-full sm:w-auto sm:ml-auto text-destructive hover:text-destructive"
              >
                {busy === "off" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                Disable
              </Button>
            )}
          </div>
        )}
        {lastError && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3 border border-destructive/20 break-words">
            {lastError}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Webhook URLs are scoped to this company and only readable by admins. OPSQAI never posts the URL back to any third party; test deliveries are logged for troubleshooting.
      </p>
    </div>
  );
}

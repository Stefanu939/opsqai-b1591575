import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCloudBrowserDb } from "@/lib/cloud-client";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checkSelfHostUpdateNow,
  dismissSelfHostUpdateNotice,
  getSelfHostPeerUpdateSettings,
  getSelfHostUpdateStatus,
  installSelfHostUpdateFromFile,
  runSelfHostUpdateAction,
  setSelfHostPeerUpdateSettings,
  setSelfHostUpdatePolicy,
} from "@/lib/selfhost-updates.functions";
import { Download, Package, ExternalLink, History, RefreshCw, Upload } from "lucide-react";

/** Plain-language explanation for an update-check outcome. */
function updateReasonText(reason?: string): string {
  const r = reason ?? "unknown";
  if (r === "unreachable") return "The Management Center could not be reached.";
  if (r === "unauthorized" || r.startsWith("http_401"))
    return "This installation is not recognised by the Management Center.";
  if (r === "license_missing" || r === "license_key_missing")
    return "No valid licence was found on this installation.";
  if (r === "maintenance_expired")
    return "Maintenance has expired — renew it to receive new versions.";
  if (r === "no_artifact") return "The published release has no installer package attached.";
  if (r === "bad_signature" || r === "descriptor_mismatch" || r === "wrong_kind")
    return "The update information could not be verified and was rejected.";
  if (r === "descriptor_expired") return "The update information expired — try again.";
  if (r === "install_mismatch")
    return "The update was issued for a different installation and was rejected.";
  if (r.startsWith("http_400"))
    return "The Management Center rejected the request details. Please try again after refreshing.";
  if (r.startsWith("http_5")) return "The Management Center is temporarily unavailable.";
  return `Update check failed: ${r}`;
}

export const Route = createFileRoute("/_authenticated/app/updates")({
  head: () => ({ meta: [{ title: "Updates — OPSQAI" }] }),
  component: UpdatesPage,
});

interface Release {
  id: string;
  version: string;
  tag_name: string;
  zip_url: string;
  zip_size_bytes: number | null;
  exe_sha256: string | null;
  exe_size_bytes: number | null;
  is_active: boolean;
  published_at: string;
}

function fmtBytes(n: number | null | undefined) {
  if (!n) return "—";
  const mb = n / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}


/**
 * Install a package the operator downloaded from the website. The file is
 * checked against the signed release descriptor on the server, so a wrong or
 * corrupted file is refused instead of installed.
 */
function ManualInstallPanel({
  expected,
  onDone,
}: {
  expected: { version: string } | null;
  onDone: () => void;
}) {
  const installFile = useServerFn(installSelfHostUpdateFromFile);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reasons: Record<string, string> = {
    no_known_release:
      "Check for updates first — the file is compared against the release the Management Center offers.",
    no_checksum: "This release has no published checksum, so a manual file cannot be verified.",
    checksum_mismatch: "This file does not match the published release and was not installed.",
    empty_file: "The selected file is empty.",
  };

  const onPick = async (file: File) => {
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 8192) {
        binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const res = await installFile({ data: { filename: file.name, base64: btoa(binary) } });
      if (res.ok) toast.success(`v${res.version} verified — installation scheduled`);
      else toast.error(reasons[res.reason ?? ""] ?? "The file could not be verified.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Upload className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Install from a downloaded file</span>
        <span className="text-xs text-muted-foreground">
          {expected ? `Expected: v${expected.version}` : "Run a check first"}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Verifying…" : "Choose file"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".exe,.zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onPick(f);
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Downloaded the update from the website? Select it here — its checksum is verified against
        the signed release before installation starts.
      </p>
    </div>
  );
}

/** Share a verified package with the other installations on this server. */
function PeerDistributionPanel() {
  const load = useServerFn(getSelfHostPeerUpdateSettings);
  const save = useServerFn(setSelfHostPeerUpdateSettings);
  const q = useQuery({ queryKey: ["selfhost-peer-updates"], queryFn: () => load() });
  const [draft, setDraft] = useState<{
    serve: boolean;
    source: string;
    token: string;
  } | null>(null);
  if (!q.data) return null;
  const v = draft ?? {
    serve: q.data.serve,
    source: q.data.source ?? "",
    token: q.data.token ?? "",
  };

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Share updates inside this server</span>
        <div className="flex items-center gap-2">
          <Switch
            id="peer-serve"
            checked={v.serve}
            onCheckedChange={(on) => setDraft({ ...v, serve: on })}
          />
          <Label htmlFor="peer-serve" className="text-xs">
            Serve to other installations
          </Label>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Input
          className="h-9"
          placeholder="Source, e.g. http://opsqai-host:8080"
          value={v.source}
          onChange={(e) => setDraft({ ...v, source: e.target.value })}
        />
        <Input
          className="h-9"
          placeholder="Shared token"
          value={v.token}
          onChange={(e) => setDraft({ ...v, token: e.target.value })}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!draft}
          onClick={() =>
            void save({
              data: { serve: v.serve, source: v.source.trim() || null, token: v.token.trim() || null },
            })
              .then(() => {
                setDraft(null);
                toast.success("Saved");
                void q.refetch();
              })
              .catch((e: Error) => toast.error(e.message))
          }
        >
          Save
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Off by default. When several installations run on one server, only one needs internet
        access: the others download the already verified package from it, using the same token.
      </p>
    </div>
  );
}


function AutoUpdatePanel() {
  const load = useServerFn(getSelfHostUpdateStatus);
  const save = useServerFn(setSelfHostUpdatePolicy);
  const dismiss = useServerFn(dismissSelfHostUpdateNotice);
  const checkNow = useServerFn(checkSelfHostUpdateNow);
  const runAction = useServerFn(runSelfHostUpdateAction);
  const [busy, setBusy] = useState<"check" | "download" | "install" | null>(null);
  const status = useQuery({
    queryKey: ["selfhost-update-status"],
    queryFn: () => load(),
    // While a download or installation is running, follow it closely.
    refetchInterval: (q) => {
      const phase = q.state.data?.progress?.phase;
      return phase === "downloading" || phase === "installing" ? 1_000 : 60_000;
    },
  });
  // Optimistic phase so the bar appears the instant the operator clicks.
  const [pending, setPending] = useState<null | {
    phase: "downloading" | "installing";
    version: string | null;
  }>(null);
  const [draft, setDraft] = useState<{
    automatic: boolean;
    channel: "stable" | "beta";
    windowStartHour: number;
    windowEndHour: number;
  } | null>(null);
  // Versions whose "installation finished" window the operator already closed.
  const [ackDone, setAckDone] = useState<string[]>([]);
  const [restarting, setRestarting] = useState(false);
  const restartMachine = useServerFn(restartSelfHostMachine);


  if (!status.data?.selfHosted) return null;
  const s = status.data;
  const p = draft ?? {
    automatic: s.policy.automatic,
    channel: (s.policy.channel === "beta" ? "beta" : "stable") as "stable" | "beta",
    windowStartHour: s.policy.windowStartHour,
    windowEndHour: s.policy.windowEndHour,
  };
  const set = (patch: Partial<typeof p>) => setDraft({ ...p, ...patch });

  return (
    <Panel
      icon={RefreshCw}
      title="Automatic updates"
      description="New signed releases are downloaded, verified and installed on their own during the nightly maintenance window. A backup is taken first and the previous version is restored automatically if anything fails."
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => {
              setBusy("check");
              void checkNow()
                .then((r) => {
                  if (r.ok) toast.success(`Version ${r.version} is available`);
                  else if (r.reason === "up_to_date")
                    toast.success("You are already on the newest version");
                  else toast.error(updateReasonText(r.reason));
                })
                .catch((e: Error) => toast.error(e.message))
                .finally(() => {
                  setBusy(null);
                  void status.refetch();
                });
            }}
          >
            {busy === "check" ? "Checking…" : "Check for updates"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void status.refetch()}>
            Refresh
          </Button>
        </div>
      }
    >
      {s.notice && s.notice.outcome !== "staged" ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <Badge variant={s.notice.outcome === "success" ? "default" : "destructive"}>
            {s.notice.outcome === "success" ? "Updated" : s.notice.outcome}
          </Badge>
          <span className="text-sm">
            {s.notice.version ? `v${s.notice.version}` : ""} ·{" "}
            {new Date(s.notice.at).toLocaleString()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              void dismiss().then(() => status.refetch());
            }}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      {(() => {
        const prog =
          s.progress && s.progress.phase !== "done"
            ? s.progress
            : pending
              ? {
                  phase: pending.phase,
                  version: pending.version,
                  received: 0,
                  total: 0,
                  error: null,
                  at: null as string | null,
                }
              : null;
        if (!prog) return null;
        const pct = prog.total ? Math.min(100, (prog.received / prog.total) * 100) : 0;
        const indeterminate = prog.phase === "downloading" && !prog.total;
        return (
        <div className="mb-3 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={prog.phase === "failed" ? "destructive" : "secondary"}>
              {prog.phase === "downloading"
                ? "Downloading"
                : prog.phase === "verified"
                  ? "Downloaded and verified"
                  : prog.phase === "installing"
                    ? "Installing"
                    : "Failed"}
            </Badge>
            {prog.version ? <span className="font-medium">v{prog.version}</span> : null}
            <span className="text-xs text-muted-foreground">
              {indeterminate
                ? "starting…"
                : `${fmtBytes(prog.received)}${prog.total ? ` / ${fmtBytes(prog.total)}` : ""}${
                    prog.total ? ` · ${Math.round(pct)}%` : ""
                  }`}
            </span>
            {prog.at ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(prog.at).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                prog.phase === "failed"
                  ? "bg-destructive"
                  : indeterminate
                    ? "animate-pulse bg-primary"
                    : "bg-primary"
              }`}
              style={{
                width:
                  prog.phase === "installing" || prog.phase === "verified"
                    ? "100%"
                    : indeterminate
                      ? "15%"
                      : `${Math.max(2, pct)}%`,
              }}
            />
          </div>
          {prog.error ? <p className="mt-2 text-xs text-destructive">{prog.error}</p> : null}
        </div>
        );
      })()}

      {s.available ? (
        <div className="mb-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Available</Badge>
            <span className="font-display text-base font-semibold">v{s.available.version}</span>
            <span className="text-xs text-muted-foreground">
              {s.available.channel} · found {new Date(s.available.discoveredAt).toLocaleString()}
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  setBusy("download");
                  setPending({ phase: "downloading", version: s.available!.version });
                  void runAction({ data: { action: "download", version: s.available!.version } })
                    .then(() => toast.success("Download started"))
                    .catch((e: Error) => {
                      setPending(null);
                      toast.error(e.message);
                    })
                    .finally(() => {
                      setBusy(null);
                      void status.refetch();
                      setTimeout(() => setPending(null), 8_000);
                    });
                }}
              >
                Download now
              </Button>
              <Button
                size="sm"
                disabled={busy !== null || s.available.artifact === "zip"}
                onClick={() => {
                  setBusy("install");
                  setPending({ phase: "installing", version: s.available!.version });
                  void runAction({ data: { action: "install", version: s.available!.version } })
                    .then(() =>
                      toast.success("Installation scheduled — a backup is taken first"),
                    )
                    .catch((e: Error) => {
                      setPending(null);
                      toast.error(e.message);
                    })
                    .finally(() => {
                      setBusy(null);
                      void status.refetch();
                      setTimeout(() => setPending(null), 8_000);
                    });
                }}
              >
                Install now
              </Button>
            </div>
          </div>
          {s.available.notes ? (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {s.available.notes}
            </p>
          ) : null}
          {s.available.artifact === "zip" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              This release is published as an archive, so it is downloaded for you but installed
              manually.
            </p>
          ) : null}
        </div>
      ) : null}

      <ManualInstallPanel
        expected={s.available ? { version: s.available.version } : null}
        onDone={() => void status.refetch()}
      />
      <PeerDistributionPanel />



      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-updates"
            checked={p.automatic}
            onCheckedChange={(v) => set({ automatic: v })}
          />
          <Label htmlFor="auto-updates" className="text-sm">
            Install automatically
          </Label>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Release channel</Label>
          <Select
            value={p.channel}
            onValueChange={(v) => set({ channel: v as "stable" | "beta" })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            Maintenance window (local time)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              className="h-9"
              type="number"
              min={0}
              max={23}
              value={p.windowStartHour}
              onChange={(e) => set({ windowStartHour: Number(e.target.value) })}
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              className="h-9"
              type="number"
              min={0}
              max={23}
              value={p.windowEndHour}
              onChange={(e) => set({ windowEndHour: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            void save({ data: p })
              .then(() => {
                toast.success("Update settings saved");
                setDraft(null);
                void status.refetch();
              })
              .catch((e: Error) => toast.error(e.message));
          }}
        >
          Save
        </Button>
      </div>

      <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
        <span>Installed version: v{s.currentVersion}</span>
        <span>
          Last check:{" "}
          {s.lastCheck ? new Date(s.lastCheck).toLocaleString() : "not yet"}
        </span>
        <span>
          Ready to install:{" "}
          {s.staged ? `v${s.staged.version}` : "nothing waiting — you are current"}
        </span>
      </div>

      {s.history.length ? (
        <ul className="mt-4 divide-y divide-border text-sm">
          {s.history.map((h, i) => (
            <li key={`${h.started_at ?? i}`} className="flex flex-wrap gap-2 py-2">
              <Badge variant={h.outcome === "success" ? "outline" : "destructive"}>
                {h.outcome ?? "—"}
              </Badge>
              <span>
                v{h.from_version ?? "?"} → v{h.to_version ?? "?"}
              </span>
              <span className="text-xs text-muted-foreground">
                {h.finished_at ? new Date(h.finished_at).toLocaleString() : ""}
              </span>
              {h.failed_step ? (
                <span className="text-xs text-destructive">{h.failed_step}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

function UpdatesPage() {
  const releases = useQuery({
    queryKey: ["installer-releases"],
    queryFn: async () => {
      // Installer releases are published from the Cloud catalogue. A
      // Self-Hosted install updates from its own package, so the list is
      // simply empty there instead of erroring.
      const db = await getCloudBrowserDb();
      if (!db) return [] as Release[];
      const { data, error } = await db
        .from("installer_releases")
        .select(
          "id, version, tag_name, zip_url, zip_size_bytes, exe_sha256, exe_size_bytes, is_active, published_at",
        )
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Release[];
    },
  });

  const rows = releases.data ?? [];
  const current = rows.find((r) => r.is_active) ?? rows[0];
  const installed = current?.version ?? "—";
  const available = current?.version ?? "—";

  return (
    <ModulePage
      eyebrow="Lifecycle"
      title="Updates"
      description="Installer releases published for your OPSQAI installation. Signed ZIP + SHA-256 for every version."
    >
      <AutoUpdatePanel />

      <BentoGrid>
        <BentoItem span={4} index={0}>
          <MetricTile label="Installed version" value={installed} icon={Package} />
        </BentoItem>
        <BentoItem span={4} index={1}>
          <MetricTile label="Latest available" value={available} icon={Download} tone="gold" />
        </BentoItem>
        <BentoItem span={4} index={2}>
          <MetricTile label="Releases published" value={rows.length} icon={History} />
        </BentoItem>
      </BentoGrid>

      {releases.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Package} title="No releases yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">v{r.version}</span>
                    {r.is_active && <Badge>current</Badge>}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {r.tag_name}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Published {new Date(r.published_at).toLocaleString()} · ZIP{" "}
                    {fmtBytes(r.zip_size_bytes)} · EXE {fmtBytes(r.exe_size_bytes)}
                  </div>
                  {r.exe_sha256 && (
                    <div className="text-[11px] font-mono text-muted-foreground mt-1 break-all">
                      sha256: {r.exe_sha256}
                    </div>
                  )}
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={r.zip_url} target="_blank" rel="noopener noreferrer">
                    Download <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Updates are applied by the on-premise installer. Rollback is handled locally through the
        installer's built-in version manager. Contact OPSQAI support if you need help.
      </p>
    </ModulePage>
  );
}

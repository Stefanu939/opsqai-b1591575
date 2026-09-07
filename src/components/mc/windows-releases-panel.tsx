// Management Center: Windows installer releases for Self-Hosted installations.
//
// This is the list the Self-Hosted auto-updater asks about. A release stays
// invisible to the fleet until someone publishes it here.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Panel } from "@/components/ui/panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { MonitorDown, RefreshCw } from "lucide-react";
import {
  listInstallerReleases,
  saveInstallerRelease,
  setInstallerReleasePublished,
  syncInstallerReleasesFromGithub,
  type InstallerReleaseRow,
} from "@/lib/installer-releases.functions";

function fmtBytes(n: number | null | undefined) {
  if (!n) return "—";
  const mb = n / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

export function WindowsReleasesPanel() {
  const list = useServerFn(listInstallerReleases);
  const sync = useServerFn(syncInstallerReleasesFromGithub);
  const save = useServerFn(saveInstallerRelease);
  const publish = useServerFn(setInstallerReleasePublished);
  const [editing, setEditing] = useState<InstallerReleaseRow | null>(null);
  const [busy, setBusy] = useState(false);

  const releases = useQuery({
    queryKey: ["mc-installer-releases"],
    queryFn: () => list(),
  });
  const rows = releases.data ?? [];

  const refresh = () => void releases.refetch();

  return (
    <Panel
      icon={MonitorDown}
      title="Windows installer releases"
      description="What Self-Hosted installations see when they check for updates. Publish a version only when its download link and checksum are correct."
      actions={
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void sync()
              .then((r) =>
                r.version
                  ? toast.success(`Registered build ${r.version} (not published yet)`)
                  : toast.info("No new build found"),
              )
              .catch((e: Error) => toast.error(e.message))
              .finally(() => {
                setBusy(false);
                refresh();
              });
          }}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Sync latest build
        </Button>
      }
    >
      {releases.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={MonitorDown} title="No installer releases yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold">v{r.version}</span>
                <Badge variant={r.is_published ? "default" : "outline"}>
                  {r.is_published ? "published" : "draft"}
                </Badge>
                <Badge variant="outline">{r.channel}</Badge>
                {r.tag_name ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {r.tag_name}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {new Date(r.published_at).toLocaleString()} · {fmtBytes(r.zip_size_bytes)}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    checked={r.is_published}
                    onCheckedChange={(v) => {
                      void publish({ data: { id: r.id, is_published: v } })
                        .then(() => toast.success(v ? "Published to installations" : "Unpublished"))
                        .catch((e: Error) => toast.error(e.message))
                        .finally(refresh);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(editing?.id === r.id ? null : r)}
                  >
                    {editing?.id === r.id ? "Close" : "Edit"}
                  </Button>
                </div>
              </div>
              {r.exe_sha256 ? (
                <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                  sha256: {r.exe_sha256}
                </div>
              ) : (
                <div className="mt-1 text-xs text-destructive">
                  Checksum missing — cannot be published.
                </div>
              )}
              {editing?.id === r.id ? (
                <ReleaseEditor
                  row={editing}
                  onChange={setEditing}
                  onSave={(payload) => {
                    void save({ data: payload })
                      .then(() => {
                        toast.success("Release saved");
                        setEditing(null);
                      })
                      .catch((e: Error) => toast.error(e.message))
                      .finally(refresh);
                  }}
                />
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ReleaseEditor({
  row,
  onChange,
  onSave,
}: {
  row: InstallerReleaseRow;
  onChange: (r: InstallerReleaseRow) => void;
  onSave: (payload: {
    id: string;
    version: string;
    tag_name: string | null;
    channel: "stable" | "beta";
    notes: string | null;
    min_version: string | null;
    zip_url: string | null;
    exe_sha256: string | null;
    package_storage_path: string | null;
    is_published: boolean;
  }) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
      <div>
        <Label className="text-xs text-muted-foreground">Channel</Label>
        <Select
          value={row.channel === "beta" ? "beta" : "stable"}
          onValueChange={(v) => onChange({ ...row, channel: v })}
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
        <Label className="text-xs text-muted-foreground">Minimum version to update from</Label>
        <Input
          className="h-9"
          value={row.min_version ?? ""}
          onChange={(e) => onChange({ ...row, min_version: e.target.value })}
          placeholder="optional"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Download URL</Label>
        <Input
          className="h-9"
          value={row.zip_url ?? ""}
          onChange={(e) => onChange({ ...row, zip_url: e.target.value })}
          placeholder="https://…/OPSQAI-Setup.exe"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Uploaded package path (optional)</Label>
        <Input
          className="h-9"
          value={row.package_storage_path ?? ""}
          onChange={(e) => onChange({ ...row, package_storage_path: e.target.value })}
          placeholder="1.4.0/installer/OPSQAI-Setup.exe"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground">SHA-256 of the downloaded file</Label>
        <Input
          className="h-9 font-mono"
          value={row.exe_sha256 ?? ""}
          onChange={(e) => onChange({ ...row, exe_sha256: e.target.value.trim() })}
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Release notes shown to customers</Label>
        <Textarea
          rows={3}
          value={row.notes ?? ""}
          onChange={(e) => onChange({ ...row, notes: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              id: row.id,
              version: row.version,
              tag_name: row.tag_name,
              channel: row.channel === "beta" ? "beta" : "stable",
              notes: row.notes,
              min_version: row.min_version || null,
              zip_url: row.zip_url || null,
              exe_sha256: row.exe_sha256 || null,
              package_storage_path: row.package_storage_path || null,
              is_published: row.is_published,
            })
          }
        >
          Save release
        </Button>
      </div>
    </div>
  );
}

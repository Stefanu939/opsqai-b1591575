import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import {
  listReleases,
  createRelease,
  setCurrentRelease,
  deleteRelease,
  listInstallations,
} from "@/lib/releases.functions";
import { getPortalSnapshot } from "@/lib/mc-admin.functions";
import { StatCard } from "@/components/ui/stat-card";
import { Package, Inbox, UploadCloud, X, FileText } from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Rocket, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { confirmAction } from "@/components/ui/confirm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/management/releases")({
  head: () => ({ meta: [{ title: "Releases — Management Center" }] }),
  component: ReleasesPage,
});

type Release = {
  id: string;
  version: string;
  channel: string;
  docker_image: string;
  package_storage_path: string | null;
  checksum: string | null;
  release_notes_url: string | null;
  notes_storage_path: string | null;
  min_supported: string | null;
  is_current: boolean;
  published_at: string | null;
};

function ReleasesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listReleases);
  const create = useServerFn(createRelease);
  const setCurrent = useServerFn(setCurrentRelease);
  const remove = useServerFn(deleteRelease);
  const snapshot = useServerFn(getPortalSnapshot);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-releases"],
    queryFn: () => list({ data: {} } as never) as Promise<Release[]>,
  });

  const { data: portal } = useQuery({
    queryKey: ["mc-portal-snapshot"],
    queryFn: () =>
      snapshot({ data: {} } as never) as Promise<{
        activeInstalls: number;
        totalInstalls: number;
        openTickets: number;
      }>,
  });

  const createMut = useMutation({
    mutationFn: (v: {
      version: string;
      channel: "stable" | "beta" | "canary";
      docker_image: string;
      package_storage_path?: string | null;
      checksum?: string | null;
      release_notes_url?: string | null;
      notes_storage_path?: string | null;
      min_supported?: string | null;
      is_current: boolean;
    }) => create({ data: v }),
    onSuccess: () => {
      toast.success("Release published");
      qc.invalidateQueries({ queryKey: ["mc-releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setCurrentMut = useMutation({
    mutationFn: (id: string) => setCurrent({ data: { id } }),
    onSuccess: () => {
      toast.success("Set as current");
      qc.invalidateQueries({ queryKey: ["mc-releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Release deleted");
      qc.invalidateQueries({ queryKey: ["mc-releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const installsFn = useServerFn(listInstallations);
  const installsQ = useQuery({
    queryKey: ["mc-releases-adoption"],
    queryFn: () =>
      installsFn({ data: {} } as never) as Promise<Array<{ app_version: string | null }>>,
    staleTime: 60_000,
  });
  const adoption = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of installsQ.data ?? []) {
      if (!i.app_version) continue;
      map.set(i.app_version, (map.get(i.app_version) ?? 0) + 1);
    }
    return map;
  }, [installsQ.data]);
  const totalInstalls = (installsQ.data ?? []).filter((i) => i.app_version).length;

  const columns: Column<Release>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{r.version}</span>
          {r.is_current && <Badge>Current</Badge>}
        </div>
      ),
    },
    {
      key: "adoption",
      header: "Installations on this version",
      render: (r) => {
        const n = adoption.get(r.version) ?? 0;
        const pct = totalInstalls ? Math.round((n / totalInstalls) * 100) : 0;
        return (
          <span className="text-xs text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">{n}</span>
            {totalInstalls ? ` of ${totalInstalls} (${pct}%)` : ""}
          </span>
        );
      },
    },
    {
      key: "channel",
      header: "Channel",
      render: (r) => <Badge variant="outline">{r.channel}</Badge>,
    },
    {
      key: "image",
      header: "Installer package",
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.package_storage_path
            ? `releases/${r.package_storage_path.split("/").slice(0, -1).join("/")}…${r.package_storage_path.split("/").pop()}`
            : r.docker_image}
        </span>
      ),
    },
    {
      key: "min",
      header: "Min supported",
      render: (r) => <span className="font-mono text-xs">{r.min_supported ?? "—"}</span>,
    },
    {
      key: "published",
      header: "Published",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) =>
        r.release_notes_url || r.notes_storage_path ? (
          <a
            href={r.release_notes_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {!r.is_current && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentMut.mutate(r.id)}
              disabled={setCurrentMut.isPending}
            >
              Set current
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              if (
                await confirmAction({
                  title: `Delete release ${r.version}?`,
                  description: "The release entry is removed for all customers.",
                  confirmLabel: "Delete release",
                })
              )
                removeMut.mutate(r.id);
            }}
            aria-label={`Delete release ${r.version}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Releases"
      description="Published OPSQAI self-hosted releases. Installations pull updates from the current release per channel."
      actions={
        <NewReleaseDialog onCreate={(v) => createMut.mutate(v)} pending={createMut.isPending} />
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Active installs with portal access"
          value={portal?.activeInstalls ?? 0}
          hint={`${portal?.totalInstalls ?? 0} total`}
          icon={Package}
        />
        <StatCard
          label="Releases published"
          value={(data as Release[]).length}
          hint="Visible to customers"
          icon={Rocket}
        />
        <StatCard label="Open tickets" value={portal?.openTickets ?? 0} icon={Inbox} />
      </div>

      <DataTable<Release>
        columns={columns}
        rows={data as Release[]}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={{
          icon: Rocket,
          title: "No releases yet",
          description: "Publish your first release to make it available to installations.",
        }}
      />
    </ModulePage>
  );
}

function NewReleaseDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: {
    version: string;
    channel: "stable" | "beta" | "canary";
    docker_image: string;
    checksum?: string | null;
    release_notes_url?: string | null;
    min_supported?: string | null;
    is_current: boolean;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [image, setImage] = useState("");
  const [checksum, setChecksum] = useState("");
  const [notes, setNotes] = useState("");
  const [minSupported, setMinSupported] = useState("");
  const [current, setCurrent] = useState(true);

  const submit = () => {
    if (!version.trim() || !image.trim()) {
      toast.error("Version and installer package are required.");
      return;
    }
    onCreate({
      version: version.trim(),
      channel,
      docker_image: image.trim(),
      checksum: checksum.trim() || null,
      release_notes_url: notes.trim() || null,
      min_supported: minSupported.trim() || null,
      is_current: current,
    });
    setOpen(false);
    setVersion("");
    setImage("");
    setChecksum("");
    setNotes("");
    setMinSupported("");
    setCurrent(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Publish release
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish release</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version</Label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.4.0"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="canary">Canary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Installer package</Label>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="ghcr.io/opsqai/app:1.4.0"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label>Checksum (sha256)</Label>
            <Input
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min supported</Label>
              <Input
                value={minSupported}
                onChange={(e) => setMinSupported(e.target.value)}
                placeholder="1.0.0"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label>Release notes URL</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={current} onCheckedChange={(v) => setCurrent(v === true)} />
            Mark as current for {channel}
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

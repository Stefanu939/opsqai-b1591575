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
import { Progress } from "@/components/ui/progress";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

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
        r.release_notes_url ? (
          <a
            href={r.release_notes_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        ) : r.notes_storage_path ? (
          <span className="text-xs text-muted-foreground">
            {r.notes_storage_path.split("/").pop()}
          </span>
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

type NewReleaseInput = {
  version: string;
  channel: "stable" | "beta" | "canary";
  docker_image: string;
  package_storage_path?: string | null;
  checksum?: string | null;
  release_notes_url?: string | null;
  notes_storage_path?: string | null;
  min_supported?: string | null;
  is_current: boolean;
};

function NewReleaseDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: NewReleaseInput) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<UploadedFile | null>(null);
  const [checksum, setChecksum] = useState("");
  const [notesMode, setNotesMode] = useState<"url" | "upload">("url");
  const [notesUrl, setNotesUrl] = useState("");
  const [notesFile, setNotesFile] = useState<UploadedFile | null>(null);
  const [minSupported, setMinSupported] = useState("");
  const [current, setCurrent] = useState(true);

  const reset = () => {
    setVersion("");
    setChannel("stable");
    setImageMode("url");
    setImageUrl("");
    setImageFile(null);
    setChecksum("");
    setNotesMode("url");
    setNotesUrl("");
    setNotesFile(null);
    setMinSupported("");
    setCurrent(true);
  };

  const submit = () => {
    if (!version.trim()) {
      toast.error("Version is required.");
      return;
    }
    const imageValue = imageMode === "upload" ? imageFile?.path : imageUrl.trim();
    if (!imageValue) {
      toast.error("Installer package URL or uploaded file is required.");
      return;
    }
    onCreate({
      version: version.trim(),
      channel,
      docker_image: imageMode === "upload" ? `releases/${imageFile?.path}` : imageUrl.trim(),
      package_storage_path: imageMode === "upload" ? imageFile?.path ?? null : null,
      checksum: checksum.trim() || null,
      release_notes_url: notesMode === "url" ? notesUrl.trim() || null : null,
      notes_storage_path: notesMode === "upload" ? notesFile?.path ?? null : null,
      min_supported: minSupported.trim() || null,
      is_current: current,
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Publish release
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish release</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Installer package</Label>
              <ModeToggle mode={imageMode} onChange={setImageMode} />
            </div>
            {imageMode === "url" ? (
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="ghcr.io/opsqai/app:1.4.0"
                className="font-mono"
              />
            ) : (
              <ReleaseFileUpload
                version={version}
                kind="installer"
                file={imageFile}
                onChange={setImageFile}
                onChecksum={setChecksum}
              />
            )}
          </div>

          <div>
            <Label>Checksum (sha256)</Label>
            <Input
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              placeholder={imageMode === "upload" ? "Computed automatically after upload" : "sha256:…"}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="mb-0">Release notes</Label>
                <ModeToggle mode={notesMode} onChange={setNotesMode} />
              </div>
              {notesMode === "url" ? (
                <Input
                  value={notesUrl}
                  onChange={(e) => setNotesUrl(e.target.value)}
                  placeholder="https://…"
                />
              ) : (
                <ReleaseFileUpload
                  version={version}
                  kind="notes"
                  file={notesFile}
                  onChange={setNotesFile}
                />
              )}
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

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "url" | "upload";
  onChange: (mode: "url" | "upload") => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => onChange("url")}
        className={`px-2 py-1 ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
      >
        URL
      </button>
      <button
        type="button"
        onClick={() => onChange("upload")}
        className={`px-2 py-1 ${mode === "upload" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
      >
        Upload
      </button>
    </div>
  );
}

type UploadedFile = { path: string; name: string; size: number };

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ReleaseFileUpload({
  version,
  kind,
  file,
  onChange,
  onChecksum,
}: {
  version: string;
  kind: "installer" | "notes";
  file: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onChecksum?: (checksum: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [hashing, setHashing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = kind === "installer" ? ".exe,.msi,.zip" : ".pdf,.md,.txt";

  const upload = useCallback(
    async (selected: File) => {
      setUploading(true);
      setProgress(0);
      setUploadedBytes(0);
      setTotalBytes(selected.size);
      try {
        const safeVersion = (version || "draft").replace(/[^a-zA-Z0-9._-]/g, "_");
        const ext = selected.name.includes(".") ? selected.name.split(".").pop() : "";
        const path = `${safeVersion}/${kind}/${Date.now()}.${ext}`;

        // Upload through XHR so the browser reports real byte progress; the
        // supabase-js storage client offers no progress callback.
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const baseUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
        const apiKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined;
        if (!token || !baseUrl || !apiKey) throw new Error("Not authenticated");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `${baseUrl}/storage/v1/object/releases/${path.split("/").map(encodeURIComponent).join("/")}`,
          );
          xhr.setRequestHeader("authorization", `Bearer ${token}`);
          xhr.setRequestHeader("apikey", apiKey);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.setRequestHeader("cache-control", "3600");
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            setUploadedBytes(event.loaded);
            setTotalBytes(event.total);
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(100);
              resolve();
              return;
            }
            let message = `Upload failed (${xhr.status})`;
            try {
              const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
              message = parsed.message ?? parsed.error ?? message;
            } catch {
              /* keep default message */
            }
            reject(new Error(message));
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));
          xhr.send(selected);
        });

        onChange({ path, name: selected.name, size: selected.size });
        toast.success(`${kind === "installer" ? "Installer" : "Release notes"} uploaded`);
        if (onChecksum && kind === "installer") {
          setHashing(true);
          const sum = await sha256Hex(selected);
          onChecksum(sum);
        }
      } catch (e) {
        toast.error(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setHashing(false);
        setUploading(false);
      }
    },
    [version, kind, onChange, onChecksum],
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) upload(selected);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) upload(dropped);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
        {kind === "installer" ? <Package className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{file.name}</div>
          <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove file">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      className={`cursor-pointer rounded-md border border-dashed px-4 py-6 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
      {uploading ? (
        <div className="mt-3 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {hashing ? "Calculating checksum…" : "Uploading…"}
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatBytes(uploadedBytes)} of {formatBytes(totalBytes)}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm">Drag file here or click to browse</p>
          <p className="text-xs text-muted-foreground">
            {kind === "installer" ? ".exe, .msi, .zip" : ".pdf, .md, .txt"}
          </p>
        </>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onInputChange} />
    </div>
  );
}

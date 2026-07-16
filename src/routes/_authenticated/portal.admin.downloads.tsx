import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listDownloadModulesAdmin,
  upsertDownloadModule,
  deleteDownloadModule,
  type PortalDownloadModule,
} from "@/lib/portal-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Pencil, Trash2, Package, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/admin/downloads")({
  component: AdminDownloads,
});

type FormState = {
  id?: string;
  title: string;
  description: string;
  category: string;
  version: string;
  file_url: string;
  file_size_bytes: number | null;
  icon_name: string;
  status: "draft" | "published";
};

const EMPTY: FormState = {
  title: "",
  description: "",
  category: "general",
  version: "",
  file_url: "",
  file_size_bytes: null,
  icon_name: "",
  status: "draft",
};

function AdminDownloads() {
  const qc = useQueryClient();
  const list = useServerFn(listDownloadModulesAdmin);
  const save = useServerFn(upsertDownloadModule);
  const remove = useServerFn(deleteDownloadModule);

  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-modules-admin"],
    queryFn: () => list({ data: {} } as never),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);

  const upsertMut = useMutation({
    mutationFn: (p: FormState) =>
      save({
        data: {
          id: p.id,
          title: p.title,
          description: p.description || null,
          category: p.category || "general",
          version: p.version || null,
          file_url: p.file_url,
          file_size_bytes: p.file_size_bytes,
          icon_name: p.icon_name || null,
          status: p.status,
        },
      } as never),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["portal-modules-admin"] });
      qc.invalidateQueries({ queryKey: ["portal-modules-public"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["portal-modules-admin"] });
      qc.invalidateQueries({ queryKey: ["portal-modules-public"] });
    },
  });

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (row: PortalDownloadModule) => {
    setForm({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      category: row.category,
      version: row.version ?? "",
      file_url: row.file_url,
      file_size_bytes: row.file_size_bytes,
      icon_name: row.icon_name ?? "",
      status: row.status,
    });
    setOpen(true);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("portal-download-modules")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setForm((f) => ({
        ...f,
        file_url: `portal-download-modules/${path}`,
        file_size_bytes: file.size,
      }));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const humanSize = (n: number | null) => {
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Portal admin"
        title="Download modules"
        description="Publish extra downloadable modules (plugins, templates, PDFs, tools) to the customer portal."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New module
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState icon={Package} title="No modules yet" description="Click ‘New module’ to publish your first download." />
      ) : (
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id} className="p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.title}</span>
                  <Badge variant="outline">{r.category}</Badge>
                  {r.version && <Badge variant="outline">v{r.version}</Badge>}
                  <Badge variant={r.status === "published" ? "default" : "outline"}>
                    {r.status}
                  </Badge>
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {r.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {r.file_url}
                  {r.file_size_bytes ? ` · ${humanSize(r.file_size_bytes)}` : ""}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${r.title}"?`)) deleteMut.mutate(r.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit module" : "New module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  placeholder="plugin, template, document, tool…"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <Label>Version</Label>
                <Input
                  placeholder="1.0.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>File</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f);
                    }}
                  />
                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent">
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Upload file
                  </span>
                </label>
                {form.file_url && (
                  <span className="text-xs text-muted-foreground truncate max-w-[400px]">
                    {form.file_url}
                    {form.file_size_bytes ? ` · ${humanSize(form.file_size_bytes)}` : ""}
                  </span>
                )}
              </div>
              <Input
                className="mt-2"
                placeholder="…or paste an external URL (https://…)"
                value={form.file_url}
                onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={form.status === "published"}
                onCheckedChange={(v) =>
                  setForm({ ...form, status: v ? "published" : "draft" })
                }
              />
              <Label htmlFor="published">
                {form.status === "published" ? "Published" : "Draft"}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.title || !form.file_url || upsertMut.isPending}
              onClick={() => upsertMut.mutate(form)}
            >
              {upsertMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

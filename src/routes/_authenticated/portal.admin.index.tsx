import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  listAnnouncementsAdmin,
  upsertAnnouncement,
  deleteAnnouncement,
  signPortalStoragePath,
  type PortalAnnouncement,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Pencil, Trash2, Pin, Newspaper, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/admin/")({
  component: AdminNews,
});

type FormState = {
  id?: string;
  title: string;
  slug: string;
  body_md: string;
  cover_image_url: string | null;
  status: "draft" | "published";
  pinned: boolean;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  body_md: "",
  cover_image_url: null,
  status: "draft",
  pinned: false,
};

function AdminNews() {
  const qc = useQueryClient();
  const list = useServerFn(listAnnouncementsAdmin);
  const save = useServerFn(upsertAnnouncement);
  const remove = useServerFn(deleteAnnouncement);
  const sign = useServerFn(signPortalStoragePath);

  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-announcements-admin"],
    queryFn: () => list({ data: {} } as never),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [signedCovers, setSignedCovers] = useState<Record<string, string>>({});

  // Sign cover URLs (stored as bucket path) for listing preview.
  useEffect(() => {
    (async () => {
      const pairs: Record<string, string> = {};
      for (const r of data) {
        if (r.cover_image_url && r.cover_image_url.startsWith("portal-news-images/")) {
          const path = r.cover_image_url.slice("portal-news-images/".length);
          try {
            const { url } = await sign({
              data: { bucket: "portal-news-images", path, expiresIn: 3600 },
            });
            pairs[r.id] = url;
          } catch {
            /* skip */
          }
        } else if (r.cover_image_url) {
          pairs[r.id] = r.cover_image_url;
        }
      }
      setSignedCovers(pairs);
    })();
  }, [data, sign]);

  const upsertMut = useMutation({
    mutationFn: (payload: FormState) =>
      save({
        data: {
          id: payload.id,
          title: payload.title,
          slug: payload.slug || undefined,
          body_md: payload.body_md,
          cover_image_url: payload.cover_image_url,
          status: payload.status,
          pinned: payload.pinned,
        },
      } as never),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["portal-announcements-admin"] });
      qc.invalidateQueries({ queryKey: ["portal-announcements-public"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["portal-announcements-admin"] });
      qc.invalidateQueries({ queryKey: ["portal-announcements-public"] });
    },
  });

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (row: PortalAnnouncement) => {
    setForm({
      id: row.id,
      title: row.title,
      slug: row.slug,
      body_md: row.body_md,
      cover_image_url: row.cover_image_url,
      status: row.status,
      pinned: row.pinned,
    });
    setOpen(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("portal-news-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      // Store the bucket-prefixed logical path so listing can sign it later.
      setForm((f) => ({ ...f, cover_image_url: `portal-news-images/${path}` }));
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Portal admin"
        title="News"
        description="Publish news posts and announcements to every customer signed into the portal."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New post
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState icon={Newspaper} title="No posts yet" description="Click ‘New post’ to publish your first announcement." />
      ) : (
        <div className="grid gap-3">
          {data.map((row) => (
            <Card key={row.id} className="p-4 flex gap-4 items-start">
              {signedCovers[row.id] ? (
                <img
                  src={signedCovers[row.id]}
                  alt=""
                  className="w-24 h-24 rounded-md object-cover shrink-0 bg-muted"
                />
              ) : (
                <div className="w-24 h-24 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                  <Newspaper className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{row.title}</span>
                  <Badge variant={row.status === "published" ? "default" : "outline"}>
                    {row.status}
                  </Badge>
                  {row.pinned && (
                    <Badge variant="secondary">
                      <Pin className="h-3 w-3 mr-1" />
                      pinned
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  /{row.slug} · updated {new Date(row.updated_at).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {row.body_md.slice(0, 240)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${row.title}"?`)) deleteMut.mutate(row.id);
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (optional — generated from title)</Label>
              <Input
                id="slug"
                placeholder="e.g. maintenance-window-april"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Cover image</Label>
              <div className="flex items-center gap-3">
                {form.cover_image_url ? (
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {form.cover_image_url}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCover(f);
                    }}
                  />
                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent">
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Upload
                  </span>
                </label>
                {form.cover_image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, cover_image_url: null })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Body (Markdown)</Label>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    rows={14}
                    value={form.body_md}
                    onChange={(e) => setForm({ ...form, body_md: e.target.value })}
                    placeholder="Write in Markdown. Supports **bold**, *italic*, lists, links, images, tables (GFM)."
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border p-4 min-h-[200px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {form.body_md || "*Nothing to preview yet.*"}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="pinned"
                  checked={form.pinned}
                  onCheckedChange={(v) => setForm({ ...form, pinned: v })}
                />
                <Label htmlFor="pinned">Pin to top</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.title || upsertMut.isPending}
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

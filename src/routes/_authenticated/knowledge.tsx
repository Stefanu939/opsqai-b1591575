import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Trash2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createKnowledgeDocument, deleteKnowledgeDocument } from "@/lib/kb.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: KnowledgePage,
});

interface Doc { id: string; title: string; category: string; file_path: string | null; content_text: string; created_at: string }

function KnowledgePage() {
  const { t } = useT();
  const { isAdmin } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const createDoc = useServerFn(createKnowledgeDocument);
  const delDoc = useServerFn(deleteKnowledgeDocument);

  const load = async () => {
    const { data } = await supabase.from("knowledge_documents").select("*").order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let file_path: string | null = null;
      let text = content;
      if (file) {
        const path = `${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("knowledge-docs").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
        if (file.type.startsWith("text/") && !text) {
          text = await file.text();
        }
      }
      await createDoc({ data: { title, category, content_text: text, file_path } });
      toast.success("Saved");
      setOpen(false); setTitle(""); setCategory("general"); setContent(""); setFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try { await delDoc({ data: { id } }); load(); } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("knowledge")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("documents")}</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />{t("upload")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("upload")}</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2"><Label>{t("title")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div className="space-y-2"><Label>{t("category")}</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} required /></div>
                <div className="space-y-2"><Label>{t("file")}</Label><Input type="file" accept=".pdf,.txt,.md,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                <div className="space-y-2"><Label>{t("extractedText")}</Label><Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste text content here…" /></div>
                <Button type="submit" disabled={busy} className="w-full">{t("save")}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {docs.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">{t("noDocs")}</Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="p-4 flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="font-mono uppercase tracking-wider">{d.category}</span>
                  {" · "}{new Date(d.created_at).toLocaleDateString()}
                </div>
                {d.content_text && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.content_text}</p>}
              </div>
              {isAdmin && (
                <button onClick={() => onDelete(d.id)} className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

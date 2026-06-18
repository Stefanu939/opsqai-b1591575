import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Trash2, Upload, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { processDocument, deleteKnowledgeDocument, reprocessDocument } from "@/lib/kb.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — LogiAssist" },
      { name: "description", content: "Browse and manage your company's SOPs, manuals and procedures indexed for the LogiAssist AI." },
      { property: "og:title", content: "Knowledge Base — LogiAssist" },
      { property: "og:description", content: "Browse and manage your company's SOPs, manuals and procedures indexed for the LogiAssist AI." },
      { property: "og:url", content: "https://logiassist.lovable.app/knowledge" },
    ],
    links: [{ rel: "canonical", href: "https://logiassist.lovable.app/knowledge" }],
  }),
  component: KnowledgePage,
});

interface Doc {
  id: string;
  title: string;
  doc_code: string | null;
  category: string;
  file_path: string | null;
  file_type: string | null;
  content_text: string;
  status: string;
  error: string | null;
  chunk_count: number;
  created_at: string;
}

const CATEGORIES = ["SOP", "Manual", "Procedure", "Safety", "Transport", "Warehouse", "General"];

function KnowledgePage() {
  const { t } = useT();
  const { isAdmin, companyId, activeCompanyId, isPlatformAdmin } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [docCode, setDocCode] = useState("");
  const [category, setCategory] = useState("SOP");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const process = useServerFn(processDocument);
  const del = useServerFn(deleteKnowledgeDocument);
  const reprocess = useServerFn(reprocessDocument);

  const load = async () => {
    const { data } = await supabase
      .from("knowledge_documents")
      .select("id,title,doc_code,category,file_path,file_type,content_text,status,error,chunk_count,created_at")
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const scopeId = (isPlatformAdmin ? activeCompanyId : companyId) ?? companyId;
      if (!scopeId) { toast.error("No company context"); setBusy(false); return; }
      const path = `${scopeId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("knowledge-docs").upload(path, file);
      if (upErr) throw upErr;
      await process({ data: {
        title: title || file.name,
        category,
        doc_code: docCode || null,
        file_path: path,
        file_type: file.type || "application/octet-stream",
        filename: file.name,
      }});
      toast.success("Document processed and indexed");
      setOpen(false); setTitle(""); setDocCode(""); setCategory("SOP"); setFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error processing document");
    } finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this document and all its indexed chunks?")) return;
    try { await del({ data: { id } }); load(); } catch (e) { toast.error(String(e)); }
  };

  const onReprocess = async (id: string) => {
    try { toast.info("Re-indexing…"); await reprocess({ data: { id } }); toast.success("Re-indexed"); load(); }
    catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("knowledge")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("documentsDesc")}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />{t("upload")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("uploadDoc")}</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>{t("title")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Transport Delay Management" required />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("docCode")}</Label>
                    <Input value={docCode} onChange={(e) => setDocCode(e.target.value)} placeholder="SOP-004" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("category")}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("file")} <span className="text-muted-foreground text-xs">(PDF, DOCX, TXT)</span></Label>
                  <Input type="file" accept=".pdf,.txt,.md,.docx,application/pdf,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("processing")}</> : t("uploadAndIndex")}
                  </Button>
                </DialogFooter>
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
                <div className="flex items-center gap-2 flex-wrap">
                  {d.doc_code && <Badge variant="outline" className="font-mono text-xs">{d.doc_code}</Badge>}
                  <div className="font-medium truncate">{d.title}</div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono uppercase tracking-wider">{d.category}</span>
                  <span>·</span>
                  <span>{d.chunk_count} chunks</span>
                  <span>·</span>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                {d.status === "failed" && d.error && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{d.error}</span>
                  </div>
                )}
                {d.content_text && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.content_text.slice(0, 300)}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onReprocess(d.id)} aria-label={`Re-index document ${d.title}`} title="Re-index" className="p-2 text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(d.id)} aria-label={`Delete document ${d.title}`} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
  if (status === "processing") return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Failed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Trash2, Upload, RefreshCw, AlertTriangle, CheckCircle2, Loader2, GitBranch, ShieldAlert, History, RotateCcw, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { processDocument, deleteKnowledgeDocument, reprocessDocument } from "@/lib/kb.functions";
import { replaceDocumentVersion, rollbackToVersion, setCriticalFlag } from "@/lib/sop-versions.functions";
import { ExportDialog } from "@/components/admin/export-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — OPSQAI" },
      { name: "description", content: "Browse and manage your company's SOPs, manuals and procedures indexed for the OPSQAI AI." },
      { property: "og:title", content: "Knowledge Base — OPSQAI" },
      { property: "og:description", content: "Browse and manage your company's SOPs, manuals and procedures indexed for the OPSQAI AI." },
      { property: "og:url", content: "https://opsqai.de/app/knowledge" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/app/knowledge" }],
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
  version: number;
  is_active: boolean;
  is_critical: boolean;
  parent_document_id: string | null;
  change_notes: string | null;
  updated_at: string;
}

const CATEGORIES = ["SOP", "Manual", "Procedure", "Safety", "Transport", "Warehouse", "General"];

function KnowledgePage() {
  const { t } = useT();
  const { isAdmin, isManager, companyId, activeCompanyId, isPlatformAdmin } = useAuth();
  const canEdit = isAdmin || isManager;
  const [docs, setDocs] = useState<Doc[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [docCode, setDocCode] = useState("");
  const [category, setCategory] = useState("SOP");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<Doc | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceNotes, setReplaceNotes] = useState("");
  const [versionsFor, setVersionsFor] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Doc[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  const process = useServerFn(processDocument);
  const del = useServerFn(deleteKnowledgeDocument);
  const reprocess = useServerFn(reprocessDocument);
  const replaceFn = useServerFn(replaceDocumentVersion);
  const rollback = useServerFn(rollbackToVersion);
  const setCritical = useServerFn(setCriticalFlag);

  const load = async () => {
    let q = supabase
      .from("knowledge_documents")
      .select("id,title,doc_code,category,file_path,file_type,content_text,status,error,chunk_count,created_at,version,is_active,is_critical,parent_document_id,change_notes,updated_at")
      .order("created_at", { ascending: false });
    if (!showInactive) q = q.eq("is_active", true);
    const { data } = await q;
    setDocs((data ?? []) as Doc[]);
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [showInactive]);

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

  const onToggleCritical = async (d: Doc) => {
    try {
      await setCritical({ data: { id: d.id, is_critical: !d.is_critical } });
      toast.success(d.is_critical ? "Removed critical flag" : "Marked as critical — users will be asked to acknowledge");
      load();
    } catch (e) { toast.error(String(e)); }
  };

  const submitReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget || !replaceFile) return;
    setBusy(true);
    try {
      const safe = replaceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const scopeId = (isPlatformAdmin ? activeCompanyId : companyId) ?? companyId;
      if (!scopeId) throw new Error("No company");
      const path = `${scopeId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("knowledge-docs").upload(path, replaceFile);
      if (upErr) throw upErr;
      await replaceFn({ data: {
        previous_id: replaceTarget.id,
        title: replaceTarget.title,
        category: replaceTarget.category,
        doc_code: replaceTarget.doc_code ?? "DOC",
        file_path: path,
        file_type: replaceFile.type || "application/octet-stream",
        filename: replaceFile.name,
        change_notes: replaceNotes || undefined,
      }});
      toast.success(`New version uploaded (v${replaceTarget.version + 1})`);
      setReplaceTarget(null); setReplaceFile(null); setReplaceNotes("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error replacing");
    } finally { setBusy(false); }
  };

  const openVersions = async (d: Doc) => {
    setVersionsFor(d);
    const rootId = d.parent_document_id ?? d.id;
    const { data } = await supabase
      .from("knowledge_documents")
      .select("id,title,doc_code,category,file_path,file_type,content_text,status,error,chunk_count,created_at,version,is_active,is_critical,parent_document_id,change_notes,updated_at")
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
      .order("version", { ascending: false });
    setVersions((data ?? []) as Doc[]);
  };

  const onRollback = async (id: string) => {
    if (!confirm("Roll back to this version? Newer versions will be deactivated.")) return;
    try {
      await rollback({ data: { id } });
      toast.success("Rolled back");
      if (versionsFor) openVersions(versionsFor);
      load();
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("knowledge")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("documentsDesc")}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Show archived versions
          </label>
          {canEdit && (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          )}
          {canEdit && (
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
      </div>

      {docs.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">{t("noDocs")}</Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id} className={`p-4 flex items-start gap-3 ${!d.is_active ? "opacity-60" : ""} ${d.is_critical ? "border-amber-500/40" : ""}`}>
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.doc_code && <Badge variant="outline" className="font-mono text-xs">{d.doc_code}</Badge>}
                  <Badge variant="secondary" className="text-[10px] font-mono">v{d.version}</Badge>
                  {!d.is_active && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                  {d.is_critical && <Badge className="text-[10px] bg-amber-600 hover:bg-amber-600"><ShieldAlert className="h-3 w-3 mr-1" />Critical</Badge>}
                  <div className="font-medium truncate">{d.title}</div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono uppercase tracking-wider">{d.category}</span>
                  <span>·</span>
                  <span>{d.chunk_count} chunks</span>
                  <span>·</span>
                  <span>Updated {new Date(d.updated_at || d.created_at).toLocaleDateString()}</span>
                </div>
                {d.change_notes && (
                  <div className="text-xs text-muted-foreground mt-1 italic">"{d.change_notes}"</div>
                )}
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
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openVersions(d)} aria-label="Version history" title="Version history" className="p-2 text-muted-foreground hover:text-primary">
                    <History className="h-4 w-4" />
                  </button>
                  {d.is_active && (
                    <button onClick={() => setReplaceTarget(d)} aria-label="Replace with new version" title="Upload new version" className="p-2 text-muted-foreground hover:text-primary">
                      <GitBranch className="h-4 w-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => onToggleCritical(d)} aria-label="Toggle critical" title={d.is_critical ? "Unmark critical" : "Mark as critical"} className={`p-2 ${d.is_critical ? "text-amber-600" : "text-muted-foreground hover:text-amber-600"}`}>
                      <ShieldAlert className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => onReprocess(d.id)} aria-label="Re-index" title="Re-index" className="p-2 text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => onDelete(d.id)} aria-label="Delete" className="p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Replace dialog */}
      <Dialog open={!!replaceTarget} onOpenChange={(o) => { if (!o) { setReplaceTarget(null); setReplaceFile(null); setReplaceNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>
              {replaceTarget && <>Replacing <span className="font-medium">{replaceTarget.title}</span> (v{replaceTarget.version}). The previous version will be archived.</>}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReplace} className="space-y-4">
            <div className="space-y-2">
              <Label>New file</Label>
              <Input type="file" accept=".pdf,.txt,.md,.docx,application/pdf,text/plain" onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)} required />
            </div>
            <div className="space-y-2">
              <Label>Change notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={replaceNotes} onChange={(e) => setReplaceNotes(e.target.value)} placeholder="What changed in this version?" rows={3} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !replaceFile} className="w-full">
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : "Upload new version"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      <Dialog open={!!versionsFor} onOpenChange={(o) => { if (!o) { setVersionsFor(null); setVersions([]); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            {versionsFor && <DialogDescription>{versionsFor.title}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {versions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No history yet.</div>
            ) : versions.map((v) => (
              <div key={v.id} className="rounded-md border border-border p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-mono">v{v.version}</Badge>
                    {v.is_active && <Badge className="text-[10px]">Active</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                  </div>
                  {v.change_notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{v.change_notes}"</p>}
                </div>
                {!v.is_active && isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => onRollback(v.id)}>
                    <RotateCcw className="h-3 w-3 mr-1.5" /> Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
  if (status === "processing") return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Failed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

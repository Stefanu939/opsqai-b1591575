import { createFileRoute } from "@tanstack/react-router";
import emptyKnowledgeIllustration from "@/assets/empty-knowledge.png";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { Panel } from "@/components/ui/panel";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Trash2,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  GitBranch,
  ShieldAlert,
  History,
  RotateCcw,
  Download,
  BookOpen,
  Archive,
  Sparkles,
  CalendarClock,
  CheckCheck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  processDocument,
  deleteKnowledgeDocument,
  reprocessDocument,
  listKnowledgeDocuments,
  listDocumentVersions,
  uploadKnowledgeFile,
  updateKnowledgeMetadata,
  markDocumentReviewed,
} from "@/lib/kb.functions";
import {
  documentLifecycle,
  lifecycleBadgeClass,
  summarizeLifecycle,
  DEFAULT_REVIEW_INTERVAL_DAYS,
  type LifecycleState,
} from "@/lib/document-lifecycle";
import {
  replaceDocumentVersion,
  rollbackToVersion,
  setCriticalFlag,
} from "@/lib/sop-versions.functions";
import { ExportDialog } from "@/components/admin/export-dialog";
import { toast } from "sonner";
import { confirmAction } from "@/components/ui/confirm";

export const Route = createFileRoute("/_authenticated/app/knowledge")({
  // Deep link used by AI Chat sources: /app/knowledge?doc=<document id>
  validateSearch: (s: Record<string, unknown>): { doc?: string } =>
    typeof s.doc === "string" && s.doc ? { doc: s.doc } : {},
  head: () => ({

    meta: [
      { title: "Knowledge Base — OPSQAI" },
      {
        name: "description",
        content:
          "Browse and manage your company's SOPs, manuals and procedures indexed for the OPSQAI AI.",
      },
      { property: "og:title", content: "Knowledge Base — OPSQAI" },
      {
        property: "og:description",
        content:
          "Browse and manage your company's SOPs, manuals and procedures indexed for the OPSQAI AI.",
      },
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
  information_updated_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number | null;
  owner_id?: string | null;
}

const CATEGORIES = ["SOP", "Manual", "Procedure", "Safety", "Transport", "Warehouse", "General"];

function KnowledgePage() {
  const { t } = useT();
  const {
    isAdmin,
    isManager,
    companyId,
    activeCompanyId,
    isPlatformAdmin,
    scopeCompanyId,
    hasAnyPermission,
  } = useAuth();
  // Mirror the server-side permission contract (kb.functions.ts +
  // sop-versions.functions.ts) so the UI never hides an action the backend
  // would actually allow.
  const canEdit =
    isAdmin ||
    isManager ||
    hasAnyPermission("knowledge.manage", "sop.create", "sop.edit", "sop.publish", "sop.delete");

  const { doc: focusDocId } = Route.useSearch();
  const [focusedDoc, setFocusedDoc] = useState<string | null>(focusDocId ?? null);
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [freshness, setFreshness] = useState<"all" | LifecycleState>("all");
  const [metaTarget, setMetaTarget] = useState<Doc | null>(null);
  const [metaInfoDate, setMetaInfoDate] = useState("");
  const [metaInterval, setMetaInterval] = useState<string>("");
  const [metaSaving, setMetaSaving] = useState(false);

  const process = useServerFn(processDocument);
  const del = useServerFn(deleteKnowledgeDocument);
  const reprocess = useServerFn(reprocessDocument);
  const replaceFn = useServerFn(replaceDocumentVersion);
  const rollback = useServerFn(rollbackToVersion);
  const setCritical = useServerFn(setCriticalFlag);
  const fetchDocs = useServerFn(listKnowledgeDocuments);
  const fetchVersions = useServerFn(listDocumentVersions);
  const uploadFile = useServerFn(uploadKnowledgeFile);
  const saveMetadata = useServerFn(updateKnowledgeMetadata);
  const markReviewed = useServerFn(markDocumentReviewed);

  const openMetadata = (d: Doc) => {
    setMetaTarget(d);
    const basis = d.information_updated_at ?? d.updated_at ?? d.created_at;
    setMetaInfoDate(basis ? new Date(basis).toISOString().slice(0, 10) : "");
    setMetaInterval(String(d.review_interval_days ?? DEFAULT_REVIEW_INTERVAL_DAYS));
  };

  const onSaveMetadata = async () => {
    if (!metaTarget) return;
    setMetaSaving(true);
    try {
      await saveMetadata({
        data: {
          id: metaTarget.id,
          information_updated_at: metaInfoDate
            ? new Date(`${metaInfoDate}T12:00:00Z`).toISOString()
            : null,
          review_interval_days: metaInterval ? Number(metaInterval) : null,
        },
      });
      toast.success("Document lifecycle updated");
      setMetaTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setMetaSaving(false);
    }
  };

  const onMarkReviewed = async (d: Doc) => {
    try {
      await markReviewed({ data: { id: d.id } });
      toast.success("Review recorded — freshness clock reset");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record review");
    }
  };

  /** Read a File as base64 so it can travel through a server fn payload. */
  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(f);
    });

  const load = async () => {
    // Reads run through a server fn: Cloud resolves via Supabase/RLS,
    // Self-Hosted via the local Postgres repository.
    const rows = await fetchDocs({
      data: { company_id: scopeCompanyId ?? null, include_inactive: showInactive },
    });
    setDocs((rows ?? []) as unknown as Doc[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [showInactive, scopeCompanyId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    setBusy(true);
    try {
      const scopeId = (isPlatformAdmin ? activeCompanyId : companyId) ?? companyId;
      if (!scopeId) {
        toast.error("No company context");
        setBusy(false);
        return;
      }
      const { file_path: path } = await uploadFile({
        data: {
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64: await toBase64(file),
          company_id: scopeId,
        },
      });
      await process({
        data: {
          title: title || file.name,
          category,
          doc_code: docCode || null,
          file_path: path,
          file_type: file.type || "application/octet-stream",
          filename: file.name,
        },
      });
      toast.success("Document processed and indexed");
      setOpen(false);
      setTitle("");
      setDocCode("");
      setCategory("SOP");
      setFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error processing document");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (
      !(await confirmAction({
        title: "Delete this document?",
        description: "All indexed chunks are removed and it stops answering questions.",
        confirmLabel: "Delete document",
      }))
    )
      return;
    try {
      await del({ data: { id } });
      load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const onReprocess = async (id: string) => {
    try {
      toast.info("Re-indexing…");
      await reprocess({ data: { id } });
      toast.success("Re-indexed");
      load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const onToggleCritical = async (d: Doc) => {
    try {
      await setCritical({ data: { id: d.id, is_critical: !d.is_critical } });
      toast.success(
        d.is_critical
          ? "Removed critical flag"
          : "Marked as critical — users will be asked to acknowledge",
      );
      load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const submitReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget || !replaceFile) return;
    setBusy(true);
    try {
      const scopeId = (isPlatformAdmin ? activeCompanyId : companyId) ?? companyId;
      if (!scopeId) throw new Error("No company");
      const { file_path: path } = await uploadFile({
        data: {
          filename: replaceFile.name,
          content_type: replaceFile.type || "application/octet-stream",
          data_base64: await toBase64(replaceFile),
          company_id: scopeId,
        },
      });
      await replaceFn({
        data: {
          previous_id: replaceTarget.id,
          title: replaceTarget.title,
          category: replaceTarget.category,
          doc_code: replaceTarget.doc_code ?? "DOC",
          file_path: path,
          file_type: replaceFile.type || "application/octet-stream",
          filename: replaceFile.name,
          change_notes: replaceNotes || undefined,
        },
      });
      toast.success(`New version uploaded (v${replaceTarget.version + 1})`);
      setReplaceTarget(null);
      setReplaceFile(null);
      setReplaceNotes("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error replacing");
    } finally {
      setBusy(false);
    }
  };

  const openVersions = async (d: Doc) => {
    setVersionsFor(d);
    const rootId = d.parent_document_id ?? d.id;
    const rows = await fetchVersions({ data: { root_id: rootId } });
    setVersions((rows ?? []) as unknown as Doc[]);
  };

  const onRollback = async (id: string) => {
    if (
      !(await confirmAction({
        title: "Roll back to this version?",
        description: "Newer versions will be deactivated.",
        confirmLabel: "Roll back",
        destructive: false,
      }))
    )
      return;
    try {
      await rollback({ data: { id } });
      toast.success("Rolled back");
      if (versionsFor) openVersions(versionsFor);
      load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  // Deep link from AI Chat sources: reveal, scroll to and highlight the document.
  useEffect(() => {
    if (!focusDocId) return;
    const target = docs.find((d) => d.id === focusDocId);
    if (!target) return;
    setCategoryFilter("all");
    setFreshness("all");
    setSearch("");
    if (!target.is_active) setShowInactive(true);
    setFocusedDoc(focusDocId);
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(`kb-doc-${focusDocId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = setTimeout(() => setFocusedDoc(null), 6000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [focusDocId, docs]);


  // Business metrics rail — every stat answers a concrete KB question.
  const totalActive = docs.filter((d) => d.is_active).length;
  const criticalCount = docs.filter((d) => d.is_critical && d.is_active).length;
  const processingCount = docs.filter((d) => d.status === "processing").length;
  const failedCount = docs.filter((d) => d.status === "failed").length;
  const totalChunks = docs.reduce((a, d) => a + (d.chunk_count || 0), 0);

  const lifecycleSummary = summarizeLifecycle(docs.filter((d) => d.is_active));

  const visibleDocs = docs.filter((d) => {
    if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
    if (freshness !== "all" && documentLifecycle(d).state !== freshness) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.doc_code || "").toLowerCase().includes(q) ||
        (d.content_text || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <ModulePage
      eyebrow="Knowledge"
      title={t("knowledge")}
      description={t("documentsDesc")}
      toolbar={
        <>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, codes, content…"
            className="h-9 max-w-xs bg-card"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
              All
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              >
                {c}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={freshness === "all"} onClick={() => setFreshness("all")}>
              Any age
            </FilterChip>
            <FilterChip active={freshness === "outdated"} onClick={() => setFreshness("outdated")}>
              Review overdue ({lifecycleSummary.outdated})
            </FilterChip>
            <FilterChip
              active={freshness === "review_soon"}
              onClick={() => setFreshness("review_soon")}
            >
              Due soon ({lifecycleSummary.reviewSoon})
            </FilterChip>
            <FilterChip active={freshness === "fresh"} onClick={() => setFreshness("fresh")}>
              Up to date ({lifecycleSummary.fresh})
            </FilterChip>
          </div>
        </>
      }
      actions={
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
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("upload")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("uploadDoc")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label>{t("title")}</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Transport Delay Management"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("docCode")}</Label>
                      <Input
                        value={docCode}
                        onChange={(e) => setDocCode(e.target.value)}
                        placeholder="SOP-004"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("category")}</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("file")}{" "}
                      <span className="text-muted-foreground text-xs">
                        (PDF, DOCX, TXT, MD — max 20 MB)
                      </span>
                    </Label>
                    <Input
                      type="file"
                      accept=".pdf,.txt,.md,.docx,application/pdf,text/plain"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The document is indexed for grounded AI answers — the assistant only cites
                      uploaded SOPs and FAQs.
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={busy} className="w-full">
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("processing")}
                        </>
                      ) : (
                        t("uploadAndIndex")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <BentoGrid>
        <BentoItem span={3} index={0}>
          <MetricTile
            icon={BookOpen}
            label="Active documents"
            value={totalActive}
            hint="Currently indexed"
          />
        </BentoItem>
        <BentoItem span={3} index={1}>
          <MetricTile
            icon={Sparkles}
            label="Indexed chunks"
            value={totalChunks.toLocaleString()}
            hint="AI-searchable knowledge units"
            tone="gold"
          />
        </BentoItem>
        <BentoItem span={3} index={2}>
          <MetricTile
            icon={ShieldAlert}
            label="Critical SOPs"
            value={criticalCount}
            hint="Require acknowledgement"
            tone={criticalCount > 0 ? "warning" : "default"}
          />
        </BentoItem>
        <BentoItem span={3} index={3}>
          <Panel glass bodyClassName="flex items-center gap-4 p-4">
            <ProgressRing
              value={
                totalActive + failedCount === 0
                  ? 0
                  : Math.round((totalActive / (totalActive + failedCount + processingCount)) * 100)
              }
              size={64}
            />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Index health
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {processingCount > 0
                  ? `${processingCount} indexing…`
                  : failedCount > 0
                    ? `${failedCount} need re-indexing`
                    : "All documents indexed"}
              </p>
            </div>
          </Panel>
        </BentoItem>
      </BentoGrid>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4 flex items-start gap-3"
            >
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleDocs.length === 0 ? (
        <EmptyState
          illustration={docs.length === 0 ? emptyKnowledgeIllustration : undefined}
          icon={docs.length === 0 ? undefined : Archive}
          title={docs.length === 0 ? t("noDocs") : "No documents match your filters"}
          description={
            docs.length === 0
              ? "Upload your first SOP, manual or procedure to make it searchable by the OPSQAI AI."
              : "Try a different category or clear the search to see more results."
          }
          action={
            canEdit && docs.length === 0 ? (
              <Button onClick={() => setOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t("upload")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {visibleDocs.map((d) => (
            <Card
              key={d.id}
              className={`relative p-4 flex items-start gap-3 transition-all hover:shadow-md ${!d.is_active ? "opacity-60" : ""} ${d.is_critical ? "border-[var(--gold-line)] bg-[var(--gold-soft)]/30" : ""}`}
            >
              {d.is_critical && d.is_active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gold"
                />
              )}
              <div className="h-10 w-10 rounded-lg bg-primary/5 border border-border grid place-items-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.doc_code && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {d.doc_code}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    v{d.version}
                  </Badge>
                  {!d.is_active && (
                    <Badge variant="outline" className="text-[10px]">
                      Archived
                    </Badge>
                  )}
                  {d.is_critical && (
                    <Badge className="text-[10px] bg-amber-600 hover:bg-amber-600">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                  <div className="font-medium truncate">{d.title}</div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono uppercase tracking-wider">{d.category}</span>
                  <span>·</span>
                  <span>{d.chunk_count} chunks</span>
                  <span>·</span>
                  <span>Updated {new Date(d.updated_at || d.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  {(() => {
                    const lc = documentLifecycle(d);
                    return (
                      <>
                        <span>{lc.ageLabel}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${lifecycleBadgeClass(lc.state)}`}
                        >
                          {lc.label}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
                {d.change_notes && (
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    "{d.change_notes}"
                  </div>
                )}
                {d.status === "failed" && d.error && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{d.error}</span>
                  </div>
                )}
                {d.content_text && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {d.content_text.slice(0, 300)}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openMetadata(d)}
                    aria-label="Edit lifecycle metadata"
                    title="Lifecycle & review cadence"
                    className="p-2 text-muted-foreground hover:text-primary"
                  >
                    <CalendarClock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onMarkReviewed(d)}
                    aria-label="Mark reviewed"
                    title="Mark as reviewed today"
                    className="p-2 text-muted-foreground hover:text-primary"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openVersions(d)}
                    aria-label="Version history"
                    title="Version history"
                    className="p-2 text-muted-foreground hover:text-primary"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  {d.is_active && (
                    <button
                      onClick={() => setReplaceTarget(d)}
                      aria-label="Replace with new version"
                      title="Upload new version"
                      className="p-2 text-muted-foreground hover:text-primary"
                    >
                      <GitBranch className="h-4 w-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => onToggleCritical(d)}
                      aria-label="Toggle critical"
                      title={d.is_critical ? "Unmark critical" : "Mark as critical"}
                      className={`p-2 ${d.is_critical ? "text-amber-600" : "text-muted-foreground hover:text-amber-600"}`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onReprocess(d.id)}
                    aria-label="Re-index"
                    title="Re-index"
                    className="p-2 text-muted-foreground hover:text-primary"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onDelete(d.id)}
                      aria-label="Delete"
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Lifecycle metadata dialog */}
      <Dialog open={!!metaTarget} onOpenChange={(o) => !o && setMetaTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document lifecycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {metaTarget?.title} — the information date drives the age shown in the library and the
              AI Audit freshness score.
            </p>
            <div className="space-y-2">
              <Label>Information last updated</Label>
              <Input
                type="date"
                value={metaInfoDate}
                onChange={(e) => setMetaInfoDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Review cadence (days)</Label>
              <Input
                type="number"
                min={7}
                max={3650}
                value={metaInterval}
                onChange={(e) => setMetaInterval(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default {DEFAULT_REVIEW_INTERVAL_DAYS} days. Documents past their cadence are
                flagged as review overdue.
              </p>
            </div>
            {metaTarget?.last_reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Last reviewed {new Date(metaTarget.last_reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaTarget(null)}>
              Cancel
            </Button>
            <Button onClick={onSaveMetadata} disabled={metaSaving}>
              {metaSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace dialog */}
      <Dialog
        open={!!replaceTarget}
        onOpenChange={(o) => {
          if (!o) {
            setReplaceTarget(null);
            setReplaceFile(null);
            setReplaceNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>
              {replaceTarget && (
                <>
                  Replacing <span className="font-medium">{replaceTarget.title}</span> (v
                  {replaceTarget.version}). The previous version will be archived.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReplace} className="space-y-4">
            <div className="space-y-2">
              <Label>New file</Label>
              <Input
                type="file"
                accept=".pdf,.txt,.md,.docx,application/pdf,text/plain"
                onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                Change notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                value={replaceNotes}
                onChange={(e) => setReplaceNotes(e.target.value)}
                placeholder="What changed in this version?"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !replaceFile} className="w-full">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Upload new version"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      <Dialog
        open={!!versionsFor}
        onOpenChange={(o) => {
          if (!o) {
            setVersionsFor(null);
            setVersions([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            {versionsFor && <DialogDescription>{versionsFor.title}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {versions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No history yet.</div>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="rounded-md border border-border p-3 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        v{v.version}
                      </Badge>
                      {v.is_active && <Badge className="text-[10px]">Active</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    {v.change_notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        "{v.change_notes}"
                      </p>
                    )}
                  </div>
                  {!v.is_active && isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => onRollback(v.id)}>
                      <RotateCcw className="h-3 w-3 mr-1.5" /> Restore
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} kind="kb" onDeleted={load} />
    </ModulePage>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Failed
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  spin = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
  tone?: "default" | "gold" | "warning" | "danger" | "info";
  spin?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-primary/5 text-primary border-border",
    gold: "bg-[var(--gold-soft)] text-gold border-[var(--gold-line)]",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  };
  return (
    <Card className="p-4 flex items-start gap-3 transition-shadow hover:shadow-sm">
      <div
        className={`h-10 w-10 rounded-lg grid place-items-center border shrink-0 ${toneClasses[tone]}`}
      >
        <Icon className={`h-5 w-5 ${spin ? "animate-spin" : ""}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          {label}
        </div>
        <div className="font-display text-2xl font-semibold tabular-nums mt-0.5 text-foreground">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border hover:border-gold/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { Panel } from "@/components/ui/panel";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, Download, Upload, HelpCircle, SearchX, Layers } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { upsertFaq, deleteFaq, listFaqs } from "@/lib/faqs.functions";
import { ExportDialog } from "@/components/admin/export-dialog";
import { FaqImportDialog } from "@/components/admin/faq-import-dialog";
import { toast } from "sonner";
import { confirmAction } from "@/components/ui/confirm";

export const Route = createFileRoute("/_authenticated/app/faq")({
  head: () => ({
    meta: [
      { title: "FAQs — OPSQAI" },
      {
        name: "description",
        content:
          "Frequently asked logistics and warehouse questions answered for your team in OPSQAI.",
      },
      { property: "og:title", content: "FAQs — OPSQAI" },
      {
        property: "og:description",
        content:
          "Frequently asked logistics and warehouse questions answered for your team in OPSQAI.",
      },
      { property: "og:url", content: "https://opsqai.lovable.app/faq" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.lovable.app/faq" }],
  }),
  component: FaqPage,
});

interface Faq {
  id: string;
  question_de: string;
  question_en: string;
  answer_de: string;
  answer_en: string;
  category: string;
}

function FaqPage() {
  const { t, lang } = useT();
  const { isAdmin, scopeCompanyId, hasAnyPermission } = useAuth();
  // Mirrors faqs.functions.ts / faq-import.functions.ts requirements.
  const canEditFaq =
    isAdmin || hasAnyPermission("faq.edit", "faq.create", "faq.delete", "knowledge.manage");

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const save = useServerFn(upsertFaq);
  const del = useServerFn(deleteFaq);
  const fetchFaqs = useServerFn(listFaqs);

  const load = async () => {
    // Reads go through a server fn so both Cloud (Supabase/RLS) and
    // Self-Hosted (local Postgres) resolve through their own repository.
    const rows = await fetchFaqs({ data: { company_id: scopeCompanyId ?? null } });
    setFaqs((rows ?? []) as unknown as Faq[]);
    setLoading(false);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [scopeCompanyId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      id: editing?.id,
      question_de: String(fd.get("qde") ?? ""),
      question_en: String(fd.get("qen") ?? ""),
      answer_de: String(fd.get("ade") ?? ""),
      answer_en: String(fd.get("aen") ?? ""),
      category: String(fd.get("cat") ?? "general"),
      // Anchor new FAQs to the active workspace so platform admins working
      // inside a tenant don't accidentally write to their home company.
      company_id: scopeCompanyId ?? undefined,
    };
    try {
      await save({ data: payload });
      setOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(String(err));
    }
  };

  const onDelete = async (id: string) => {
    if (!(await confirmAction({ title: "Delete this FAQ?", confirmLabel: "Delete" }))) return;
    try {
      await del({ data: { id } });
      load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const [category, setCategory] = useState<string>("all");

  const categories = Array.from(new Set(faqs.map((f) => f.category || "general"))).sort();

  const filtered = faqs.filter((f) => {
    const q = search.toLowerCase();
    const inCat = category === "all" || (f.category || "general") === category;
    return (
      inCat &&
      (!q ||
        f.question_de.toLowerCase().includes(q) ||
        f.question_en.toLowerCase().includes(q) ||
        f.answer_de.toLowerCase().includes(q) ||
        f.answer_en.toLowerCase().includes(q))
    );
  });

  const avgAnswerLength = faqs.length
    ? Math.round(
        faqs.reduce((sum, f) => sum + (lang === "de" ? f.answer_de : f.answer_en).length, 0) /
          faqs.length,
      )
    : 0;

  const bilingual = faqs.filter(
    (f) => f.question_de.trim() && f.question_en.trim() && f.answer_de.trim() && f.answer_en.trim(),
  ).length;
  const coverage = faqs.length ? Math.round((bilingual / faqs.length) * 100) : 0;

  return (
    <ModulePage
      eyebrow="Knowledge"
      title={t("faq")}
      description="Curated answers your assistant can quote verbatim. Keep both languages complete so every user gets a grounded reply."
      tabs={
        categories.length > 0 ? (
          <SegmentedTabs
            size="sm"
            ariaLabel="FAQ category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All", count: faqs.length },
              ...categories.map((c) => ({
                value: c,
                label: c,
                count: faqs.filter((f) => (f.category || "general") === c).length,
              })),
            ]}
          />
        ) : undefined
      }
      toolbar={
        <>
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-xs"
          />
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filtered.length} / {faqs.length}
          </span>
        </>
      }
      actions={
        <div className="flex items-center gap-2">
          {canEditFaq && (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          )}
          {canEditFaq && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
          )}
          {canEditFaq && (
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addFaq")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? t("edit") : t("addFaq")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t("category")}</Label>
                    <Input name="cat" defaultValue={editing?.category ?? "general"} required />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("question")} (DE)</Label>
                      <Textarea name="qde" rows={2} defaultValue={editing?.question_de} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("question")} (EN)</Label>
                      <Textarea name="qen" rows={2} defaultValue={editing?.question_en} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("answer")} (DE)</Label>
                      <Textarea name="ade" rows={5} defaultValue={editing?.answer_de} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("answer")} (EN)</Label>
                      <Textarea name="aen" rows={5} defaultValue={editing?.answer_en} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {t("save")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <BentoGrid>
        <BentoItem span={3} index={0}>
          <MetricTile label="Total FAQs" value={faqs.length} icon={HelpCircle} tone="gold" />
        </BentoItem>
        <BentoItem span={3} index={1}>
          <MetricTile label="Categories" value={categories.length} icon={Layers} />
        </BentoItem>
        <BentoItem span={3} index={2}>
          <MetricTile
            label="Bilingual coverage"
            value={`${coverage}%`}
            hint={`${bilingual} of ${faqs.length} complete in DE + EN`}
            tone={coverage >= 90 ? "success" : coverage >= 60 ? "warning" : "danger"}
          />
        </BentoItem>
        <BentoItem span={3} index={3}>
          <MetricTile
            label="Avg. answer length"
            value={`${avgAnswerLength}`}
            hint="characters — keep answers concise and quotable"
          />
        </BentoItem>

        <BentoItem span={12} index={4}>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border bg-card p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Panel>
              <EmptyState
                icon={faqs.length === 0 ? HelpCircle : SearchX}
                title={faqs.length === 0 ? t("noFaqs") : "No FAQs match your search"}
                description={
                  faqs.length === 0
                    ? undefined
                    : "Try a different search term or clear the search to see all FAQs."
                }
              />
            </Panel>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((f, i) => (
                <div
                  key={f.id}
                  className="oq-enter min-w-0"
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                >
                  <Panel
                    className="oq-lift"
                    title={lang === "de" ? f.question_de : f.question_en}
                    description={f.category || "general"}
                    icon={HelpCircle}
                    actions={
                      canEditFaq ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("edit")}
                            className="h-7 w-7"
                            onClick={() => {
                              setEditing(f);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("delete")}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(f.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : undefined
                    }
                  >
                    <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {lang === "de" ? f.answer_de : f.answer_en}
                    </p>
                  </Panel>
                </div>
              ))}
            </div>
          )}
        </BentoItem>
      </BentoGrid>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} kind="faq" onDeleted={load} />
      <FaqImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        companyId={scopeCompanyId ?? null}
        onImported={load}
      />
    </ModulePage>
  );
}

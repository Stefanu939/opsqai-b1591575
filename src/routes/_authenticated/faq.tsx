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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { upsertFaq, deleteFaq } from "@/lib/faqs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "FAQs — LogiAssist" },
      { name: "description", content: "Frequently asked logistics and warehouse questions answered for your team in LogiAssist." },
      { property: "og:title", content: "FAQs — LogiAssist" },
      { property: "og:description", content: "Frequently asked logistics and warehouse questions answered for your team in LogiAssist." },
      { property: "og:url", content: "https://logiassist.lovable.app/faq" },
    ],
    links: [{ rel: "canonical", href: "https://logiassist.lovable.app/faq" }],
  }),
  component: FaqPage,
});

interface Faq { id: string; question_de: string; question_en: string; answer_de: string; answer_en: string; category: string }

function FaqPage() {
  const { t, lang } = useT();
  const { isAdmin } = useAuth();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [search, setSearch] = useState("");
  const save = useServerFn(upsertFaq);
  const del = useServerFn(deleteFaq);

  const load = async () => {
    const { data } = await supabase.from("faqs").select("*").order("category");
    setFaqs((data ?? []) as Faq[]);
  };
  useEffect(() => { load(); }, []);

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
    };
    try { await save({ data: payload }); setOpen(false); setEditing(null); load(); }
    catch (err) { toast.error(String(err)); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    try { await del({ data: { id } }); load(); } catch (e) { toast.error(String(e)); }
  };

  const filtered = faqs.filter((f) => {
    const q = search.toLowerCase();
    return !q || f.question_de.toLowerCase().includes(q) || f.question_en.toLowerCase().includes(q) || f.answer_de.toLowerCase().includes(q) || f.answer_en.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("faq")}</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t("addFaq")}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? t("edit") : t("addFaq")}</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-2"><Label>{t("category")}</Label><Input name="cat" defaultValue={editing?.category ?? "general"} required /></div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t("question")} (DE)</Label><Textarea name="qde" rows={2} defaultValue={editing?.question_de} required /></div>
                  <div className="space-y-2"><Label>{t("question")} (EN)</Label><Textarea name="qen" rows={2} defaultValue={editing?.question_en} required /></div>
                  <div className="space-y-2"><Label>{t("answer")} (DE)</Label><Textarea name="ade" rows={5} defaultValue={editing?.answer_de} required /></div>
                  <div className="space-y-2"><Label>{t("answer")} (EN)</Label><Textarea name="aen" rows={5} defaultValue={editing?.answer_en} required /></div>
                </div>
                <Button type="submit" className="w-full">{t("save")}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">{t("noFaqs")}</Card>
      ) : (
        <Card className="p-2">
          <Accordion type="single" collapsible>
            {filtered.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="px-3 text-left">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mr-2">{f.category}</span>
                    {lang === "de" ? f.question_de : f.question_en}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{lang === "de" ? f.answer_de : f.answer_en}</p>
                  {isAdmin && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-3 w-3 mr-1" />{t("edit")}</Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(f.id)}><Trash2 className="h-3 w-3 mr-1" />{t("delete")}</Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}
    </div>
  );
}

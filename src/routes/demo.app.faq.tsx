import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import { useDemoReadOnly } from "@/components/demo/read-only-dialog";
import { HelpCircle, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/demo/app/faq")({
  component: DemoFaqPage,
});

type Faq = {
  id: string;
  question_en: string;
  question_de: string;
  answer_en: string;
  answer_de: string;
  category: string;
  updated_at: string;
};

function DemoFaqPage() {
  const { show } = useDemoReadOnly();
  const [rows, setRows] = useState<Faq[]>([]);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"en" | "de">("en");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("faqs")
        .select("*")
        .eq("company_id", DEMO_COMPANY_ID)
        .order("updated_at", { ascending: false });
      setRows((data ?? []) as Faq[]);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.question_en + r.question_de + r.answer_en + r.answer_de + r.category)
      .toLowerCase()
      .includes(s);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Frequently asked operational questions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bilingual, tied to SOPs, ready for the AI to cite.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => show("Add a FAQ entry")}
        >
          <Plus className="h-4 w-4" /> New FAQ
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="pl-8"
          />
        </div>
        <div className="flex rounded-md border border-border/60 p-0.5">
          {(["en", "de"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-xs rounded ${lang === l ? "bg-muted font-medium" : "text-muted-foreground"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="chip !text-[10px]">{f.category}</span>
            </div>
            <div className="font-medium">{lang === "en" ? f.question_en : f.question_de}</div>
            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {lang === "en" ? f.answer_en : f.answer_de}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No FAQs match your search.
          </div>
        )}
      </div>
    </div>
  );
}

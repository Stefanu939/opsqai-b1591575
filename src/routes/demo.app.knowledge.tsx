import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import { useDemoReadOnly } from "@/components/demo/read-only-dialog";
import { BookOpen, FileText, ShieldAlert, Upload, Search } from "lucide-react";
import { personaFor } from "@/lib/demo/personas";

export const Route = createFileRoute("/demo/app/knowledge")({
  component: DemoKnowledgePage,
});

type Doc = {
  id: string; title: string; doc_code: string | null; category: string;
  section: string | null; is_critical: boolean; updated_at: string;
  content_text: string; uploaded_by: string | null;
};

const CAT_LABEL: Record<string, string> = {
  sop: "SOP", policy: "Policy", work_instruction: "Work instruction", manual: "Manual",
};

function DemoKnowledgePage() {
  const { show } = useDemoReadOnly();
  const [rows, setRows] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("knowledge_documents")
        .select("id,title,doc_code,category,section,is_critical,updated_at,content_text,uploaded_by")
        .eq("company_id", DEMO_COMPANY_ID).eq("is_active", true)
        .order("updated_at", { ascending: false });
      setRows((data ?? []) as Doc[]);
      if (data && data[0]) setSelected(data[0] as Doc);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.doc_code ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">SOPs, policies & work instructions</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Governed operational knowledge — every document has a code, owner, department and revision.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => show("Upload a document")}>
          <Upload className="h-4 w-4" /> Upload document
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[380px,1fr]">
        <div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="pl-8" />
          </div>
          <div className="mt-3 space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((d) => {
              const p = personaFor(d.uploaded_by);
              const isActive = selected?.id === d.id;
              return (
                <button key={d.id} onClick={() => setSelected(d)} className={`w-full text-left rounded-md border p-3 transition-colors ${isActive ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}>
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-primary font-semibold">{d.doc_code}</span>
                        <span className="chip !text-[10px] !py-0 !px-1.5">{CAT_LABEL[d.category] ?? d.category}</span>
                        {d.is_critical && <span className="chip !text-[10px] !py-0 !px-1.5 !border-destructive/30 !bg-destructive/10 !text-destructive"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Critical</span>}
                      </div>
                      <div className="text-sm font-medium mt-1 truncate">{d.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {p ? `by ${p.name} · ` : ""}Updated {new Date(d.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="p-6">
          {selected ? (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-primary font-semibold">{selected.doc_code}</span>
                <span className="chip !text-[11px]">{CAT_LABEL[selected.category] ?? selected.category}</span>
                {selected.section && <span className="chip !text-[11px]">{selected.section}</span>}
                {selected.is_critical && <span className="chip !text-[11px] !border-destructive/30 !bg-destructive/10 !text-destructive">Critical SOP</span>}
              </div>
              <h2 className="mt-2 text-xl font-semibold">{selected.title}</h2>
              <div className="text-xs text-muted-foreground mt-1">
                {(() => { const p = personaFor(selected.uploaded_by); return p ? `Owner: ${p.name} · ` : ""; })()}
                Last updated {new Date(selected.updated_at).toLocaleString()}
              </div>
              <div className="mt-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {selected.content_text}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => show("Edit a document")}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => show("Request approval")}>Request approval</Button>
                <Button variant="outline" size="sm" onClick={() => show("Archive document")}>Archive</Button>
              </div>
            </div>
          ) : <div className="text-sm text-muted-foreground">Select a document…</div>}
        </Card>
      </div>
    </div>
  );
}

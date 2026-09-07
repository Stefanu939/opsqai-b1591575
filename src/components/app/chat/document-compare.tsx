// Grounded side-by-side document comparison inside the chat workspace.
// Search the company library, pick two documents, ask a question — the answer
// only ever uses text from those two documents.
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GitCompare, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { compareDocuments, listComparableDocuments } from "@/lib/doc-compare.functions";

type Doc = { id: string; title: string; docCode: string | null; category: string | null };

const COPY = {
  en: {
    open: "Compare documents",
    title: "Compare two documents",
    body: "Search your library, pick two documents and ask what should be compared.",
    search: "Search documents…",
    question: "What should be compared? (optional)",
    run: "Compare",
    empty: "No documents match this search.",
    pick: "Select exactly two documents.",
    a: "A",
    b: "B",
  },
  de: {
    open: "Dokumente vergleichen",
    title: "Zwei Dokumente vergleichen",
    body: "Bibliothek durchsuchen, zwei Dokumente auswählen und die Frage stellen.",
    search: "Dokumente suchen…",
    question: "Was soll verglichen werden? (optional)",
    run: "Vergleichen",
    empty: "Keine Dokumente zu dieser Suche.",
    pick: "Bitte genau zwei Dokumente auswählen.",
    a: "A",
    b: "B",
  },
  ro: {
    open: "Compară documente",
    title: "Compară două documente",
    body: "Caută în bibliotecă, alege două documente și spune ce vrei să compari.",
    search: "Caută documente…",
    question: "Ce vrei să compari? (opțional)",
    run: "Compară",
    empty: "Niciun document pentru această căutare.",
    pick: "Selectează exact două documente.",
    a: "A",
    b: "B",
  },
} as const;

export function DocumentCompare() {
  const { lang } = useT();
  const t = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : "en"];
  const { scopeCompanyId } = useAuth();
  const load = useServerFn(listComparableDocuments);
  const run = useServerFn(compareDocuments);

  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load({ data: { companyId: scopeCompanyId ?? undefined } })
      .then((rows) => setDocs(rows as Doc[]))
      .catch((e: Error) => toast.error(e.message));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, scopeCompanyId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? docs.filter((d) =>
          `${d.title} ${d.docCode ?? ""} ${d.category ?? ""}`.toLowerCase().includes(q),
        )
      : docs;
    return rows.slice(0, 60);
  }, [docs, query]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));

  const submit = async () => {
    if (picked.length !== 2) {
      toast.error(t.pick);
      return;
    }
    setBusy(true);
    setAnswer(null);
    try {
      const res = await run({
        data: {
          leftId: picked[0]!,
          rightId: picked[1]!,
          question: question.trim() || undefined,
          language: (lang === "de" || lang === "ro" ? lang : "en") as "en" | "de" | "ro",
          companyId: scopeCompanyId ?? undefined,
        },
      });
      setAnswer(`${res.left.title} ↔ ${res.right.title}\n\n${res.answer}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="mr-2 h-4 w-4" />
          {t.open}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.body}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="pl-9"
          />
        </div>

        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{t.empty}</p>
          ) : (
            filtered.map((d) => {
              const idx = picked.indexOf(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60 ${
                    idx >= 0 ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="truncate">
                    {d.docCode ? `${d.docCode} — ` : ""}
                    {d.title}
                  </span>
                  {idx >= 0 ? (
                    <span className="rounded-sm bg-primary px-1.5 text-[11px] text-primary-foreground">
                      {idx === 0 ? t.a : t.b}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.question}
        />

        <div className="flex justify-end">
          <Button onClick={() => void submit()} disabled={busy || picked.length !== 2}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t.run}
          </Button>
        </div>

        {answer ? (
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-card p-3 text-sm">
            {answer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

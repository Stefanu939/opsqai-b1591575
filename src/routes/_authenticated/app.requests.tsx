import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listInternalRequests,
  updateInternalRequest,
  promoteRequestToFaq,
  promoteRequestToKb,
} from "@/lib/internal-requests.functions";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, BookOpenCheck, FileText, MessageSquare, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/requests")({
  component: RequestsPage,
});

type Req = {
  id: string;
  question: string;
  context: string | null;
  status: "open" | "in_review" | "answered" | "closed";
  priority: "low" | "normal" | "high";
  answer: string | null;
  created_at: string;
  answered_at: string | null;
  user_id: string;
  author_name: string | null;
  answered_by_name: string | null;
  department_name: string | null;
  promoted_to_faq_id: string | null;
  promoted_to_kb_id: string | null;
};

function statusVariant(s: Req["status"]): "default" | "secondary" | "outline" {
  if (s === "open") return "default";
  if (s === "answered") return "secondary";
  return "outline";
}

function RequestsPage() {
  const { t } = useT();
  const T = t as (k: string) => string;
  const { isAdmin, isManager, isPlatformAdmin, scopeCompanyId } = useAuth();
  const isStaff = isAdmin || isManager || isPlatformAdmin;
  const [tab, setTab] = useState<"all" | "mine">(isStaff ? "all" : "mine");
  const [filter, setFilter] = useState<"open" | "in_review" | "answered" | "closed" | "all">("open");
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Req | null>(null);
  const [mode, setMode] = useState<"answer" | "faq" | "kb" | null>(null);

  const list = useServerFn(listInternalRequests);
  const update = useServerFn(updateInternalRequest);
  const toFaq = useServerFn(promoteRequestToFaq);
  const toKb = useServerFn(promoteRequestToKb);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await list({ data: {
        mine: tab === "mine",
        status: filter,
        // Honor the active workspace context (platform admins only).
        companyId: scopeCompanyId ?? undefined,
      } });
      setRows(data as Req[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, filter, scopeCompanyId]);

  const counts = useMemo(() => ({
    open: rows.filter((r) => r.status === "open").length,
  }), [rows]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{T("internalRequests")}</h1>
            {counts.open > 0 && <Badge variant="default">{counts.open} {T("open").toLowerCase()}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{T("internalRequestsDesc")}</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {isStaff && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "mine")}>
              <TabsList>
                <TabsTrigger value="all">{T("allRequests")}</TabsTrigger>
                <TabsTrigger value="mine">{T("mine")}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{T("open")}</SelectItem>
              <SelectItem value="in_review">{T("inReview")}</SelectItem>
              <SelectItem value="answered">{T("answered")}</SelectItem>
              <SelectItem value="closed">{T("closed")}</SelectItem>
              <SelectItem value="all">— {T("allRequests")} —</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border rounded-lg">{T("noRequests")}</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant={statusVariant(r.status)} className="capitalize">{T(r.status === "in_review" ? "inReview" : r.status)}</Badge>
                      {r.priority !== "normal" && (
                        <Badge variant="outline" className="capitalize">{T(r.priority)}</Badge>
                      )}
                      {r.promoted_to_faq_id && <Badge variant="secondary" className="gap-1"><BookOpenCheck className="h-3 w-3" />FAQ</Badge>}
                      {r.promoted_to_kb_id && <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />KB</Badge>}
                    </div>
                    <p className="text-sm font-medium leading-snug">{r.question}</p>
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3 flex-wrap">
                      <span>{T("askedBy")}: {r.author_name ?? "—"}</span>
                      {r.department_name && <span>· {r.department_name}</span>}
                      <span>· {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.answer && (
                      <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("answer")}</div>
                        {r.answer}
                      </div>
                    )}
                  </div>
                  {isStaff && r.status !== "closed" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => { setActive(r); setMode("answer"); }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />{T("answerThis")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setActive(r); setMode("faq"); }}>
                        <BookOpenCheck className="h-3.5 w-3.5 mr-1.5" />{T("addToFaq")}
                      </Button>
                      {(isAdmin || isManager || isPlatformAdmin) && (
                        <Button size="sm" variant="outline" onClick={() => { setActive(r); setMode("kb"); }}>
                          <FileText className="h-3.5 w-3.5 mr-1.5" />{T("addToKb")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {active && mode === "answer" && (
        <AnswerDialog
          req={active}
          T={T}
          onClose={() => { setActive(null); setMode(null); }}
          onSave={async (answer, status) => {
            await update({ data: { id: active.id, answer, status } });
            setActive(null); setMode(null); await reload();
          }}
        />
      )}
      {active && mode === "faq" && (
        <FaqDialog
          req={active}
          T={T}
          onClose={() => { setActive(null); setMode(null); }}
          onSubmit={async (payload) => {
            await toFaq({ data: { id: active.id, ...payload } });
            setActive(null); setMode(null); await reload();
          }}
        />
      )}
      {active && mode === "kb" && (
        <KbDialog
          req={active}
          T={T}
          onClose={() => { setActive(null); setMode(null); }}
          onSubmit={async (payload) => {
            await toKb({ data: { id: active.id, ...payload } });
            setActive(null); setMode(null); await reload();
          }}
        />
      )}
    </div>
  );
}

function AnswerDialog({ req, T, onClose, onSave }: {
  req: Req; T: (k: string) => string; onClose: () => void;
  onSave: (answer: string, status: "answered" | "in_review" | "closed") => Promise<void>;
}) {
  const [answer, setAnswer] = useState(req.answer ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{T("answerThis")}</DialogTitle>
          <DialogDescription>{req.question}</DialogDescription>
        </DialogHeader>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} placeholder={T("answer")} />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{T("cancel")}</Button>
          <Button variant="outline" onClick={async () => { setBusy(true); await onSave(answer, "in_review"); }} disabled={busy || !answer.trim()}>
            {T("inReview")}
          </Button>
          <Button onClick={async () => { setBusy(true); await onSave(answer, "answered"); }} disabled={busy || !answer.trim()}>
            <Check className="h-3.5 w-3.5 mr-1.5" />{T("answered")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FaqDialog({ req, T, onClose, onSubmit }: {
  req: Req; T: (k: string) => string; onClose: () => void;
  onSubmit: (p: { question_en: string; question_de: string; answer_en: string; answer_de: string; category: string }) => Promise<void>;
}) {
  const [qEn, setQEn] = useState(req.question);
  const [qDe, setQDe] = useState(req.question);
  const [aEn, setAEn] = useState(req.answer ?? "");
  const [aDe, setADe] = useState(req.answer ?? "");
  const [cat, setCat] = useState("general");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await onSubmit({ question_en: qEn, question_de: qDe, answer_en: aEn, answer_de: aDe, category: cat }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{T("addToFaq")}</DialogTitle>
          <DialogDescription>{T("internalRequestsDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Question (EN)</label>
            <Textarea rows={2} value={qEn} onChange={(e) => setQEn(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Frage (DE)</label>
            <Textarea rows={2} value={qDe} onChange={(e) => setQDe(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Answer (EN)</label>
            <Textarea rows={4} value={aEn} onChange={(e) => setAEn(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Antwort (DE)</label>
            <Textarea rows={4} value={aDe} onChange={(e) => setADe(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">{T("category")}</label>
            <Input value={cat} onChange={(e) => setCat(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{T("cancel")}</Button>
          <Button onClick={submit} disabled={busy || !qEn || !qDe || !aEn || !aDe || !cat}>{T("submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KbDialog({ req, T, onClose, onSubmit }: {
  req: Req; T: (k: string) => string; onClose: () => void;
  onSubmit: (p: { title: string; category: string; doc_code?: string | null; source_owner: string; content: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [docCode, setDocCode] = useState("");
  const [owner, setOwner] = useState("");
  const [content, setContent] = useState(req.answer ? `Q: ${req.question}\n\nA: ${req.answer}` : `Q: ${req.question}\n\nA: `);
  const [busy, setBusy] = useState(false);
  const valid = title.trim().length >= 3 && category.trim() && owner.trim() && content.trim().length >= 20;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{T("confirmKbCreation")}</DialogTitle>
          <DialogDescription>Formal company knowledge requires title, category, and source owner.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium">{T("title")} *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Night Shift Overtime Approval" />
          </div>
          <div>
            <label className="text-xs font-medium">{T("category")} *</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. operations, safety" />
          </div>
          <div>
            <label className="text-xs font-medium">{T("docCode")}</label>
            <Input value={docCode} onChange={(e) => setDocCode(e.target.value)} placeholder="optional, e.g. SOP-042" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">{T("sourceOwner")} *</label>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Operations Manager — A. Müller" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">Content *</label>
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{T("cancel")}</Button>
          <Button onClick={async () => {
            setBusy(true);
            try { await onSubmit({ title, category, doc_code: docCode || null, source_owner: owner, content }); }
            finally { setBusy(false); }
          }} disabled={busy || !valid}>{T("submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

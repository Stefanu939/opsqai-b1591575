// OPSQAI HR — Candidate file: editable extracted data, strengths/risks, grounded CV Q&A
// (any language), interview notes, PDF export, and side-by-side comparison.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { askHrCandidate, compareHrCandidates, exportHrCandidatePdf, updateHrCandidate } from "@/lib/hr-ext.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrCandidate } from "@/lib/hr/types-ext";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import type { HrUi } from "@/i18n/pages/hr";
import { useHrLang } from "./use-hr-ws";
import { Field } from "./shared";

export function CandidateFileDialog({
  c,
  t,
  w,
  h,
  canEdit,
  blind,
  onClose,
  onChanged,
}: {
  c: HrCandidate;
  t: HrExtUi;
  w: HrWsUi;
  h: HrUi;
  canEdit: boolean;
  blind: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const lang = useHrLang();
  const update = useServerFn(updateHrCandidate);
  const ask = useServerFn(askHrCandidate);
  const exportPdf = useServerFn(exportHrCandidatePdf);
  const [f, setF] = useState({
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    interview_notes: c.interview_notes ?? "",
    extracted: { ...(c.extracted ?? {}) } as Record<string, string>,
  });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [qa, setQa] = useState(c.qa ?? []);

  const save = () =>
    void update({
      data: {
        id: c.id,
        first_name: f.first_name || null,
        last_name: f.last_name || null,
        email: f.email || null,
        phone: f.phone || null,
        interview_notes: f.interview_notes || null,
        extracted: f.extracted,
      },
    })
      .then(() => { toast.success(t.saved); onChanged(); })
      .catch((e: Error) => toast.error(e.message));

  const submit = () => {
    const question = q.trim();
    if (question.length < 3 || busy) return;
    setBusy(true);
    void ask({ data: { id: c.id, question, blind, language: lang } })
      .then((r) => { setQa((h) => [{ question: r.question, answer: r.answer, quote: r.quote, asked_at: r.asked_at }, ...h]); setQ(""); })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };

  const name = blind ? (c.reference ?? "—") : [c.first_name, c.last_name].filter(Boolean).join(" ") || c.reference || "—";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <FileText className="size-4" /> {w.candidateFile} · {name}
            {c.cv_language ? <Badge variant="outline">{w.cvLanguage}: {c.cv_language.toUpperCase()}</Badge> : null}
            {c.score != null ? <Badge>{t.score} {c.score}</Badge> : null}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
          <div className="grid gap-3">
            {!blind ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label={h.firstName}><Input value={f.first_name} disabled={!canEdit} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
                <Field label={h.lastName}><Input value={f.last_name} disabled={!canEdit} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
                <Field label={h.email}><Input value={f.email} disabled={!canEdit} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                <Field label={h.phone}><Input value={f.phone} disabled={!canEdit} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              </div>
            ) : null}
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{w.extractedData} · {w.editExtracted}</p>
            <div className="grid gap-1.5">
              {Object.entries(f.extracted).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[1fr_2fr] items-center gap-2 text-xs">
                  <span className="truncate font-medium">{k.replace(/_/g, " ")}</span>
                  <Input className="h-7 text-xs" value={v} disabled={!canEdit} onChange={(e) => setF({ ...f, extracted: { ...f.extracted, [k]: e.target.value } })} />
                </div>
              ))}
              {Object.keys(f.extracted).length === 0 ? <p className="text-xs text-muted-foreground">{w.notStated}</p> : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-2">
                <p className="text-xs font-medium text-muted-foreground">{w.strengths}</p>
                <ul className="mt-1 grid gap-0.5 text-xs">{(c.strengths ?? []).map((s, i) => <li key={i}>• {s}</li>)}{(c.strengths ?? []).length === 0 ? <li className="text-muted-foreground">—</li> : null}</ul>
              </div>
              <div className="rounded-lg border border-border/60 p-2">
                <p className="text-xs font-medium text-muted-foreground">{w.risks}</p>
                <ul className="mt-1 grid gap-0.5 text-xs">{(c.risks ?? []).map((s, i) => <li key={i}>• {s}</li>)}{(c.risks ?? []).length === 0 ? <li className="text-muted-foreground">—</li> : null}</ul>
              </div>
            </div>
            <Field label={w.interviewNotes}>
              <Textarea value={f.interview_notes} disabled={!canEdit} onChange={(e) => setF({ ...f, interview_notes: e.target.value })} />
            </Field>
          </div>
          <div className="grid content-start gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{w.askCv} · {w.anyLanguage}</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <Input value={q} placeholder={w.askPlaceholder} disabled={busy || !c.has_cv} onChange={(e) => setQ(e.target.value)} />
              <Button type="submit" disabled={busy || q.trim().length < 3 || !c.has_cv}><Send className="size-4" /></Button>
            </form>
            {qa.length === 0 ? <p className="text-xs text-muted-foreground">{w.qaHistory}: —</p> : null}
            <ul className="grid gap-2">
              {qa.map((h, i) => (
                <li key={`${i}-${h.asked_at}`} className="rounded-lg border border-border/60 bg-card/50 p-2 text-xs">
                  <p className="font-medium">{h.question}</p>
                  <p className="mt-1 whitespace-pre-wrap">{h.answer}</p>
                  {h.quote ? <p className="mt-1 border-l-2 border-primary/50 pl-2 italic text-muted-foreground">“{h.quote}”</p> : null}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">{w.humanDecision}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="mr-auto"
            onClick={() =>
              void exportPdf({ data: { id: c.id } })
                .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            <Download className="mr-1.5 size-4" /> {w.candidatePdf}
          </Button>
          <Button variant="ghost" onClick={onClose}>{w.close}</Button>
          {canEdit ? <Button onClick={save}>{t.save}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Comparison = Awaited<ReturnType<typeof compareHrCandidates>>;

export function CandidateComparison({ ids, t, w, blind, onClose }: { ids: string[]; t: HrExtUi; w: HrWsUi; blind: boolean; onClose: () => void }) {
  const compare = useServerFn(compareHrCandidates);
  const [data, setData] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    void compare({ data: { ids } }).then(setData).catch((e: Error) => setError(e.message));
  }
  const verdict = (cid: string, criterion: string) => data?.candidates.find((c) => c.id === cid)?.evidence.find((e) => e.criterion === criterion)?.verdict ?? "unknown";
  const cls = (v: string) => (v === "met" ? "bg-primary/15 text-primary" : v === "partial" ? "bg-muted" : v === "not_met" ? "bg-destructive/15 text-destructive" : "text-muted-foreground");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>{w.comparison}</DialogTitle></DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {data ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="p-2" />
                  {data.candidates.map((c) => (
                    <th key={c.id} className="p-2 align-top">
                      <p className="font-medium">{blind ? c.reference ?? "—" : c.name}</p>
                      <p className="text-muted-foreground">{t.score}: {c.score ?? "—"} · {c.cv_language?.toUpperCase() ?? "—"}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.criteria.map((cr) => (
                  <tr key={cr.label} className="border-t border-border/50">
                    <td className="p-2 font-medium">{cr.label}{cr.required ? " *" : ""} <span className="text-muted-foreground">×{cr.weight}</span></td>
                    {data.candidates.map((c) => {
                      const v = verdict(c.id, cr.label);
                      return <td key={c.id} className="p-2"><span className={`rounded px-1.5 py-0.5 ${cls(v)}`}>{v === "met" ? t.verdictMet : v === "partial" ? t.verdictPartial : v === "not_met" ? t.verdictNotMet : t.verdictUnknown}</span></td>;
                    })}
                  </tr>
                ))}
                <tr className="border-t border-border/50 align-top">
                  <td className="p-2 font-medium">{w.strengths}</td>
                  {data.candidates.map((c) => <td key={c.id} className="p-2">{c.strengths.length ? c.strengths.map((s, i) => <p key={i}>• {s}</p>) : "—"}</td>)}
                </tr>
                <tr className="border-t border-border/50 align-top">
                  <td className="p-2 font-medium">{w.risks}</td>
                  {data.candidates.map((c) => <td key={c.id} className="p-2">{c.risks.length ? c.risks.map((s, i) => <p key={i}>• {s}</p>) : "—"}</td>)}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-muted-foreground">{w.humanDecision}</p>
          </div>
        ) : !error ? <p className="text-sm text-muted-foreground">…</p> : null}
        <DialogFooter><Button onClick={onClose}>{w.close}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

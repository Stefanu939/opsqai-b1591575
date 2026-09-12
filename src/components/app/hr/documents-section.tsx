// OPSQAI HR — documents: employee → document type → generated draft → review/edit
// → approve → PDF → signed copy filed in the employee record.
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Lock, Pencil, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  approveHrDocument,
  deleteHrDocument,
  deleteHrTemplate,
  downloadHrDocument,
  generateHrDocument,
  getHrDocument,
  saveHrTemplate,
  updateHrDocumentDraft,
  uploadHrDocument,
} from "@/lib/hr-ext.functions";
import type { HrDocument } from "@/lib/hr/types-ext";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrDocuments, useHrExtRefresh } from "./use-hr-ext";
import { useHrLang, useHrDocumentLibrary } from "./use-hr-ws";
import { EmployeePicker, Field, fmtDate, selectCls } from "./shared";

type Filter = "all" | "draft" | "review" | "approved" | "file";

export function DocumentsSection({ t, w, initialDocId }: { t: HrExtUi; w: HrWsUi; initialDocId?: string | null }) {
  const query = useHrDocuments();
  const library = useHrDocumentLibrary();
  const lang = useHrLang();
  const refresh = useHrExtRefresh();
  const generate = useServerFn(generateHrDocument);
  const upload = useServerFn(uploadHrDocument);
  const remove = useServerFn(deleteHrDocument);
  const saveTemplate = useServerFn(saveHrTemplate);
  const removeTemplate = useServerFn(deleteHrTemplate);
  const fileRef = useRef<HTMLInputElement>(null);

  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [draftName, setDraftName] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialDocId ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [empFilter, setEmpFilter] = useState<string>("");
  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState({ name: "", kind: "contract", body: "" });
  const [upl, setUpl] = useState({ employeeId: "", title: "" });

  if (query.isPending || library.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={t.documents} description={(query.error as Error).message} />;
  const data = query.data!;
  const lib = library.data;
  const can = (g: string) => data.grants.includes(g as never);

  // A signed document is finished: it must never read as still open, whatever
  // its workflow status is.
  const docs = data.documents.filter((d) => {
    const matchesStatus =
      filter === "all" ||
      (filter === "signed" ? Boolean(d.has_signed) : d.status === filter && !d.has_signed);
    return matchesStatus && (!empFilter || d.employee_id === empFilter);
  });
  const statusLabel = (d: HrDocument) =>
    d.has_signed
      ? w.signedCopy
      : d.status === "draft"
        ? w.statusDraft
        : d.status === "review"
          ? w.statusReview
          : d.status === "approved"
            ? w.statusApproved
            : w.statusFile;
  const statusVariant = (d: HrDocument) =>
    d.has_signed || d.status === "approved" ? "default" : d.status === "draft" ? "outline" : "secondary";

  const runGenerate = () => {
    if (!employeeId || !choice) return;
    const [kind, key] = choice.split(":", 2) as ["b" | "t", string];
    void generate({
      data: {
        employeeId,
        documentKey: kind === "b" ? key : undefined,
        templateId: kind === "t" ? key : undefined,
        draftName: draftName.trim() || undefined,
      },
    })
      .then((r) => {
        toast.success(r.missing > 0 ? `${w.generated} · ${r.missing} ${w.missingFields}` : w.generated);
        setWizard(false);
        setStep(1);
        setChoice("");
        setDraftName("");
        void refresh();
        setOpenId(r.id);
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      void upload({
        data: {
          employeeId: upl.employeeId || null,
          kind: "other",
          title: upl.title.trim() || file.name,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          base64,
          validUntil: null,
        },
      })
        .then(() => {
          toast.success(t.saved);
          setUpl({ employeeId: "", title: "" });
          void refresh();
        })
        .catch((e: Error) => toast.error(e.message));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={FileText}
        title={t.documents}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("create") ? (
              <Button size="sm" onClick={() => setWizard(true)}>
                <Wand2 className="mr-1.5 size-4" /> {w.docFlowTitle}
              </Button>
            ) : null}
            {can("create") ? (
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 size-4" /> {t.uploadDoc}
              </Button>
            ) : null}
            {can("edit") ? (
              <Button size="sm" variant="ghost" onClick={() => setTplOpen(true)}>
                <Plus className="mr-1.5 size-4" /> {t.newTemplate}
              </Button>
            ) : null}
          </div>
        }
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <p className="mb-4 text-sm text-muted-foreground">{w.docFlowHint}</p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedTabs<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: w.allDocuments },
              { value: "draft", label: w.drafts },
              { value: "review", label: w.statusReview },
              { value: "approved", label: w.statusApproved },
              { value: "file", label: w.statusFile },
              { value: "signed", label: w.signedCopy },
            ]}
          />
          <select className={`${selectCls} sm:w-64`} value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
            <option value="">{t.all}</option>
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          {can("create") ? (
            <div className="ml-auto flex flex-wrap gap-2">
              <select className={`${selectCls} w-56`} value={upl.employeeId} onChange={(e) => setUpl({ ...upl, employeeId: e.target.value })}>
                <option value="">{t.employee}: {t.none}</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
              <Input className="w-48" placeholder={t.title} value={upl.title} onChange={(e) => setUpl({ ...upl, title: e.target.value })} />
            </div>
          ) : null}
        </div>

        {docs.length === 0 ? (
          <EmptyState icon={FileText} title={t.noDocuments} description={t.noDocumentsBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Badge variant={statusVariant(d.status)}>{statusLabel(d.status)}</Badge>
                <button type="button" onClick={() => setOpenId(d.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium hover:underline">
                    {d.draft_name ?? d.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.employee_no ? `${d.employee_no} · ${d.employee_name}` : "—"} · {d.kind}
                    {d.country ? ` · ${d.country.toUpperCase()}` : ""} · {fmtDate(d.updated_at)}
                  </span>
                </button>
                {d.has_signed ? (
                  <Badge variant="secondary">
                    <CheckCircle2 className="mr-1 size-3" /> {w.signedCopy}
                  </Badge>
                ) : null}
                {d.valid_until ? (
                  <span className="text-xs text-muted-foreground">
                    {t.validUntil} {fmtDate(d.valid_until)}
                  </span>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setOpenId(d.id)}>
                  <Pencil className="size-4" />
                </Button>
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ data: { id: d.id } })
                        .then(() => void refresh())
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {data.templates.length > 0 ? (
        <Panel icon={FileText} title={t.templates}>
          <ul className="divide-y divide-border/60">
            {data.templates.map((tp) => (
              <li key={tp.id} className="flex items-center gap-3 py-2 text-sm">
                <Badge variant="outline">{tp.kind}</Badge>
                <span className="flex-1 truncate">{tp.name}</span>
                {tp.country ? <span className="text-xs text-muted-foreground">{tp.country.toUpperCase()}</span> : null}
                {can("edit") ? (
                  <Button size="sm" variant="ghost" onClick={() => { setTpl({ name: tp.name, kind: tp.kind, body: tp.body }); setTplOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                ) : null}
                {can("delete") ? (
                  <Button size="sm" variant="ghost" onClick={() => void removeTemplate({ data: { id: tp.id } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message))}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Generation wizard */}
      <Dialog open={wizard} onOpenChange={(o) => { setWizard(o); if (!o) setStep(1); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {w.docFlowTitle} · {w.step} {step}/2 — {step === 1 ? w.stepEmployee : w.stepDocument}
            </DialogTitle>
          </DialogHeader>
          {step === 1 ? (
            <EmployeePicker
              employees={data.employees}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder={w.searchEmployee}
              empty={w.noResults}
            />
          ) : (
            <div className="grid gap-4">
              <Field label={w.documentType}>
                <select className={selectCls} value={choice} onChange={(e) => setChoice(e.target.value)}>
                  <option value="">—</option>
                  {lib && lib.builtIn.length > 0 ? (
                    <optgroup label={`${w.builtIn} ${lib.country.toUpperCase()}`}>
                      {lib.builtIn.map((d) => (
                        <option key={d.key} value={`b:${d.key}`}>
                          {d.label[lang] ?? d.label.en}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {data.templates.length > 0 ? (
                    <optgroup label={w.companyTemplates}>
                      {data.templates.map((tp) => (
                        <option key={tp.id} value={`t:${tp.id}`}>
                          {tp.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </Field>
              <Field label={w.draftName}>
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              </Field>
              <p className="text-xs text-muted-foreground">{w.missingFieldsHint}</p>
            </div>
          )}
          <DialogFooter>
            {step === 2 ? (
              <Button variant="ghost" onClick={() => setStep(1)}>
                {w.back}
              </Button>
            ) : null}
            {step === 1 ? (
              <Button disabled={!employeeId} onClick={() => setStep(2)}>
                {w.next}
              </Button>
            ) : (
              <Button disabled={!choice} onClick={runGenerate}>
                <Wand2 className="mr-1.5 size-4" /> {w.generateNow}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template editor */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.newTemplate}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.templateName}>
                <Input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} />
              </Field>
              <Field label={t.templateKind}>
                <select className={selectCls} value={tpl.kind} onChange={(e) => setTpl({ ...tpl, kind: e.target.value })}>
                  {["contract", "letter", "policy", "certificate", "other"].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t.templateBody}>
              <Textarea rows={12} value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} />
            </Field>
            <p className="text-xs text-muted-foreground">{t.templateHint}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTplOpen(false)}>{t.cancel}</Button>
            <Button
              disabled={!tpl.name.trim()}
              onClick={() =>
                void saveTemplate({ data: { name: tpl.name.trim(), kind: tpl.kind, body: tpl.body } })
                  .then(() => { toast.success(t.saved); setTplOpen(false); setTpl({ name: "", kind: "contract", body: "" }); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openId ? (
        <DocumentDialog id={openId} onClose={() => setOpenId(null)} t={t} w={w} can={can} />
      ) : null}
    </div>
  );
}

/** Review / edit / approve / download / sign one document. */
export function DocumentDialog({
  id,
  onClose,
  t,
  w,
  can,
}: {
  id: string;
  onClose: () => void;
  t: HrExtUi;
  w: HrWsUi;
  can: (g: string) => boolean;
}) {
  const load = useServerFn(getHrDocument);
  const save = useServerFn(updateHrDocumentDraft);
  const approve = useServerFn(approveHrDocument);
  const download = useServerFn(downloadHrDocument);
  const upload = useServerFn(uploadHrDocument);
  const refresh = useHrExtRefresh();
  const [doc, setDoc] = useState<HrDocument | null>(null);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const signedRef = useRef<HTMLInputElement>(null);

  if (loadedFor !== id) {
    setLoadedFor(id);
    void load({ data: { id } })
      .then((d) => {
        setDoc(d);
        setBody(d.body ?? "");
        setTitle(d.title);
        setName(d.draft_name ?? "");
        setValidUntil(d.valid_until ? d.valid_until.slice(0, 10) : "");
      })
      .catch((e: Error) => setErr(e.message));
  }

  const missing = useMemo(() => (body.match(/\[___\]/g) ?? []).length, [body]);
  const locked = doc?.status === "approved" || doc?.status === "file";
  const dirty = doc ? body !== (doc.body ?? "") || title !== doc.title || name !== (doc.draft_name ?? "") : false;

  const persist = (status?: "draft" | "review") =>
    save({ data: { id, title: title.trim() || undefined, body, draftName: name.trim() || null, validUntil: validUntil || null, status } })
      .then(() => load({ data: { id } }))
      .then((d) => { setDoc(d); toast.success(t.saved); void refresh(); })
      .catch((e: Error) => toast.error(e.message));

  const doDownload = (signed?: boolean) =>
    download({ data: { id, signed } })
      .then((r) => downloadBase64(r.filename, r.base64, r.mime))
      .catch((e: Error) => toast.error(e.message));

  const onSigned = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      void upload({
        data: {
          employeeId: doc?.employee_id ?? null,
          kind: doc?.kind ?? "other",
          title: doc?.title ?? file.name,
          filename: file.name,
          mime: file.type || "application/pdf",
          base64,
          validUntil: null,
          attachToDocumentId: id,
        },
      })
        .then(() => load({ data: { id } }))
        .then((d) => { setDoc(d); toast.success(w.signedFiled); void refresh(); })
        .catch((e: Error) => toast.error(e.message));
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {doc ? (
              <>
                <Badge variant={locked ? "default" : "outline"}>
                  {doc.status === "draft" ? w.statusDraft : doc.status === "review" ? w.statusReview : doc.status === "approved" ? w.statusApproved : w.statusFile}
                </Badge>
                <span>{doc.draft_name ?? doc.title}</span>
                {doc.employee_no ? <span className="text-sm font-normal text-muted-foreground">{doc.employee_no} · {doc.employee_name}</span> : null}
              </>
            ) : (
              w.details
            )}
          </DialogTitle>
        </DialogHeader>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {!doc ? (
          <Skeleton className="h-64 w-full" />
        ) : doc.status === "file" && !doc.body ? (
          <div className="grid gap-3 text-sm">
            <p>{doc.filename ?? doc.title} · {doc.mime ?? ""}</p>
            <div>
              <Button size="sm" onClick={() => void doDownload()}>
                <Download className="mr-1.5 size-4" /> {t.download}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.title}>
                <Input value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label={w.draftName}>
                <Input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t.validUntil}>
                <Input type="date" value={validUntil} disabled={locked} onChange={(e) => setValidUntil(e.target.value)} />
              </Field>
            </div>
            {locked ? (
              <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> {w.approvedLocked}
                {doc.approved_by ? ` · ${doc.approved_by} · ${fmtDate(doc.approved_at)}` : ""}
              </p>
            ) : missing > 0 ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                {missing} {w.missingFields} — {w.missingFieldsHint}
              </p>
            ) : null}
            <Textarea
              rows={22}
              className="font-mono text-[13px] leading-relaxed"
              value={body}
              readOnly={locked}
              onChange={(e) => setBody(e.target.value)}
            />
            {doc.has_signed ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-primary" /> {w.signedCopy}: {doc.signed_filename} · {fmtDate(doc.signed_at)}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter className="flex-wrap gap-2">
          <input ref={signedRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSigned(f); e.target.value = ""; }} />
          {doc && !locked && can("edit") ? (
            <>
              <Button variant="outline" disabled={!dirty && doc.status === "draft"} onClick={() => void persist("draft")}>
                {w.saveDraft}
              </Button>
              {doc.status === "draft" ? (
                <Button variant="outline" onClick={() => void persist("review")}>
                  {w.sendToReview}
                </Button>
              ) : null}
            </>
          ) : null}
          {doc && !locked && can("approve") ? (
            <Button
              disabled={missing > 0}
              onClick={() =>
                void (dirty ? persist() : Promise.resolve()).then(() =>
                  approve({ data: { id } })
                    .then(() => load({ data: { id } }))
                    .then((d) => { setDoc(d); toast.success(t.approved); void refresh(); })
                    .catch((e: Error) => toast.error(e.message)),
                )
              }
            >
              <CheckCircle2 className="mr-1.5 size-4" /> {w.approveAndLock}
            </Button>
          ) : null}
          {doc && doc.body ? (
            <Button variant="outline" onClick={() => void doDownload()}>
              <Download className="mr-1.5 size-4" /> {w.downloadPdf}
            </Button>
          ) : null}
          {doc?.status === "approved" && can("create") ? (
            <Button variant="outline" onClick={() => signedRef.current?.click()}>
              <Upload className="mr-1.5 size-4" /> {w.uploadSigned}
            </Button>
          ) : null}
          {doc?.has_signed ? (
            <Button variant="ghost" onClick={() => void doDownload(true)}>
              <Download className="mr-1.5 size-4" /> {w.signedCopy}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>{w.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

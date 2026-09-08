// OPSQAI HR — signing inside the employee file: request a signature with a
// due date, download the PDF, upload the signed copy, sign on screen, preview
// the PDF and browse the version history.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Clock, Download, Eye, FileSignature, PenLine, Upload, X } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadHrDocument } from "@/lib/hr-ext.functions";
import {
  cancelHrSignature,
  downloadHrDocumentVersion,
  remindHrSignatures,
  requestHrSignature,
  signHrDocument,
} from "@/lib/hr-payroll.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrDocument } from "@/lib/hr/types-ext";
import type { HrPayrollUi } from "@/i18n/pages/hr-payroll";
import { useHrDocuments, useHrExtRefresh } from "./use-hr-ext";
import { useHrDocumentVersions } from "./use-hr-payroll";
import { PdfPreview } from "./pdf-preview";
import { SignaturePad } from "./signature-pad";
import { Field, fmtDate } from "./shared";

export function SignatureCard({
  employeeId,
  employeeName,
  t,
  canEdit,
}: {
  employeeId: string;
  employeeName: string;
  t: HrPayrollUi;
  canEdit: boolean;
}) {
  const query = useHrDocuments(employeeId);
  const refresh = useHrExtRefresh();
  const request = useServerFn(requestHrSignature);
  const cancel = useServerFn(cancelHrSignature);
  const remind = useServerFn(remindHrSignatures);
  const download = useServerFn(downloadHrDocument);

  const [requestFor, setRequestFor] = useState<HrDocument | null>(null);
  const [due, setDue] = useState("");
  const [signFor, setSignFor] = useState<HrDocument | null>(null);
  const [previewFor, setPreviewFor] = useState<{ id: string; base64: string; mime: string } | null>(null);

  const fail = (e: Error) => toast.error(e.message);

  if (query.isPending) return <Skeleton className="h-56 w-full rounded-lg" />;
  if (query.error) {
    return (
      <Panel title={t.signing}>
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      </Panel>
    );
  }
  const docs = query.data!.documents;

  const openPreview = (doc: HrDocument) =>
    void download({ data: { id: doc.id, signed: Boolean(doc.has_signed) } })
      .then((r) => setPreviewFor({ id: doc.id, base64: r.base64, mime: r.mime || "application/pdf" }))
      .catch(fail);

  return (
    <div className="grid gap-4">
      <Panel
        icon={FileSignature}
        title={t.signing}
        description={t.signingHint}
        actions={
          canEdit ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void remind()
                  .then((r) => toast.success(`${t.reminded}: ${r.reminded}`))
                  .catch(fail)
              }
            >
              <Clock className="mr-1.5 size-4" /> {t.remindAll}
            </Button>
          ) : null
        }
      >
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {docs.map((d) => {
              const status = d.signature_status ?? "none";
              const overdue =
                status === "requested" && d.signature_due ? d.signature_due < new Date().toISOString().slice(0, 10) : false;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.draft_name ?? d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.kind} · {fmtDate(d.updated_at)}
                      {d.signed_by_name ? ` · ${t.signerName}: ${d.signed_by_name}` : ""}
                      {d.versions ? ` · ${t.versions}: ${d.versions + 1}` : ""}
                    </p>
                  </div>
                  {d.has_signed ? (
                    <Badge variant="default">
                      <CheckCircle2 className="mr-1 size-3" /> {t.signed}
                    </Badge>
                  ) : status === "requested" ? (
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      {overdue ? t.overdue : t.awaitingSignature}
                      {d.signature_due ? ` · ${d.signature_due}` : ""}
                    </Badge>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => openPreview(d)}>
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void download({ data: { id: d.id, signed: Boolean(d.has_signed) } })
                        .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                        .catch(fail)
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                  {canEdit && status !== "requested" && !d.has_signed ? (
                    <Button size="sm" variant="outline" onClick={() => { setRequestFor(d); setDue(""); }}>
                      {t.requestSignature}
                    </Button>
                  ) : null}
                  {canEdit && status === "requested" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void cancel({ data: { id: d.id } }).then(() => void refresh()).catch(fail)}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button size="sm" onClick={() => setSignFor(d)}>
                      <PenLine className="mr-1.5 size-4" /> {t.drawSignature}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Request signature */}
      <Dialog open={requestFor !== null} onOpenChange={(o) => !o && setRequestFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.requestSignature}</DialogTitle>
          </DialogHeader>
          <Field label={t.dueDate}>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestFor(null)}>{t.cancel}</Button>
            <Button
              onClick={() =>
                void request({ data: { id: requestFor!.id, due: due || null } })
                  .then(() => {
                    toast.success(t.saved);
                    setRequestFor(null);
                    void refresh();
                  })
                  .catch(fail)
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {signFor ? (
        <SignDialog
          doc={signFor}
          employeeName={employeeName}
          t={t}
          onClose={() => setSignFor(null)}
          onDone={() => {
            setSignFor(null);
            void refresh();
          }}
        />
      ) : null}

      {previewFor ? (
        <Dialog open onOpenChange={() => setPreviewFor(null)}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.preview}</DialogTitle>
            </DialogHeader>
            <PdfPreview base64={previewFor.base64} mime={previewFor.mime} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function SignDialog({
  doc,
  employeeName,
  t,
  onClose,
  onDone,
}: {
  doc: HrDocument;
  employeeName: string;
  t: HrPayrollUi;
  onClose: () => void;
  onDone: () => void;
}) {
  const sign = useServerFn(signHrDocument);
  const downloadVersion = useServerFn(downloadHrDocumentVersion);
  const download = useServerFn(downloadHrDocument);
  const versions = useHrDocumentVersions(doc.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [signer, setSigner] = useState(doc.signed_by_name ?? employeeName);
  const [busy, setBusy] = useState(false);
  const fail = (e: Error) => {
    setBusy(false);
    toast.error(e.message);
  };

  const onUpload = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Max 20 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBusy(true);
      void sign({
        data: {
          id: doc.id,
          signerName: signer.trim() || employeeName,
          upload: {
            filename: file.name,
            mime: file.type || "application/pdf",
            base64: String(reader.result).split(",")[1] ?? "",
          },
        },
      })
        .then(() => {
          toast.success(t.signed);
          setBusy(false);
          onDone();
        })
        .catch(fail);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc.draft_name ?? doc.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label={t.signerName}>
            <Input value={signer} onChange={(e) => setSigner(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void download({ data: { id: doc.id } })
                  .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                  .catch(fail)
              }
            >
              <Download className="mr-1.5 size-4" /> {t.downloadForSignature}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 size-4" /> {t.uploadSigned}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t.drawSignature}</span>
            <SignaturePad
              disabled={busy || !doc.body}
              clearLabel={t.clear}
              saveLabel={t.saveSignature}
              onSave={(png) => {
                setBusy(true);
                void sign({ data: { id: doc.id, signerName: signer.trim() || employeeName, drawnPngBase64: png } })
                  .then(() => {
                    toast.success(t.signed);
                    setBusy(false);
                    onDone();
                  })
                  .catch(fail);
              }}
            />
          </div>

          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t.versions}</span>
            {versions.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : (versions.data?.versions.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noVersions}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {versions.data!.versions.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <Badge variant="outline">{t.version} {v.version}</Badge>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {[v.filename, v.signed_by_name, fmtDate(v.created_at)].filter(Boolean).join(" · ")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void downloadVersion({ data: { id: v.id } })
                          .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                          .catch(fail)
                      }
                    >
                      <Download className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

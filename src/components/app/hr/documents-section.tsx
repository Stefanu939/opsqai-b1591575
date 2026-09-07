// OPSQAI HR — contract templates, generated documents and uploads.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveHrDocument,
  deleteHrDocument,
  deleteHrTemplate,
  downloadHrDocument,
  generateHrDocument,
  saveHrTemplate,
  uploadHrDocument,
} from "@/lib/hr-ext.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrDocuments, useHrExtRefresh } from "./use-hr-ext";

const KINDS = ["contract", "letter", "policy", "other"] as const;

export function DocumentsSection({ t }: { t: HrExtUi }) {
  const query = useHrDocuments();
  const refresh = useHrExtRefresh();
  const saveTemplate = useServerFn(saveHrTemplate);
  const removeTemplate = useServerFn(deleteHrTemplate);
  const generate = useServerFn(generateHrDocument);
  const upload = useServerFn(uploadHrDocument);
  const approve = useServerFn(approveHrDocument);
  const download = useServerFn(downloadHrDocument);
  const remove = useServerFn(deleteHrDocument);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState({ name: "", kind: "contract", body: "" });
  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ templateId: "", employeeId: "", validUntil: "" });
  const [upl, setUpl] = useState({ employeeId: "", title: "", validUntil: "" });

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.documents} description={(query.error as Error).message} />;
  }
  const data = query.data!;
  const grants = data.grants;
  const can = (g: string) => grants.includes(g as never);

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
          validUntil: upl.validUntil || null,
        },
      })
        .then(() => {
          toast.success(t.saved);
          setUpl({ employeeId: "", title: "", validUntil: "" });
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
            {can("create") && data.templates.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => setGenOpen(true)}>
                <Plus className="mr-1.5 size-4" /> {t.generateDoc}
              </Button>
            ) : null}
            {can("create") ? (
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 size-4" /> {t.uploadDoc}
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
        {can("create") ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-upl-emp">{t.employee}</Label>
              <select
                id="hr-upl-emp"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={upl.employeeId}
                onChange={(e) => setUpl({ ...upl, employeeId: e.target.value })}
              >
                <option value="">{t.none}</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-upl-title">{t.title}</Label>
              <Input
                id="hr-upl-title"
                value={upl.title}
                onChange={(e) => setUpl({ ...upl, title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-upl-valid">{t.validUntil}</Label>
              <Input
                id="hr-upl-valid"
                type="date"
                value={upl.validUntil}
                onChange={(e) => setUpl({ ...upl, validUntil: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        {data.documents.length === 0 ? (
          <EmptyState title={t.noDocuments} description={t.noDocumentsBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[d.employee_no, d.employee_name, d.kind, d.valid_until ? `${t.validUntil}: ${d.valid_until}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {d.approved_at ? (
                  <Badge variant="secondary">{t.approved}</Badge>
                ) : can("approve") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void approve({ data: { id: d.id } })
                        .then(() => refresh())
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <CheckCircle2 className="mr-1.5 size-4" /> {t.approve}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void download({ data: { id: d.id } })
                      .then((r) => downloadBase64(r.base64, r.filename, r.mime))
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  <Download className="mr-1.5 size-4" /> {t.download}
                </Button>
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ data: { id: d.id } })
                        .then(() => refresh())
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

      <Panel
        icon={FileText}
        title={t.templates}
        description={t.templateHint}
        actions={
          can("create") ? (
            <Button size="sm" variant="outline" onClick={() => setTplOpen(true)}>
              <Plus className="mr-1.5 size-4" /> {t.newTemplate}
            </Button>
          ) : null
        }
      >
        {data.templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noDocumentsBody}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.templates.map((tp) => (
              <li key={tp.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tp.name}</p>
                  <p className="text-xs text-muted-foreground">{tp.kind}</p>
                </div>
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void removeTemplate({ data: { id: tp.id } })
                        .then(() => refresh())
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

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.newTemplate}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-tpl-name">{t.templateName}</Label>
              <Input
                id="hr-tpl-name"
                value={tpl.name}
                onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-tpl-kind">{t.templateKind}</Label>
              <select
                id="hr-tpl-kind"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={tpl.kind}
                onChange={(e) => setTpl({ ...tpl, kind: e.target.value })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-tpl-body">{t.templateBody}</Label>
              <Textarea
                id="hr-tpl-body"
                rows={12}
                value={tpl.body}
                onChange={(e) => setTpl({ ...tpl, body: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t.templateHint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTplOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() =>
                void saveTemplate({
                  data: {
                    name: tpl.name.trim(),
                    kind: tpl.kind as (typeof KINDS)[number],
                    body: tpl.body,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setTplOpen(false);
                    setTpl({ name: "", kind: "contract", body: "" });
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.generateDoc}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-gen-tpl">{t.templates}</Label>
              <select
                id="hr-gen-tpl"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={gen.templateId}
                onChange={(e) => setGen({ ...gen, templateId: e.target.value })}
              >
                <option value="">{t.none}</option>
                {data.templates.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-gen-emp">{t.employee}</Label>
              <select
                id="hr-gen-emp"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={gen.employeeId}
                onChange={(e) => setGen({ ...gen, employeeId: e.target.value })}
              >
                <option value="">{t.none}</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-gen-valid">{t.validUntil}</Label>
              <Input
                id="hr-gen-valid"
                type="date"
                value={gen.validUntil}
                onChange={(e) => setGen({ ...gen, validUntil: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              disabled={!gen.templateId || !gen.employeeId}
              onClick={() =>
                void generate({
                  data: {
                    templateId: gen.templateId,
                    employeeId: gen.employeeId,
                    validUntil: gen.validUntil || null,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setGenOpen(false);
                    setGen({ templateId: "", employeeId: "", validUntil: "" });
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.generate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

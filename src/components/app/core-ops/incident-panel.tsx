// OPSQAI Core — incident detail: relations, evidence, grounded root cause, actions.
// Every field is clickable / editable in place; nothing here invents content.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BrainCircuit,
  Download,
  FileText,
  Link2,
  ListChecks,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadBase64 } from "@/components/app/transport/download";
import type { CoreOpsUi } from "@/i18n/pages/core-ops";
import type { CoreLinkType } from "@/lib/core-ops/types";
import {
  deleteCoreAction,
  deleteCoreIncidentEvidence,
  deleteCoreIncidentLink,
  downloadCoreIncidentEvidence,
  exportCoreIncidentPdf,
  generateCoreRootCause,
  getCoreIncident,
  saveCoreAction,
  saveCoreIncidentLink,
  saveCoreRootCause,
  searchCoreLinkTargets,
} from "@/lib/core-ops.functions";

export function IncidentPanel({
  id,
  ui,
  lang,
}: {
  id: string;
  ui: CoreOpsUi;
  lang: "en" | "de" | "ro";
}) {
  const qc = useQueryClient();
  const load = useServerFn(getCoreIncident);
  const saveRc = useServerFn(saveCoreRootCause);
  const generate = useServerFn(generateCoreRootCause);
  const addLink = useServerFn(saveCoreIncidentLink);
  const dropLink = useServerFn(deleteCoreIncidentLink);
  const searchTargets = useServerFn(searchCoreLinkTargets);
  const dropFile = useServerFn(deleteCoreIncidentEvidence);
  const getFile = useServerFn(downloadCoreIncidentEvidence);
  const saveAct = useServerFn(saveCoreAction);
  const dropAct = useServerFn(deleteCoreAction);
  const pdf = useServerFn(exportCoreIncidentPdf);

  const query = useQuery({ queryKey: ["core-ops", "incident", id], queryFn: () => load({ data: { id } }) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["core-ops"] });
  };

  const [term, setTerm] = useState("");
  const [linkType, setLinkType] = useState<CoreLinkType>("violated_sop");
  const [rc, setRc] = useState<Record<string, string>>({});
  const [action, setAction] = useState({ kind: "corrective", title: "", detail: "", owner_name: "", due_date: "" });

  const targets = useQuery({
    queryKey: ["core-ops", "targets", term],
    queryFn: () => searchTargets({ data: { term } }),
    enabled: term.trim().length >= 2,
  });

  const analyse = useMutation({
    mutationFn: () => generate({ data: { incidentId: id, language: lang } }),
    onSuccess: (r) => {
      if (!r.grounded) toast.warning(r.message ?? ui.unknownStep);
      else toast.success(ui.saved);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isPending) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (query.error) return <Panel title={ui.rootCause}>{(query.error as Error).message}</Panel>;

  const detail = query.data!;
  const cause = detail.rootCause;
  const field = (key: string, fallback: string | null | undefined) => rc[key] ?? fallback ?? "";

  const persistRootCause = () => {
    void saveRc({
      data: {
        incidentId: id,
        problem: field("problem", cause?.problem) || null,
        immediate_cause: field("immediate_cause", cause?.immediate_cause) || null,
        root_cause: field("root_cause", cause?.root_cause) || null,
        sop_violation: field("sop_violation", cause?.sop_violation) || null,
        process_failure: field("process_failure", cause?.process_failure) || null,
        related_processes: field("related_processes", cause?.related_processes) || null,
        lean_class: field("lean_class", cause?.lean_class) || null,
        corrective: field("corrective", cause?.corrective) || null,
        preventive: field("preventive", cause?.preventive) || null,
      },
    })
      .then(() => {
        toast.success(ui.saved);
        setRc({});
        refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const uploadFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error(ui.evidenceHint);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      void import("@/lib/core-ops.functions")
        .then(({ uploadCoreIncidentEvidence }) =>
          uploadCoreIncidentEvidence({
            data: { incidentId: id, filename: file.name, mimeType: file.type, base64 },
          }),
        )
        .then(() => {
          toast.success(ui.saved);
          refresh();
        })
        .catch((e: Error) => toast.error(e.message));
    };
    reader.readAsDataURL(file);
  };

  const editable = detail.grants.includes("edit");

  return (
    <div className="grid gap-4">
      <Panel
        icon={FileText}
        title={`${detail.incident.ref ?? ""} ${detail.incident.title}`}
        description={detail.incident.description ?? undefined}
        actions={
          detail.grants.includes("export") ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void pdf({ data: { id } })
                  .then((r) => downloadBase64(r.filename, r.base64))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Download className="mr-1.5 size-4" /> {ui.exportPdf}
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{ui.kinds[detail.incident.kind] ?? detail.incident.kind}</Badge>
          <Badge>{ui.statuses[detail.incident.status] ?? detail.incident.status}</Badge>
          {detail.incident.department_name && <Badge variant="outline">{detail.incident.department_name}</Badge>}
          {detail.incident.location && <Badge variant="outline">{detail.incident.location}</Badge>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Link2} title={ui.relations} description={ui.relationsHint}>
          {detail.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ui.noLinks}</p>
          ) : (
            <ul className="grid gap-2">
              {detail.links.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    {l.link_type === "violated_sop"
                      ? ui.violatedSop
                      : l.link_type === "related_sop"
                        ? ui.relatedSop
                        : l.link_type === "faq"
                          ? ui.faq
                          : ui.relatedIncident}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate">{l.target_title ?? "—"}</span>
                  {editable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() =>
                        void dropLink({ data: { incidentId: id, id: l.id } })
                          .then(refresh)
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editable && (
            <div className="mt-3 grid gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(["violated_sop", "related_sop", "faq"] as CoreLinkType[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={linkType === t ? "default" : "outline"}
                    onClick={() => setLinkType(t)}
                  >
                    {t === "violated_sop" ? ui.violatedSop : t === "related_sop" ? ui.relatedSop : ui.faq}
                  </Button>
                ))}
              </div>
              <Input placeholder={ui.linkSearch} value={term} onChange={(e) => setTerm(e.target.value)} />
              {(targets.data ?? []).map((t) => (
                <button
                  key={`${t.type}-${t.id}`}
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() =>
                    void addLink({
                      data: {
                        incidentId: id,
                        link_type: t.type === "faq" ? "faq" : linkType,
                        target_id: t.id,
                        target_title: t.title,
                      },
                    })
                      .then(() => {
                        setTerm("");
                        refresh();
                      })
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  {t.subtitle && <span className="text-xs text-muted-foreground">{t.subtitle}</span>}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={Paperclip} title={ui.evidence} description={ui.evidenceHint}>
          {detail.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ui.noLinks}</p>
          ) : (
            <ul className="grid gap-2">
              {detail.attachments.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{f.filename}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() =>
                      void getFile({ data: { id: f.id } })
                        .then((r) => downloadBase64(r.filename, r.base64, r.mimeType))
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                  {editable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() =>
                        void dropFile({ data: { id: f.id } })
                          .then(refresh)
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/40">
              <Paperclip className="size-4" /> {ui.upload}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </Panel>
      </div>

      <Panel
        icon={BrainCircuit}
        title={ui.rootCause}
        description={ui.rootCauseHint}
        actions={
          detail.grants.includes("analyse") ? (
            <Button size="sm" onClick={() => analyse.mutate()} disabled={analyse.isPending}>
              <Sparkles className="mr-1.5 size-4" />
              {analyse.isPending ? ui.analysing : ui.analyse}
            </Button>
          ) : undefined
        }
      >
        {!cause ? (
          <p className="text-sm text-muted-foreground">{ui.notAnalysed}</p>
        ) : (
          <div className="grid gap-3">
            {(
              [
                ["problem", ui.problem, cause.problem],
                ["immediate_cause", ui.immediate, cause.immediate_cause],
                ["root_cause", ui.rootCauseField, cause.root_cause],
                ["sop_violation", ui.sopViolation, cause.sop_violation],
                ["process_failure", ui.processFailure, cause.process_failure],
                ["related_processes", ui.relatedProcesses, cause.related_processes],
                ["lean_class", ui.leanClass, cause.lean_class],
                ["corrective", ui.corrective, cause.corrective],
                ["preventive", ui.preventive, cause.preventive],
              ] as Array<[string, string, string | null]>
            ).map(([key, label, value]) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
                <Textarea
                  rows={2}
                  value={field(key, value)}
                  disabled={!detail.grants.includes("analyse")}
                  onChange={(e) => setRc((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{ui.whyChain}</Label>
              <ol className="grid gap-1.5 text-sm">
                {cause.why_steps.map((s, i) => (
                  <li key={`${i}-${s.question}`} className="rounded-md border border-border/60 p-2">
                    <div className="font-medium">{s.question}</div>
                    <div className={s.supported ? "" : "text-amber-600 dark:text-amber-400"}>
                      {s.supported ? s.answer : ui.unknownStep}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {cause.unsupported.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <div className="mb-1 font-medium">{ui.notCovered}</div>
                <ul className="list-inside list-disc text-muted-foreground">
                  {cause.unsupported.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            )}

            {cause.sources.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {ui.sources}: {cause.sources.map((s) => s.title).join("; ")}
              </p>
            )}

            {detail.grants.includes("analyse") && (
              <div>
                <Button size="sm" onClick={persistRootCause}>
                  {ui.save}
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel icon={ListChecks} title={ui.actions}>
        {detail.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ui.noActions}</p>
        ) : (
          <ul className="grid gap-2">
            {detail.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <Badge variant="outline">{a.kind === "corrective" ? ui.kindCorrective : ui.kindPreventive}</Badge>
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                {a.owner_name && <span className="text-xs text-muted-foreground">{a.owner_name}</span>}
                {a.due_date && <span className="text-xs text-muted-foreground">{a.due_date.slice(0, 10)}</span>}
                {editable && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() =>
                        void saveAct({
                          data: {
                            incidentId: id,
                            id: a.id,
                            kind: a.kind,
                            title: a.title,
                            detail: a.detail,
                            owner_name: a.owner_name,
                            due_date: a.due_date,
                            status: a.status === "done" ? "open" : "done",
                          },
                        })
                          .then(refresh)
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      {a.status === "done" ? ui.statuses["open"] : ui.kindCorrective ? "✓" : "✓"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() =>
                        void dropAct({ data: { incidentId: id, id: a.id } })
                          .then(refresh)
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex gap-1.5 sm:col-span-2">
              {(["corrective", "preventive"] as const).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={action.kind === k ? "default" : "outline"}
                  onClick={() => setAction((prev) => ({ ...prev, kind: k }))}
                >
                  {k === "corrective" ? ui.kindCorrective : ui.kindPreventive}
                </Button>
              ))}
            </div>
            <Input
              placeholder={ui.actionTitle}
              value={action.title}
              onChange={(e) => setAction((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder={ui.owner}
              value={action.owner_name}
              onChange={(e) => setAction((prev) => ({ ...prev, owner_name: e.target.value }))}
            />
            <Input
              type="date"
              value={action.due_date}
              onChange={(e) => setAction((prev) => ({ ...prev, due_date: e.target.value }))}
            />
            <Button
              disabled={action.title.trim().length < 3}
              onClick={() =>
                void saveAct({
                  data: {
                    incidentId: id,
                    kind: action.kind as "corrective" | "preventive",
                    title: action.title.trim(),
                    detail: action.detail || null,
                    owner_name: action.owner_name || null,
                    due_date: action.due_date || null,
                  },
                })
                  .then(() => {
                    setAction({ kind: action.kind, title: "", detail: "", owner_name: "", due_date: "" });
                    refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Plus className="mr-1.5 size-4" /> {ui.addAction}
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

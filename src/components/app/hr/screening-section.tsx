// OPSQAI HR — candidate screening: job profiles, CV analysis with evidence,
// comparison and shortlist. The AI never decides; a human hires.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Upload, UserCheck, UserSearch, X } from "lucide-react";
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
  analyseHrCandidate,
  deleteHrCandidate,
  deleteHrJobProfile,
  hireHrCandidate,
  saveHrJobProfile,
  setHrCandidateStatus,
  uploadHrCandidateCv,
} from "@/lib/hr-ext.functions";
import { useT } from "@/i18n";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrExtRefresh, useHrScreening } from "./use-hr-ext";

export function ScreeningSection({ t }: { t: HrExtUi }) {
  const { lang } = useT();
  const [profileId, setProfileId] = useState<string>("");
  const query = useHrScreening(profileId || undefined);
  const refresh = useHrExtRefresh();
  const saveProfile = useServerFn(saveHrJobProfile);
  const removeProfile = useServerFn(deleteHrJobProfile);
  const uploadCv = useServerFn(uploadHrCandidateCv);
  const analyse = useServerFn(analyseHrCandidate);
  const setStatus = useServerFn(setHrCandidateStatus);
  const removeCandidate = useServerFn(deleteHrCandidate);
  const hire = useServerFn(hireHrCandidate);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [blind, setBlind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hireFor, setHireFor] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    start_date: string;
  } | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    criteria: [{ label: "", weight: "1", required: false }],
  });

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.screening} description={(query.error as Error).message} />;
  }
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const activeProfile = data.profiles.find((p) => p.id === profileId) ?? data.profiles[0];

  const verdictLabel = (v: string) =>
    v === "met"
      ? t.verdictMet
      : v === "partial"
        ? t.verdictPartial
        : v === "not_met"
          ? t.verdictNotMet
          : t.verdictUnknown;

  const onCv = (file: File) => {
    if (!activeProfile) {
      toast.error(t.noProfilesBody);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      setBusy("upload");
      void uploadCv({
        data: {
          jobProfileId: activeProfile.id,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          base64,
        },
      })
        .then(() => {
          toast.success(t.saved);
          void refresh();
        })
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setBusy(null));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={UserSearch}
        title={t.jobProfiles}
        actions={
          can("create") ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" /> {t.newJobProfile}
            </Button>
          ) : null
        }
      >
        {data.profiles.length === 0 ? (
          <EmptyState title={t.noProfiles} description={t.noProfilesBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setProfileId(p.id)}
                >
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.department_name, `${(p.criteria ?? []).length} ${t.criteria.toLowerCase()}`,
                      `${p.candidate_count} ${t.candidates.toLowerCase()}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
                {activeProfile?.id === p.id ? <Badge>{t.candidates}</Badge> : null}
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void removeProfile({ data: { id: p.id } })
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

      {activeProfile ? (
        <Panel
          icon={Sparkles}
          title={`${t.candidates} · ${activeProfile.title}`}
          description={t.aiDisclaimer}
          actions={
            can("create") ? (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={blind}
                    onChange={(e) => setBlind(e.target.checked)}
                  />
                  {t.blindScreening}
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === "upload"}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1.5 size-4" /> {t.uploadCv}
                </Button>
              </div>
            ) : null
          }
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCv(f);
              e.target.value = "";
            }}
          />
          {data.candidates.length === 0 ? (
            <EmptyState title={t.noCandidates} description={t.noCandidatesBody} />
          ) : (
            <ul className="grid gap-4">
              {data.candidates.map((c) => (
                <li key={c.id} className="rounded-lg border border-border/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                          c.cv_filename ||
                          c.reference}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[c.reference, c.email, c.source].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {c.score !== null ? (
                      <Badge variant={c.score >= 70 ? "default" : "secondary"}>
                        {t.score}: {c.score}%
                      </Badge>
                    ) : null}
                    <Badge variant={c.status === "rejected" ? "outline" : "secondary"}>
                      {c.status === "hired" ? t.hired : c.status}
                    </Badge>
                  </div>

                  {Object.keys(c.extracted ?? {}).length > 0 ? (
                    <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {Object.entries(c.extracted).map(([k, v]) => (
                        <div key={k}>
                          <dt className="inline font-medium">{k.replace(/_/g, " ")}: </dt>
                          <dd className="inline">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {(c.evidence ?? []).length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t.evidence}
                      </p>
                      {c.evidence.map((e, i) => (
                        <div key={i} className="rounded-md bg-muted/40 p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{e.criterion}</span>
                            <Badge
                              variant={
                                e.verdict === "met"
                                  ? "default"
                                  : e.verdict === "not_met"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {verdictLabel(e.verdict)}
                            </Badge>
                          </div>
                          {e.quote ? (
                            <p className="mt-1 italic text-muted-foreground">
                              {t.quote}: “{e.quote}”
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {can("edit") ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === c.id}
                          onClick={() => {
                            setBusy(c.id);
                            void analyse({
                              data: {
                                id: c.id,
                                blind,
                                language: (lang === "de" || lang === "ro" ? lang : "en") as
                                  | "en"
                                  | "de"
                                  | "ro",
                              },
                            })
                              .then(() => {
                                toast.success(t.saved);
                                void refresh();
                              })
                              .catch((e: Error) => toast.error(e.message))
                              .finally(() => setBusy(null));
                          }}
                        >
                          <Sparkles className="mr-1.5 size-4" /> {t.analyse}
                        </Button>
                        {c.status !== "hired" ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void setStatus({ data: { id: c.id, status: "shortlisted" } })
                                  .then(() => refresh())
                                  .catch((e: Error) => toast.error(e.message))
                              }
                            >
                              {t.shortlist}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void setStatus({ data: { id: c.id, status: "rejected" } })
                                  .then(() => refresh())
                                  .catch((e: Error) => toast.error(e.message))
                              }
                            >
                              <X className="mr-1.5 size-4" /> {t.reject}
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {can("create") && c.status !== "hired" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setHireFor({
                            id: c.id,
                            first_name: c.first_name ?? "",
                            last_name: c.last_name ?? "",
                            start_date: "",
                          })
                        }
                      >
                        <UserCheck className="mr-1.5 size-4" /> {t.hire}
                      </Button>
                    ) : null}
                    {can("delete") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void removeCandidate({ data: { id: c.id } })
                            .then(() => refresh())
                            .catch((e: Error) => toast.error(e.message))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.newJobProfile}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-jp-title">{t.jobTitle}</Label>
              <Input
                id="hr-jp-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-jp-desc">{t.description}</Label>
              <Textarea
                id="hr-jp-desc"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.criteria}</Label>
              {draft.criteria.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_100px_120px]">
                  <Input
                    placeholder={t.criterion}
                    value={c.label}
                    onChange={(e) => {
                      const criteria = [...draft.criteria];
                      criteria[i] = { ...c, label: e.target.value };
                      setDraft({ ...draft, criteria });
                    }}
                  />
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    placeholder={t.weight}
                    value={c.weight}
                    onChange={(e) => {
                      const criteria = [...draft.criteria];
                      criteria[i] = { ...c, weight: e.target.value };
                      setDraft({ ...draft, criteria });
                    }}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={c.required}
                      onChange={(e) => {
                        const criteria = [...draft.criteria];
                        criteria[i] = { ...c, required: e.target.checked };
                        setDraft({ ...draft, criteria });
                      }}
                    />
                    {t.required}
                  </label>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="justify-self-start"
                onClick={() =>
                  setDraft({
                    ...draft,
                    criteria: [...draft.criteria, { label: "", weight: "1", required: false }],
                  })
                }
              >
                <Plus className="mr-1.5 size-4" /> {t.addCriterion}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                const criteria = draft.criteria
                  .filter((c) => c.label.trim())
                  .map((c) => ({
                    label: c.label.trim(),
                    weight: Math.min(10, Math.max(0.5, Number(c.weight) || 1)),
                    required: c.required,
                  }));
                if (!draft.title.trim() || criteria.length === 0) {
                  toast.error(t.criteria);
                  return;
                }
                void saveProfile({
                  data: {
                    title: draft.title.trim(),
                    description: draft.description.trim() || null,
                    criteria,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setOpen(false);
                    setDraft({
                      title: "",
                      description: "",
                      criteria: [{ label: "", weight: "1", required: false }],
                    });
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(hireFor)} onOpenChange={(o) => !o && setHireFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.hire}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="hr-hire-first">{t.employee}</Label>
                <Input
                  id="hr-hire-first"
                  value={hireFor?.first_name ?? ""}
                  onChange={(e) =>
                    setHireFor(hireFor ? { ...hireFor, first_name: e.target.value } : hireFor)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hr-hire-last">&nbsp;</Label>
                <Input
                  id="hr-hire-last"
                  value={hireFor?.last_name ?? ""}
                  onChange={(e) =>
                    setHireFor(hireFor ? { ...hireFor, last_name: e.target.value } : hireFor)
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-hire-start">{t.anchorDate}</Label>
              <Input
                id="hr-hire-start"
                type="date"
                value={hireFor?.start_date ?? ""}
                onChange={(e) =>
                  setHireFor(hireFor ? { ...hireFor, start_date: e.target.value } : hireFor)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHireFor(null)}>
              {t.cancel}
            </Button>
            <Button
              disabled={
                !hireFor?.start_date || !hireFor?.first_name.trim() || !hireFor?.last_name.trim()
              }
              onClick={() =>
                void hire({
                  data: {
                    id: hireFor!.id,
                    first_name: hireFor!.first_name.trim(),
                    last_name: hireFor!.last_name.trim(),
                    start_date: hireFor!.start_date,
                  },
                })
                  .then((r) => {
                    toast.success(`${t.hired}: ${r.employeeNo}`);
                    setHireFor(null);
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.hire}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

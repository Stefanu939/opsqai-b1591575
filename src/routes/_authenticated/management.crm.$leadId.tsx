import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check, Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { confirmAction } from "@/components/ui/confirm";
import { downloadBase64 } from "@/components/app/transport/download";
import { LeadDialog, type LeadFormValues } from "@/components/mc/crm/lead-dialog";
import { STAGE_LABELS } from "@/components/mc/crm/pipeline-board";
import {
  CRM_ACTIVITY_KINDS,
  CRM_STAGES,
  completeCrmActivity,
  convertCrmLeadToCustomer,
  deleteCrmLead,
  getCrmLead,
  moveCrmLeadStage,
  renderCrmOfferPdf,
  saveCrmActivity,
  saveCrmLead,
  saveCrmOffer,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/management/crm/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead — OPSQAI CRM" },
      {
        name: "description",
        content: "Full lead history: contact details, activities, offers and conversion to customer.",
      },
      { property: "og:title", content: "Lead — OPSQAI CRM" },
      { property: "og:description", content: "Lead 360: history, activities, offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadDetailPage,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const load = useServerFn(getCrmLead);
  const save = useServerFn(saveCrmLead);
  const move = useServerFn(moveCrmLeadStage);
  const remove = useServerFn(deleteCrmLead);
  const addActivity = useServerFn(saveCrmActivity);
  const doneActivity = useServerFn(completeCrmActivity);
  const addOffer = useServerFn(saveCrmOffer);
  const offerPdf = useServerFn(renderCrmOfferPdf);
  const convert = useServerFn(convertCrmLeadToCustomer);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => load({ data: { id: leadId } } as never),
    retry: false,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [act, setAct] = useState({ kind: "note", subject: "", body: "", due_at: "" });
  const [offer, setOffer] = useState({ title: "", amount: "", valid_until: "" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm-lead", leadId] });
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
  };

  const guard = (p: Promise<unknown>) =>
    p.then(() => refresh()).catch((e: Error) => toast.error(e.message));

  const saveMut = useMutation({
    mutationFn: (v: LeadFormValues) =>
      save({
        data: {
          id: leadId,
          company_name: v.company_name.trim(),
          contact_name: v.contact_name || null,
          email: v.email || null,
          phone: v.phone || null,
          country: v.country || null,
          language: v.language,
          source: data?.lead.source ?? "manual",
          stage: v.stage,
          value_amount: v.value_amount ? Number(v.value_amount) : null,
          currency: v.currency || "EUR",
          probability: v.probability ? Number(v.probability) : null,
          products: data?.lead.products ?? [],
          notes: v.notes || null,
          next_action_at: v.next_action_at || null,
        },
      } as never),
    onSuccess: () => {
      toast.success("Lead saved");
      setEditOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <ModulePage title="Lead" eyebrow="CRM">
        <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
      </ModulePage>
    );
  }

  const lead = data.lead;
  const canEdit = data.canEdit;

  const doConvert = () =>
    convert({ data: { id: leadId } } as never)
      .then((res) => {
        if (!res.ok && res.needsCustomer) {
          toast.info("No matching customer yet — create the customer first");
          navigate({ to: "/management/customers" });
          return;
        }
        toast.success("Converted — continue with the license");
        refresh();
        navigate({
          to: "/management/licenses",
          search: res.install_id ? { install: res.install_id } : {},
        });
      })
      .catch((e: Error) => toast.error(e.message));

  return (
    <ModulePage
      eyebrow="CRM"
      title={lead.company_name}
      description={`${lead.contact_name ?? "—"} · ${lead.email ?? "—"} · ${lead.source}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/management/crm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button size="sm" onClick={doConvert}>
                Convert to customer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!(await confirmAction({ title: "Delete this lead?" }))) return;
                  await remove({ data: { id: leadId } } as never)
                    .then(() => {
                      toast.success("Lead deleted");
                      navigate({ to: "/management/crm" });
                    })
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Stage">
            <div className="flex flex-wrap items-center gap-2">
              {CRM_STAGES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={lead.stage === s ? "default" : "outline"}
                  disabled={!canEdit || lead.stage === s}
                  onClick={() => void guard(move({ data: { id: leadId, stage: s } } as never))}
                >
                  {STAGE_LABELS[s]}
                </Button>
              ))}
            </div>
          </Panel>

          <Panel title="Activities">
            {canEdit && (
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <Select value={act.kind} onValueChange={(v) => setAct((p) => ({ ...p, kind: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_ACTIVITY_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Subject"
                  value={act.subject}
                  onChange={(e) => setAct((p) => ({ ...p, subject: e.target.value }))}
                />
                <Input
                  type="date"
                  value={act.due_at}
                  onChange={(e) => setAct((p) => ({ ...p, due_at: e.target.value }))}
                />
                <Button
                  onClick={() =>
                    void guard(
                      addActivity({
                        data: {
                          lead_id: leadId,
                          kind: act.kind,
                          subject: act.subject || null,
                          body: act.body || null,
                          due_at: act.due_at || null,
                        },
                      } as never).then(() => setAct({ kind: "note", subject: "", body: "", due_at: "" })),
                    )
                  }
                >
                  Add
                </Button>
                <Textarea
                  className="sm:col-span-4"
                  rows={2}
                  placeholder="Details"
                  value={act.body}
                  onChange={(e) => setAct((p) => ({ ...p, body: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              {data.activities.length === 0 && (
                <p className="text-sm text-muted-foreground">No activities yet.</p>
              )}
              {data.activities.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5"
                >
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {a.kind}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{a.subject ?? "—"}</span>
                  {a.due_at && (
                    <span className="text-xs text-muted-foreground">
                      due {new Date(a.due_at).toLocaleDateString()}
                    </span>
                  )}
                  {a.done_at ? (
                    <Badge variant="secondary" className="text-[10px]">
                      done
                    </Badge>
                  ) : (
                    canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void guard(doneActivity({ data: { id: a.id, done: true } } as never))
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Done
                      </Button>
                    )
                  )}
                  {a.body && (
                    <p className="w-full text-xs text-muted-foreground">{a.body}</p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Offers">
            {canEdit && (
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <Input
                  className="sm:col-span-2"
                  placeholder="Offer title"
                  value={offer.title}
                  onChange={(e) => setOffer((p) => ({ ...p, title: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={offer.amount}
                  onChange={(e) => setOffer((p) => ({ ...p, amount: e.target.value }))}
                />
                <Button
                  disabled={!offer.title.trim()}
                  onClick={() =>
                    void guard(
                      addOffer({
                        data: {
                          lead_id: leadId,
                          title: offer.title.trim(),
                          products: lead.products,
                          amount: offer.amount ? Number(offer.amount) : null,
                          currency: lead.currency,
                          status: "draft",
                          valid_until: offer.valid_until || null,
                        },
                      } as never).then(() => setOffer({ title: "", amount: "", valid_until: "" })),
                    )
                  }
                >
                  Add offer
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {data.offers.length === 0 && (
                <p className="text-sm text-muted-foreground">No offers yet.</p>
              )}
              {data.offers.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{o.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {o.status}
                  </Badge>
                  {o.amount != null && (
                    <span className="text-xs text-muted-foreground">
                      {Number(o.amount).toLocaleString()} {o.currency}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void offerPdf({ data: { id: o.id } } as never)
                        .then((res) => downloadBase64(res.filename, res.base64))
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Details">
            <dl className="space-y-2 text-sm">
              {[
                ["Country", lead.country ?? "—"],
                ["Language", (lead.language ?? "en").toUpperCase()],
                ["Phone", lead.phone ?? "—"],
                ["Source", `${lead.source}${lead.source_ref ? ` · ${lead.source_ref}` : ""}`],
                [
                  "Value",
                  lead.value_amount != null
                    ? `${Number(lead.value_amount).toLocaleString()} ${lead.currency}`
                    : "—",
                ],
                ["Probability", lead.probability != null ? `${lead.probability}%` : "—"],
                [
                  "Next action",
                  lead.next_action_at ? new Date(lead.next_action_at).toLocaleDateString() : "—",
                ],
                ["Customer", lead.company_id ? "linked" : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.notes && (
              <>
                <Label className="mt-3 block">Notes</Label>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lead.notes}</p>
              </>
            )}
          </Panel>

          <Panel title="History">
            <ol className="space-y-2 text-sm">
              {data.events.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3">
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium text-foreground">{e.kind}</div>
                  {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
                </li>
              ))}
              {data.events.length === 0 && (
                <li className="text-muted-foreground">No history yet.</li>
              )}
            </ol>
          </Panel>
        </div>
      </div>

      <LeadDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        onSubmit={(v) => saveMut.mutate(v)}
        saving={saveMut.isPending}
      />
    </ModulePage>
  );
}

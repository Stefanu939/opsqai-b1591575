import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check, Download, FileText, Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyName } from "@/lib/use-my-name";
import { mailtoUrl, telUrl, whatsappTemplate, whatsappUrl } from "@/lib/mc-outreach";
import { isLandline, parseLeadFacts } from "@/lib/crm-lead-facts";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { SalesDocButtons } from "@/components/mc/sales-docs";
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
  setCrmOfferStatus,
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

function ContactRow({ icon, value, tag, warn, href }: { icon: React.ReactNode; value: string | null; tag?: string; warn?: boolean; href?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      {value ? (
        <a href={href} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary">{value}</a>
      ) : (
        <span className="flex-1 text-muted-foreground">—</span>
      )}
      {tag && (
        <Badge variant="outline" className={cn("text-[10px]", warn && "border-warning/50 text-warning")}>{tag}</Badge>
      )}
    </div>
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
  const offerStatus = useServerFn(setCrmOfferStatus);
  const convert = useServerFn(convertCrmLeadToCustomer);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => load({ data: { id: leadId } } as never),
    retry: false,
  });

  const [editOpen, setEditOpen] = useState(false);
  const me = useMyName();
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
  const facts = parseLeadFacts(lead.notes);
  const landline = isLandline(lead.phone);
  const open = data.activities.filter((a) => !a.done_at);
  const timeline = [
    ...data.activities.map((a) => ({ id: a.id, at: a.created_at ?? a.due_at ?? "", kind: a.done_at ? `${a.kind} · făcut` : a.kind, title: a.subject, body: a.body })),
    ...data.events.filter((e) => e.kind !== "audit").map((e) => ({ id: e.id, at: e.created_at, kind: e.kind, title: null as string | null, body: e.detail as string | null })),
  ].sort((x, y) => (y.at > x.at ? 1 : -1));

  const doConvert = () =>
    convert({ data: { id: leadId } } as never)
      .then((res) => {
        if (!res.ok && res.needsCustomer) {
          toast.info("Continuăm înrolarea în 3 pași cu datele din CRM.");
          const cuiMatch = (lead.notes ?? "").match(/CUI[:\s]*(?:RO)?(\d{4,10})/i);
          navigate({
            to: "/management/onboarding",
            search: {
              company: lead.company_name ?? undefined,
              contact: lead.contact_name ?? undefined,
              email: lead.email ?? undefined,
              phone: lead.phone ?? undefined,
              cui: cuiMatch?.[1],
            },
          });
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
          <Button asChild variant="outline" size="sm">
            <Link
              to="/management/value/$id"
              params={{ id: "new" }}
              search={{ lead: lead.id, company: lead.company_name }}
            >
              Value calculator
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
      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── Left: work area (stage, activity, offer, documents) ── */}
        <div className="space-y-4 lg:col-span-3">
          <Panel title="Etapă">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {CRM_STAGES.map((s, i) => {
                const cur = CRM_STAGES.indexOf(lead.stage as (typeof CRM_STAGES)[number]);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!canEdit || lead.stage === s}
                    onClick={() => void guard(move({ data: { id: leadId, stage: s } } as never))}
                    className={cn(
                      "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                      lead.stage === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : i < cur
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Activitate nouă">
            {canEdit && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {CRM_ACTIVITY_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAct((p) => ({ ...p, kind: k }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs capitalize",
                        act.kind === k ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                  <Input placeholder="Subiect (ex. Apel cu directorul)" value={act.subject} onChange={(e) => setAct((p) => ({ ...p, subject: e.target.value }))} />
                  <Input type="date" value={act.due_at} onChange={(e) => setAct((p) => ({ ...p, due_at: e.target.value }))} />
                </div>
                <Textarea rows={2} placeholder="Ce s-a discutat / ce urmează" value={act.body} onChange={(e) => setAct((p) => ({ ...p, body: e.target.value }))} />
                <Button
                  size="sm"
                  disabled={!act.subject.trim() && !act.body.trim()}
                  onClick={() =>
                    void guard(
                      addActivity({
                        data: { lead_id: leadId, kind: act.kind, subject: act.subject || null, body: act.body || null, due_at: act.due_at || null },
                      } as never).then(() => setAct({ kind: "note", subject: "", body: "", due_at: "" })),
                    )
                  }
                >
                  Salvează activitatea
                </Button>
              </div>
            )}
            {open.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-primary">De făcut</div>
                {open.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-sm">
                    <Badge variant="outline" className="text-[10px] uppercase">{a.kind}</Badge>
                    <span className="flex-1 truncate text-foreground">{a.subject ?? a.body ?? "—"}</span>
                    {a.due_at && <span className="text-xs text-muted-foreground">{new Date(a.due_at).toLocaleDateString("ro-RO")}</span>}
                    {canEdit && (
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => void guard(doneActivity({ data: { id: a.id, done: true } } as never))}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Oferte">
            {canEdit && (
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                <Input placeholder="Titlu ofertă" value={offer.title} onChange={(e) => setOffer((p) => ({ ...p, title: e.target.value }))} />
                <Input type="number" placeholder={`Sumă ${lead.currency}`} value={offer.amount} onChange={(e) => setOffer((p) => ({ ...p, amount: e.target.value }))} />
                <Button
                  disabled={!offer.title.trim()}
                  onClick={() =>
                    void guard(
                      addOffer({
                        data: { lead_id: leadId, title: offer.title.trim(), products: lead.products, amount: offer.amount ? Number(offer.amount) : null, currency: lead.currency, status: "draft", valid_until: offer.valid_until || null },
                      } as never).then(() => setOffer({ title: "", amount: "", valid_until: "" })),
                    )
                  }
                >
                  Adaugă
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {data.offers.length === 0 && <p className="text-sm text-muted-foreground">Nicio ofertă încă.</p>}
              {data.offers.map((o) => {
                const x = o as typeof o & { setup_amount?: number | null; monthly_amount?: number | null };
                const amt =
                  x.setup_amount != null || x.monthly_amount != null
                    ? `${Number(x.setup_amount ?? 0).toLocaleString("ro-RO")} ${o.currency} + ${Number(x.monthly_amount ?? 0).toLocaleString("ro-RO")}/lună`
                    : o.amount != null
                      ? `${Number(o.amount).toLocaleString("ro-RO")} ${o.currency}`
                      : "";
                return (
                  <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{o.title}</div>
                      {amt && <div className="text-xs text-muted-foreground">{amt}</div>}
                    </div>
                    {canEdit ? (
                      <Select value={o.status} onValueChange={(v) => void guard(offerStatus({ data: { id: o.id, status: v } } as never))}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Ciornă</SelectItem>
                          <SelectItem value="sent">Trimisă</SelectItem>
                          <SelectItem value="accepted">Aprobată</SelectItem>
                          <SelectItem value="declined">Refuzată</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    )}
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => void offerPdf({ data: { id: o.id } } as never).then((res) => downloadBase64(res.filename, res.base64)).catch((e: Error) => toast.error(e.message))}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Documente pentru client">
            <SalesDocButtons target={{ company_name: lead.company_name, contact_name: lead.contact_name, cui: facts.cui, industry: lead.notes ?? null }} />
          </Panel>
        </div>

        {/* ── Right: who the client is and what was said ── */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-primary/30 bg-card p-4">
            <div className="text-[10px] font-medium uppercase tracking-widest text-primary">Card client</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{lead.contact_name || "Contact necunoscut"}</div>
            <div className="text-sm text-muted-foreground">{lead.company_name}</div>
            <div className="mt-3 space-y-2 text-sm">
              <ContactRow icon={<Mail className="h-4 w-4" />} value={lead.email} tag={lead.email ? "email" : undefined} href={lead.email ? mailtoUrl(lead.email, `OPSQAI — ${lead.company_name}`, "") : undefined} />
              <ContactRow
                icon={<Phone className="h-4 w-4" />}
                value={lead.phone}
                tag={lead.phone ? (landline ? "doar fix" : "mobil · WhatsApp") : undefined}
                warn={landline}
                href={lead.phone ? telUrl(lead.phone) : undefined}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.phone && !landline && (
                <Button asChild size="sm" variant="outline">
                  <a href={whatsappUrl(lead.phone, whatsappTemplate("production", { name: lead.contact_name ?? "", company: lead.company_name, sender: me.fullName, role: me.position, email: me.email }))} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/management/sales" search={{ company: lead.company_name, contact: lead.contact_name ?? "", phone: lead.phone ?? "", email: lead.email ?? "", notes: lead.notes ?? "" } as never}>
                  Sales Cockpit
                </Link>
              </Button>
            </div>
            {(!lead.email || !lead.phone || landline) && (
              <p className="mt-3 rounded-md border border-border bg-secondary/40 p-2 text-xs text-muted-foreground">
                Pregătire outreach: {[!lead.email && "lipsește emailul", !lead.phone && "lipsește telefonul", landline && "doar număr fix, fără WhatsApp"].filter(Boolean).join(" · ")}.
              </p>
            )}
          </section>

          <Panel title="Date firmă">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {[
                ["CUI", facts.cui],
                ["CAEN", facts.caen],
                ["Reg. Com.", facts.reg],
                ["Angajați", facts.staff],
                ["Țară", lead.country],
                ["Sursă", lead.source],
                ["Valoare", lead.value_amount != null ? `${Number(lead.value_amount).toLocaleString("ro-RO")} ${lead.currency}` : null],
                ["Probabilitate", lead.probability != null ? `${lead.probability}%` : null],
                ["Următoarea acțiune", lead.next_action_at ? new Date(lead.next_action_at).toLocaleDateString("ro-RO") : null],
                ["Client", lead.company_id ? "înrolat" : null],
              ].map(([k, v]) => (
                <div key={k as string} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="truncate font-medium text-foreground">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {facts.address && (
              <div className="mt-2 text-sm">
                <div className="text-xs text-muted-foreground">Adresă</div>
                <div className="text-foreground">{facts.address}</div>
              </div>
            )}
            {facts.rest && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{facts.rest}</p>}
          </Panel>

          <Panel title="Ce s-a discutat">
            <ol className="space-y-2.5 text-sm">
              {timeline.map((t) => (
                <li key={t.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase tracking-wide text-primary">{t.kind}</span>
                    {new Date(t.at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                  {t.title && <div className="font-medium text-foreground">{t.title}</div>}
                  {t.body && <div className="text-xs text-muted-foreground">{t.body}</div>}
                </li>
              ))}
              {timeline.length === 0 && <li className="text-muted-foreground">Nimic înregistrat încă.</li>}
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

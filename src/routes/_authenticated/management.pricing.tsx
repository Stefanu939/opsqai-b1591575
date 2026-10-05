import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Calculator, Download, FileText, Mail, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { PRICING, WORKSPACES, computeQuote, estimateSavings, eur } from "@/lib/mc-pricing";
import { renderOfferPdf } from "@/lib/mc-growth.functions";
import { listCrmLeads, saveCrmOffer } from "@/lib/crm.functions";
import { listCompanies } from "@/lib/companies.functions";
import { Sparkles, Building2, Target } from "lucide-react";
import { mailtoUrl, whatsappUrl } from "@/lib/mc-outreach";

export const Route = createFileRoute("/_authenticated/management/pricing")({
  validateSearch: z.object({
    company: z.string().optional(),
    lead: z.string().optional(),
    contact: z.string().optional(),
    employees: z.coerce.number().int().positive().optional(),
    workstations: z.coerce.number().int().min(0).max(50).optional(),
    workspaces: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Calculator preț & ofertă — OPSQAI Management Center" },
      { name: "description", content: "Calculează live prețul OPSQAI și generează oferta oficială în PDF." },
      { property: "og:title", content: "Calculator preț & ofertă — OPSQAI" },
      { property: "og:description", content: "Preț, rentabilitate și ofertă PDF pentru clienți." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function download(base64: string, filename: string) {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function PricingPage() {
  const search = Route.useSearch();
  const { session, loading } = useAuth();
  const [customer, setCustomer] = useState(search.company ?? "");
  const [contact, setContact] = useState(search.contact ?? "");
  const [sender, setSender] = useState("Ștefan");
  const [workstations, setWorkstations] = useState(search.workstations ?? 2);
  const [maintenance, setMaintenance] = useState<number>(PRICING.maintenanceMonthlyMin);
  const [ws, setWs] = useState<Record<string, { on: boolean; monthly: number }>>(
    Object.fromEntries(WORKSPACES.map((w) => [w.key, { on: (search.workspaces ?? "").split(",").includes(w.key), monthly: PRICING.workspaceMonthlyMin }])),
  );
  const [employees, setEmployees] = useState(search.employees ?? 25);
  const [pickOpen, setPickOpen] = useState(false);
  const [hint, setHint] = useState<Suggestion | null>(null);
  const [roiOn, setRoiOn] = useState(true);
  const [hourly, setHourly] = useState(15);
  const [minutes, setMinutes] = useState(20);
  const [hires, setHires] = useState(6);
  const [daysSaved, setDaysSaved] = useState(3);
  const [leadId, setLeadId] = useState(search.lead ?? "");

  const selected = WORKSPACES.filter((w) => ws[w.key]?.on).map((w) => ({
    key: w.key,
    label: w.label,
    monthly: ws[w.key].monthly,
  }));
  const quote = computeQuote({ workstations, maintenanceMonthly: maintenance, workspaces: selected, employees });
  const savings = useMemo(
    () => estimateSavings({ employees, hourlyCost: hourly, minutesSavedPerDay: minutes, newHiresPerYear: hires, trainingDaysSavedPerHire: daysSaved }),
    [employees, hourly, minutes, hires, daysSaved],
  );

  const leadsFn = useServerFn(listCrmLeads);
  const leads = useQuery({
    queryKey: ["crm-leads", session?.user?.id ?? null],
    queryFn: () => leadsFn({ data: {} } as never),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  const companiesFn = useServerFn(listCompanies);
  const companies = useQuery({
    queryKey: ["mc-companies-pricing", session?.user?.id ?? null],
    queryFn: () => companiesFn({ data: {} }),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  const options = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    for (const c of companies.data ?? []) {
      if ((c as { is_system?: boolean }).is_system) continue;
      out.push(suggestFor({
        kind: "client", id: c.id, name: c.name,
        employees: Math.max(c.user_count ?? 0, c.max_users ?? 0) || null,
        products: (c.enabled_products as string[] | null) ?? [], businessType: c.business_type ?? "",
        notes: "",
      }));
    }
    for (const l of leads.data?.leads ?? []) {
      out.push(suggestFor({
        kind: "lead", id: l.id, name: l.company_name, contact: l.contact_name ?? "",
        employees: null, products: l.products ?? [], businessType: "", notes: l.notes ?? "",
      }));
    }
    return out;
  }, [companies.data, leads.data]);

  const q = customer.trim().toLowerCase();
  const matches = options.filter((o) => !q || o.name.toLowerCase().includes(q)).slice(0, 8);

  const apply = (o: Suggestion) => {
    setCustomer(o.name);
    if (o.contact) setContact(o.contact);
    if (o.kind === "lead") setLeadId(o.id);
    if (o.employees) setEmployees(o.employees);
    setWorkstations(o.workstations);
    setMaintenance(o.maintenance);
    setWs(Object.fromEntries(WORKSPACES.map((w) => [w.key, { on: o.workspaces.includes(w.key), monthly: o.workspaceMonthly }])));
    setHint(o);
    setPickOpen(false);
    toast.success(`Date precompletate pentru ${o.name} — le poți modifica oricând.`);
  };

  const pdfFn = useServerFn(renderOfferPdf);
  const pdfMut = useMutation({
    mutationFn: () =>
      pdfFn({
        data: {
          customer: customer.trim() || "Client",
          contact,
          sender,
          computers: quote.computers,
          workspaces: selected.map((w) => ({ label: w.label, monthly: Math.max(PRICING.workspaceMonthlyMin, w.monthly) })),
          setup: quote.setup,
          maintenance: Math.max(PRICING.maintenanceMonthlyMin, maintenance),
          monthly: quote.monthly,
          annual: quote.annual,
          firstYear: quote.firstYear,
          perEmployeePerDay: quote.perEmployeePerDay,
          employees,
          savings: roiOn ? savings : null,
          validDays: 30,
        },
      }),
    onSuccess: (r) => {
      download(r.base64, r.filename);
      toast.success("Oferta PDF a fost descărcată");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveFn = useServerFn(saveCrmOffer);
  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          lead_id: leadId,
          title: `Ofertă OPSQAI — ${quote.computers} calculatoare${selected.length ? " + " + selected.map((s) => s.label).join(", ") : ""}`,
          products: selected.map((s) => s.key),
          amount: quote.firstYear,
          currency: "EUR",
          status: "draft",
          valid_until: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        },
      } as never),
    onSuccess: () => toast.success("Oferta a fost salvată la prospect în CRM"),
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = `Bună ziua${contact ? ", " + contact : ""}! Conform discuției, vă trimit oferta OPSQAI pentru ${customer || "firma dumneavoastră"}:\n• Implementare (o singură dată): ${eur(quote.setup)}\n• Abonament lunar (mentenanță${selected.length ? " + " + selected.map((s) => s.label).join(", ") : ""}): ${eur(quote.monthly)}\n• ${quote.computers} calculatoare (1 principal + ${workstations} stații)\nOferta completă în PDF o atașez separat. Prețurile nu includ TVA.`;

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Calculator preț & ofertă"
      description="Folosește-l în ședință: configurezi pachetul, vezi prețul imediat și descarci oferta oficială în PDF."
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Client" className="overflow-visible">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <Label className="text-xs">Firmă</Label>
                <Input
                  className="mt-1"
                  value={customer}
                  placeholder="Caută în clienți și CRM…"
                  onFocus={() => setPickOpen(true)}
                  onBlur={() => setTimeout(() => setPickOpen(false), 150)}
                  onChange={(e) => { setCustomer(e.target.value); setPickOpen(true); }}
                />
                {pickOpen && matches.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-72 w-[min(22rem,90vw)] overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {matches.map((o) => (
                      <button
                        key={o.kind + o.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => apply(o)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {o.kind === "client" ? <Building2 className="mt-0.5 h-4 w-4 text-primary" /> : <Target className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                        <span className="flex-1">
                          <span className="block font-medium text-foreground">{o.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {o.kind === "client" ? "Client" : "Prospect CRM"} · 1 + {o.workstations} stații{o.workspaces.length ? " · " + o.workspaces.map(wsLabel).join(", ") : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><Label className="text-xs">Persoană de contact</Label><Input className="mt-1" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
              <div><Label className="text-xs">Pregătit de</Label><Input className="mt-1" value={sender} onChange={(e) => setSender(e.target.value)} /></div>
            </div>
            {hint && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-primary"><Sparkles className="h-3.5 w-3.5" />Sugestie pentru {hint.name}</div>
                <ul className="space-y-0.5 text-muted-foreground">
                  {hint.reasons.map((r) => <li key={r}>• {r}</li>)}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Pachet">
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Calculatoare</span>
                  <span className="font-medium tabular-nums text-foreground">1 principal + {workstations} stații</span>
                </div>
                <Slider min={0} max={50} step={1} value={[workstations]} onValueChange={(v) => setWorkstations(v[0] ?? 0)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Mentenanță / lună (minim {eur(PRICING.maintenanceMonthlyMin)})</Label>
                  <Input type="number" min={PRICING.maintenanceMonthlyMin} step={50} className="mt-1" value={maintenance} onChange={(e) => setMaintenance(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Angajați care vor folosi OPSQAI</Label>
                  <Input type="number" min={1} className="mt-1" value={employees} onChange={(e) => setEmployees(Number(e.target.value) || 1)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Workspace-uri (de la {eur(PRICING.workspaceMonthlyMin)} / lună, după mărimea firmei)</Label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                  <span>OPSQAI Core — asistent AI, FAQ, Academy</span>
                  <span className="text-xs text-muted-foreground">inclus</span>
                </div>
                {WORKSPACES.map((w) => (
                  <div key={w.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <Switch checked={ws[w.key].on} onCheckedChange={(on) => setWs((s) => ({ ...s, [w.key]: { ...s[w.key], on } }))} />
                    <span className="flex-1">{w.label}</span>
                    <Input type="number" min={PRICING.workspaceMonthlyMin} step={50} disabled={!ws[w.key].on} className="h-8 w-28" value={ws[w.key].monthly} onChange={(e) => setWs((s) => ({ ...s, [w.key]: { ...s[w.key], monthly: Number(e.target.value) } }))} />
                    <span className="text-xs text-muted-foreground">€ / lună</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Rentabilitate (opțional în ofertă)" actions={<Switch checked={roiOn} onCheckedChange={setRoiOn} />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <div><Label className="text-xs">Cost orar mediu (€)</Label><Input type="number" className="mt-1" value={hourly} onChange={(e) => setHourly(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Minute economisite / zi</Label><Input type="number" className="mt-1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Angajări noi / an</Label><Input type="number" className="mt-1" value={hires} onChange={(e) => setHires(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Zile instruire economisite</Label><Input type="number" className="mt-1" value={daysSaved} onChange={(e) => setDaysSaved(Number(e.target.value))} /></div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Economie estimată: <span className="font-semibold text-success">{eur(savings.total)} / an</span>
              {" "}(căutare {eur(savings.search)} + instruire {eur(savings.onboarding)}). Cifrele vin doar din ce completezi aici.
            </p>
          </Panel>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <Calculator className="h-4 w-4" /> Oferta live
            </div>
            <Row label="Implementare (o singură dată)" value={eur(quote.setup)} />
            <Row label="Abonament lunar" value={eur(quote.monthly)} />
            <Row label="Pe an (recurent)" value={eur(quote.annual)} />
            <div className="my-3 border-t border-border" />
            <Row label="Total primul an" value={eur(quote.firstYear)} big />
            <Row label="Cost / angajat / zi" value={eur(quote.perEmployeePerDay, 2)} />
            {roiOn && savings.total > 0 && (
              <p className="mt-3 rounded-lg bg-success/10 p-2 text-xs text-success">
                Economia estimată acoperă abonamentul anual de {(savings.total / Math.max(1, quote.annual)).toFixed(1)}×.
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">Prețuri fără TVA.</p>
          </div>

          <Panel title="Trimite oferta">
            <div className="flex flex-col gap-2">
              <Button onClick={() => pdfMut.mutate()} disabled={pdfMut.isPending}>
                <Download className="mr-1.5 h-4 w-4" />{pdfMut.isPending ? "Se generează…" : "Generează ofertă PDF"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline"><a href={whatsappUrl(null, summary)} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp</a></Button>
                <Button asChild variant="outline"><a href={mailtoUrl("", `Ofertă OPSQAI — ${customer || "firma dumneavoastră"}`, summary)}><Mail className="mr-1.5 h-4 w-4" />Email</a></Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Descarcă PDF-ul și atașează-l în WhatsApp sau email.</p>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Label className="text-xs">Salvează ca ofertă la un prospect din CRM</Label>
              <div className="mt-1 flex gap-2">
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Alege prospectul" /></SelectTrigger>
                  <SelectContent>
                    {(leads.data?.leads ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled={!leadId || saveMut.isPending} onClick={() => saveMut.mutate()}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Panel>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><FileText className="h-3.5 w-3.5" />Oferta include clauza: datele rămân 100% pe infrastructura clientului.</p>
        </div>
      </div>
    </ModulePage>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={big ? "font-display text-2xl font-semibold text-foreground tabular-nums" : "font-medium text-foreground tabular-nums"}>{value}</span>
    </div>
  );
}

type Suggestion = {
  kind: "client" | "lead";
  id: string;
  name: string;
  contact?: string;
  employees: number | null;
  workstations: number;
  maintenance: number;
  workspaces: string[];
  workspaceMonthly: number;
  reasons: string[];
};

const wsLabel = (k: string) => WORKSPACES.find((w) => w.key === k)?.label ?? k;

/** Deterministic suggestion from data we hold — every value stays editable. */
function suggestFor(i: {
  kind: "client" | "lead"; id: string; name: string; contact?: string;
  employees: number | null; products: string[]; businessType: string; notes: string;
}): Suggestion {
  const reasons: string[] = [];
  let employees = i.employees;
  if (!employees) {
    const m = i.notes.match(/(\d{1,5})\s*(?:de\s+)?(?:angaja|salaria)/i);
    if (m) employees = Number(m[1]);
  }
  if (employees) reasons.push(`${employees} angajați (${i.kind === "client" ? "utilizatori / locuri din fișă" : "din notițele CRM"})`);
  else reasons.push("Număr de angajați necunoscut — am pus valori de pornire");
  const workstations = Math.min(50, employees ? Math.max(1, Math.ceil(employees / 10)) : 2);
  reasons.push(`1 calculator principal + ${workstations} stații (aprox. o stație la 10 angajați)`);
  const text = `${i.products.join(" ")} ${i.businessType} ${i.notes}`.toLowerCase();
  const workspaces: string[] = [];
  if (/transport|logist|4941|5229|flot/.test(text)) workspaces.push("opsqai_transport");
  if (/\bhr\b|opsqai_hr|resurse umane|personal/.test(text)) workspaces.push("opsqai_hr");
  if (workspaces.length) reasons.push(`Workspace recomandat: ${workspaces.map(wsLabel).join(", ")}`);
  const size = employees ?? 0;
  const maintenance = size > 150 ? 1000 : size > 50 ? 750 : PRICING.maintenanceMonthlyMin;
  const workspaceMonthly = size > 150 ? 800 : size > 50 ? 600 : PRICING.workspaceMonthlyMin;
  reasons.push(`Mentenanță ${maintenance} €/lună (${size > 150 ? "firmă mare" : size > 50 ? "firmă medie" : "standard"})`);
  return { kind: i.kind, id: i.id, name: i.name, contact: i.contact, employees, workstations, maintenance, workspaces, workspaceMonthly, reasons };
}

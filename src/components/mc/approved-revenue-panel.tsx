import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CalendarIcon, ChevronDown, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadBase64 } from "@/components/app/transport/download";
import { getMcRevenueReport, exportMcRevenuePdf } from "@/lib/mc-revenue.functions";
import type { RevenuePeriod } from "@/lib/mc-revenue";
import { useAuth } from "@/lib/auth-context";

const money = (n: number, currency = "EUR") => new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

export function ApprovedRevenuePanel({ enabled }: { enabled: boolean }) {
  const { session } = useAuth();
  const load = useServerFn(getMcRevenueReport);
  const pdf = useServerFn(exportMcRevenuePdf);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<RevenuePeriod>({});
  const [exporting, setExporting] = useState(false);
  const valid = !period.from || !period.to || period.from <= period.to;
  const q = useQuery({ queryKey: ["mc-revenue-report", session?.user.id, period], queryFn: () => load({ data: period }), enabled: enabled && valid });
  const report = q.data;
  const exportReport = async () => {
    setExporting(true);
    try { const result = await pdf({ data: period }); downloadBase64(result.filename, result.base64); }
    catch { toast.error("Raportul PDF nu a putut fi descărcat."); }
    finally { setExporting(false); }
  };
  return (
    <Panel title="Raport financiar" icon={BadgeCheck} description="Oferte aprobate și încasări înregistrate" actions={
      <Button size="sm" variant="outline" disabled={!report || !valid || exporting || q.isFetching} onClick={() => void exportReport()}><Download className="mr-1.5 h-4 w-4" />{exporting ? "Se pregătește…" : "PDF"}</Button>
    }>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant={!period.from && !period.to ? "secondary" : "outline"} size="sm" onClick={() => setPeriod({})}>Toată perioada</Button>
        {[30, 90].map(days => <Button key={days} variant="outline" size="sm" onClick={() => setPeriod({ from: format(subDays(new Date(), days - 1), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") })}>{days} zile</Button>)}
        <DateControl label="De la" value={period.from} onChange={from => setPeriod(p => ({ ...p, from }))} />
        <DateControl label="Până la" value={period.to} onChange={to => setPeriod(p => ({ ...p, to }))} />
      </div>
      {!valid ? <p role="alert" className="text-sm text-destructive">Data de început trebuie să fie înaintea datei de sfârșit.</p> : q.isError ? <div className="flex flex-wrap items-center gap-2"><p role="alert" className="text-sm text-destructive">Raportul nu a putut fi încărcat.</p><Button variant="outline" size="sm" onClick={() => void q.refetch()}>Reîncearcă</Button></div> : !report ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{report.offers.length} oferte aprobate în perioada selectată</span>
          <span className="font-medium text-foreground">Încasări înregistrate: {money(report.receipts)}</span>
        </div>
        {(report.totals.length ? report.totals : [{ currency: "EUR", setup: 0, monthly: 0, firstYear: 0 }]).map(t => <div key={t.currency} className="mb-3 grid gap-3 sm:grid-cols-3">
          <Stat label={`Implementare · ${t.currency}`} value={money(t.setup, t.currency)} />
          <Stat label={`Recurent / lună · ${t.currency}`} value={money(t.monthly, t.currency)} />
          <Stat label={`Valoare primul an · ${t.currency}`} value={money(t.firstYear, t.currency)} strong />
        </div>)}
        <p className="text-xs text-muted-foreground">Valoare aprobată, nu încasată. Primul an = implementare + 12 luni de recurent.</p>
        {report.offers.some(o => o.estimatedDate) && <p className="mt-2 text-xs text-muted-foreground">* Pentru ofertele vechi fără data aprobării este folosită data creării.</p>}
        {!report.offers.length ? <p className="mt-3 text-sm text-muted-foreground">Nicio ofertă aprobată în această perioadă.</p> : <>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => setOpen(v => !v)}>Defalcare pe clienți <ChevronDown className={`ml-1 h-4 w-4 ${open ? "rotate-180" : ""}`} /></Button>
          {open && <div className="mt-2 divide-y divide-border">{report.offers.map(o => <Link key={o.id} to="/management/crm/$leadId" params={{ leadId: o.lead_id }} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-secondary/40">
            <span className="min-w-0 break-words"><span className="block font-medium">{o.company}</span><span className="block text-xs text-muted-foreground">{o.title} · {o.date.slice(0, 10)}{o.estimatedDate ? "*" : ""}</span></span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{money(o.setup, o.currency)} + {money(o.monthly, o.currency)}/lună<span className="block font-medium text-foreground">{money(o.firstYear, o.currency)} primul an</span></span>
          </Link>)}</div>}
        </>}
      </>}
    </Panel>
  );
}

function DateControl({ label, value, onChange }: { label: string; value?: string; onChange: (value?: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" size="sm" aria-label={label}><CalendarIcon className="mr-1.5 h-4 w-4" />{label}: {value ? format(new Date(`${value}T12:00:00`), "dd.MM.yyyy") : "—"}</Button></PopoverTrigger><PopoverContent align="start" className="w-auto p-0 pointer-events-auto"><Calendar mode="single" locale={ro} captionLayout="dropdown" selected={value ? new Date(`${value}T12:00:00`) : undefined} onSelect={date => { onChange(date ? format(date, "yyyy-MM-dd") : undefined); setOpen(false); }} className="pointer-events-auto" /></PopoverContent></Popover>;
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><div className={`mt-1 break-words tabular-nums text-foreground ${strong ? "font-display text-2xl font-semibold" : "text-lg font-medium"}`}>{value}</div></div>;
}

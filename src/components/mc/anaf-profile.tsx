import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { lookupCompanyByCui } from "@/lib/mc-growth.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AnafResult = Extract<Awaited<ReturnType<typeof lookupCompanyByCui>>, { ok: true }>;

const ron = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n) + " RON";

/** Read-only summary of the public ANAF data for a company. */
export function AnafSummary({ data }: { data: AnafResult }) {
  const f = data.financials;
  const profit = f ? (f.net_loss ? -f.net_loss : f.net_profit) : null;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{data.name}</span>
        {data.deregistered ? <Badge variant="destructive">Radiată</Badge>
          : data.inactive ? <Badge variant="destructive">Inactivă fiscal</Badge>
          : <Badge variant="secondary">Activă</Badge>}
        <Badge variant="outline">{data.vat_payer ? "Plătitor TVA" : "Neplătitor TVA"}</Badge>
        {data.e_invoice && <Badge variant="outline">e-Factura</Badge>}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Angajați" value={f?.employees != null ? String(f.employees) : "—"} />
        <Kpi label="Cifră de afaceri" value={ron(f?.turnover)} />
        <Kpi label={profit != null && profit < 0 ? "Pierdere netă" : "Profit net"} value={ron(profit == null ? null : Math.abs(profit))} />
        <Kpi label="Bilanț" value={f ? String(f.year) : "nepublicat"} />
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div><dt className="inline">CAEN: </dt><dd className="inline text-foreground">{data.caen || "—"} {data.caen_name && `– ${data.caen_name}`}</dd></div>
        <div><dt className="inline">Reg. Com.: </dt><dd className="inline text-foreground">{data.reg_com || "—"}</dd></div>
        <div><dt className="inline">Formă juridică: </dt><dd className="inline text-foreground">{data.legal_form || "—"}</dd></div>
        <div><dt className="inline">Localitate: </dt><dd className="inline text-foreground">{[data.city, data.county].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt className="inline">Înființată: </dt><dd className="inline text-foreground">{data.registered_at || "—"}</dd></div>
      </dl>
      <p className="text-[11px] text-muted-foreground">Sursa: date publice ANAF. Verifică înainte de folosire.</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-display text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

/** Standalone lookup card (company page). */
export function AnafProfileCard() {
  const [cui, setCui] = useState("");
  const [data, setData] = useState<AnafResult | null>(null);
  const lookup = useServerFn(lookupCompanyByCui);
  const mut = useMutation({
    mutationFn: () => lookup({ data: { cui } }),
    onSuccess: (r) => (r.ok ? setData(r) : toast.error(r.error)),
    onError: (e: Error) => toast.error(e.message),
  });
  const go = () => {
    if (cui.replace(/\D/g, "").length < 2) return toast.info("Introdu mai întâi CUI-ul firmei pentru a prelua datele din ANAF.");
    mut.mutate();
  };
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-foreground">Profil financiar ANAF</h3>
      <div className="flex gap-2">
        <Input value={cui} onChange={(e) => setCui(e.target.value)} placeholder="CUI, ex. RO12345678" />
        <Button variant="outline" onClick={go} disabled={mut.isPending}>
          <Search className="mr-1.5 h-4 w-4" />{mut.isPending ? "Caut…" : "Verifică"}
        </Button>
      </div>
      {data && <div className="mt-3"><AnafSummary data={data} /></div>}
    </div>
  );
}

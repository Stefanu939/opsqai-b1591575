import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Search } from "lucide-react";
import { lookupCompanyByCui } from "@/lib/mc-growth.functions";
import { listCompanies } from "@/lib/companies.functions";
import { listCrmLeads } from "@/lib/crm.functions";
import { cuiFromText, isValidCui } from "@/lib/cui";
import { sameCompany } from "@/lib/mc-client-search";
import { AnafSummary, type AnafResult } from "@/components/mc/anaf-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LeadEnrichment({ company, notes, leadId, onApply }: {
  company: string; notes: string; leadId?: string;
  onApply: (data: { company: string; phone: string; notes: string }) => void;
}) {
  const [cui, setCui] = useState(() => cuiFromText(notes) ?? "");
  const [result, setResult] = useState<AnafResult | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  const lookup = useServerFn(lookupCompanyByCui);
  const companiesFn = useServerFn(listCompanies);
  const leadsFn = useServerFn(listCrmLeads);
  const companies = useQuery({ queryKey: ["mc-duplicate-companies"], queryFn: () => companiesFn({ data: {} }), staleTime: 30_000 });
  const leads = useQuery({ queryKey: ["crm-leads"], queryFn: () => leadsFn(), staleTime: 30_000 });
  const duplicateCompanies = (companies.data ?? []).filter((c) => sameCompany(company, c.name));
  const duplicateLeads = (leads.data?.leads ?? []).filter((l) => l.id !== leadId && (sameCompany(company, l.company_name) || Boolean(result && cuiFromText(l.notes) === String(result.cui))));

  const verify = async () => {
    if (!isValidCui(cui)) return toast.error("CUI invalid. Verifică numărul și cifra de control.");
    const version = ++generation.current;
    setBusy(true); setResult(null);
    try {
      const response = await lookup({ data: { cui } });
      if (version !== generation.current) return;
      if (response.ok) setResult(response);
      else toast.error(response.error);
    } catch (error) {
      if (version === generation.current) toast.error(error instanceof Error ? error.message : "ANAF nu răspunde acum.");
    } finally { if (version === generation.current) setBusy(false); }
  };

  return <section className="space-y-3 border-b border-border pb-4">
    <Label htmlFor="crm-cui">CUI / CIF · verificare ANAF</Label>
    <div className="flex gap-2">
      <Input id="crm-cui" value={cui} onChange={(e) => { generation.current += 1; setBusy(false); setCui(e.target.value); setResult(null); }} placeholder="RO…" />
      <Button variant="outline" disabled={busy || !cui.trim()} onClick={() => void verify()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Verifică
      </Button>
    </div>
    {(companies.isError || leads.isError) && <p className="text-xs text-warning">Verificarea duplicatelor nu este disponibilă momentan.</p>}
    {(duplicateCompanies.length > 0 || duplicateLeads.length > 0) && <div className="space-y-2 border-l-2 border-warning pl-3 text-sm">
      <p className="flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" /> Firma există deja</p>
      {duplicateCompanies.map((c) => <Link key={c.id} to="/management/companies/$id" params={{ id: c.id }} className="block text-primary underline">{c.name} · Client</Link>)}
      {duplicateLeads.map((l) => <Link key={l.id} to="/management/crm/$leadId" params={{ leadId: l.id }} className="block text-primary underline">{l.company_name} · CRM</Link>)}
    </div>}
    {result && <>
      <AnafSummary data={result} />
      {company.trim() && !sameCompany(company, result.name) && <p className="text-sm text-warning">Denumirea ANAF diferă de firma introdusă. Verifică înainte să aplici.</p>}
      <Button variant="secondary" onClick={() => {
        const block = [`[ANAF · ${new Date().toLocaleDateString("ro-RO")}]`, `CUI ${result.cui}`, `CAEN ${result.caen} ${result.caen_name}`, `Reg. Com. ${result.reg_com}`, result.address, [result.city, result.county].filter(Boolean).join(", "), result.financials?.employees != null ? `${result.financials.employees} angajați (bilanț ${result.financials.year})` : "", result.inactive ? "Inactivă fiscal" : "", result.deregistered ? "Radiată" : ""].filter(Boolean).join(" · ");
        onApply({ company: result.name, phone: result.phone, notes: [notes.replace(/\[ANAF[^\n]*/g, "").trim(), block].filter(Boolean).join("\n") });
        toast.success("Date aplicate în formular. Salvează pentru a confirma.");
      }}><Check className="h-4 w-4" /> Aplică datele verificate</Button>
    </>}
  </section>;
}
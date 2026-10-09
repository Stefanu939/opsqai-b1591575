import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Radio,
  Rocket,
  Search,
  Users,
  CalendarClock,
  Calculator,
  Megaphone,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listCrmLeads } from "@/lib/crm.functions";
import { matchesClient } from "@/lib/mc-client-search";
import { cuiFromText } from "@/lib/cui";
import { useAuth } from "@/lib/auth-context";
import { listCompanies } from "@/lib/companies.functions";
import { listLicenses } from "@/lib/licenses.functions";
import { listInstallations } from "@/lib/releases.functions";

const COMMANDS: Array<{ label: string; hint: string; to: string; search?: Record<string, string>; icon: typeof Users }> = [
  { label: "Cine expiră luna asta?", hint: "clienți cu licența < 30 zile", to: "/management/customers", search: { filter: "expiring" }, icon: CalendarClock },
  { label: "Clienți suspendați", hint: "reactivare / contact", to: "/management/customers", search: { filter: "suspended" }, icon: Users },
  { label: "Servere care nu au mai dat semnal", hint: "flota Self-Hosted", to: "/management/installations", icon: Radio },
  { label: "Client nou + licență + kit", hint: "în 3 pași", to: "/management/onboarding", icon: Rocket },
  { label: "Generează ofertă / calculează preț", hint: "PDF oficial", to: "/management/pricing", icon: Calculator },
  { label: "Script de apel & mesaje WhatsApp", hint: "Sales Cockpit", to: "/management/sales", icon: Megaphone },
];

const PAGES = [
  { to: "/management", label: "Overview", icon: LayoutDashboard },
  { to: "/management/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/management/customers", label: "Customers", icon: Users },
  { to: "/management/installations", label: "Installations", icon: Radio },
  { to: "/management/licenses", label: "Licenses", icon: KeyRound },
  { to: "/management/releases", label: "Releases", icon: Rocket },
  { to: "/management/team", label: "Team", icon: Users },
  { to: "/management/support", label: "Support", icon: Inbox },
];

/**
 * Quick search for the Management Center.
 * Navigation targets are always available; customer / license / installation
 * results are fetched lazily the first time the palette is opened.
 */
export function QuickSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const { session, loading } = useAuth();
  const ready = !loading && Boolean(session?.user?.id) && open;

  const fetchLeads = useServerFn(listCrmLeads);
  const fetchCompanies = useServerFn(listCompanies);
  const fetchLicenses = useServerFn(listLicenses);
  const fetchInstalls = useServerFn(listInstallations);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const companies = useQuery({
    queryKey: [session?.user?.id, "mc-quick-companies"],
    queryFn: () => fetchCompanies(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });
  const licenses = useQuery({
    queryKey: [session?.user?.id, "mc-quick-licenses"],
    queryFn: () => fetchLicenses(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });
  const installs = useQuery({
    queryKey: [session?.user?.id, "mc-quick-installs"],
    queryFn: () => fetchInstalls(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });

  const leads = useQuery({ queryKey: [session?.user?.id, "mc-quick-leads"], queryFn: () => fetchLeads(), enabled: ready, retry: false, staleTime: 30_000 });
  const chosen = leads.data?.leads.find((lead) => lead.id === selectedLead);
  const chosenCompany = companies.data?.find((company) => company.id === selectedCompany);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      {!compact && <Button variant="outline" onClick={() => { setQuery(""); setSelectedLead(null); setSelectedCompany(null); setOpen(true); }} className="hidden min-w-0 max-w-xl flex-1 justify-start text-muted-foreground sm:flex">
        <Search className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-left">Caută firme, contacte, CUI…</span><kbd className="hidden text-xs md:inline">⌘⇧K</kbd>
      </Button>}
      <Button variant="ghost" size="icon" aria-label="Căutare rapidă" title="Căutare rapidă · Ctrl+Shift+K" onClick={() => { setQuery(""); setSelectedLead(null); setSelectedCompany(null); setOpen(true); }} className={compact ? "shrink-0" : "sm:hidden"}><Search className="h-4 w-4" /></Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">Căutare rapidă OPSQAI</DialogTitle>
          <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={(value) => { setQuery(value); setSelectedLead(null); setSelectedCompany(null); }} placeholder="Firmă, persoană, email, telefon, CUI…" />
        <CommandList className="max-h-[55dvh]">
          {(companies.isLoading || leads.isLoading) && <p className="px-4 py-3 text-sm text-muted-foreground">Se încarcă firmele…</p>}
          {(companies.isError || leads.isError || licenses.isError || installs.isError) && <p role="alert" className="px-4 py-3 text-sm text-warning">Unele rezultate nu sunt disponibile. <Button variant="ghost" size="sm" onClick={() => { void companies.refetch(); void leads.refetch(); void licenses.refetch(); void installs.refetch(); }}>Reîncearcă</Button></p>}
          <CommandEmpty>Niciun rezultat.</CommandEmpty>
          <CommandGroup heading="Comenzi rapide">
            {COMMANDS.filter((c) => matchesClient(query, [c.label, c.hint])).map((c) => (
              <CommandItem
                key={c.label}
                value={`comanda ${c.label} ${c.hint}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: c.to, search: c.search as never });
                }}
              >
                <c.icon className="mr-2 h-4 w-4 text-primary" />
                {c.label}
                <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{c.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Pagini">
            {PAGES.filter((p) => matchesClient(query, [p.label, p.to])).map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {p.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {(companies.data ?? []).length > 0 && (
            <CommandGroup heading="Clienți">
              {(companies.data ?? []).filter((c) => matchesClient(query, [c.name, c.install_id, c.business_type, c.subscription_status])).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`customer ${c.name} ${c.install_id ?? ""} ${c.business_type ?? ""}`}
                  onSelect={() => {
                    setSelectedLead(null);
                    setSelectedCompany(c.id);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {c.business_type ?? c.subscription_status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(licenses.data ?? []).length > 0 && (
            <CommandGroup heading="Licențe">
              {(licenses.data ?? []).filter((l) => matchesClient(query, [l.company_name, l.install_id, l.contact_email])).map((l) => (
                <CommandItem
                  key={l.id}
                  value={`license ${l.company_name} ${l.install_id} ${l.contact_email ?? ""}`}
                  onSelect={() => go("/management/licenses")}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span className="truncate">{l.company_name}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                    {l.install_id.slice(0, 10)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(installs.data ?? []).length > 0 && (
            <CommandGroup heading="Instalări">
              {(installs.data ?? []).filter((i) => matchesClient(query, [i.install_id, i.license?.company_name, i.app_version])).map((i) => (
                <CommandItem
                  key={i.install_id}
                  value={`installation ${i.install_id} ${i.license?.company_name ?? ""} ${i.app_version ?? ""}`}
                  onSelect={() => go("/management/installations")}
                >
                  <Radio className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {i.license?.company_name ?? i.install_id.slice(0, 12)}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {i.app_version ?? "—"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Prospecte CRM">
            {(leads.data?.leads ?? []).filter((lead) => matchesClient(query, [lead.company_name, lead.contact_name, lead.email, lead.phone, lead.country, lead.notes])).map((lead) => (
              <CommandItem key={lead.id} value={`crm-${lead.id}`} onSelect={() => { setSelectedCompany(null); setSelectedLead(lead.id); }}>
                <Users className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{lead.company_name}</div><div className="truncate text-xs text-muted-foreground">{[lead.contact_name, lead.email, cuiFromText(lead.notes) && `CUI ${cuiFromText(lead.notes)}`].filter(Boolean).join(" · ")}</div></div>
                <span className="shrink-0 text-xs text-muted-foreground">{lead.stage}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        {chosenCompany && <div className="space-y-2 border-t border-border bg-muted/30 p-3">
          <p className="truncate text-sm font-semibold">{chosenCompany.name}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setOpen(false); navigate({ to: "/management/companies/$id", params: { id: chosenCompany.id } }); }}>Fișa clientului</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: "/management/sales", search: { company: chosenCompany.name, contact: "", phone: "", email: "", notes: "" } }); }}>Pregătește apelul</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: "/management/pricing", search: { company: chosenCompany.name } }); }}>Ofertă</Button>
          </div>
        </div>}
        {chosen && <div className="space-y-2 border-t border-border bg-muted/30 p-3">
          <p className="truncate text-sm font-semibold">{chosen.company_name}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setOpen(false); navigate({ to: "/management/crm/$leadId", params: { leadId: chosen.id } }); }}>Fișa CRM</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: "/management/sales", search: { company: chosen.company_name, contact: chosen.contact_name ?? "", email: chosen.email ?? "", phone: chosen.phone ?? "", notes: chosen.notes ?? "" } }); }}>Pregătește apelul</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: "/management/pricing", search: { lead: chosen.id, company: chosen.company_name } }); }}>Ofertă</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: "/management/onboarding", search: { lead: chosen.id, company: chosen.company_name } }); }}>Client în 3 pași</Button>
          </div>
        </div>}
        </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

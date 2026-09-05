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
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { listCompanies } from "@/lib/companies.functions";
import { listLicenses } from "@/lib/licenses.functions";
import { listInstallations } from "@/lib/releases.functions";

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
export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const ready = !loading && Boolean(session?.user?.id) && open;

  const fetchCompanies = useServerFn(listCompanies);
  const fetchLicenses = useServerFn(listLicenses);
  const fetchInstalls = useServerFn(listInstallations);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const companies = useQuery({
    queryKey: ["mc-quick-companies"],
    queryFn: () => fetchCompanies(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });
  const licenses = useQuery({
    queryKey: ["mc-quick-licenses"],
    queryFn: () => fetchLicenses(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });
  const installs = useQuery({
    queryKey: ["mc-quick-installs"],
    queryFn: () => fetchInstalls(),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground sm:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          Search customers, licenses, installations…
        </span>
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        aria-label="Quick search"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary/60 text-muted-foreground sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, customers, licenses, installations…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((p) => {
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
            <CommandGroup heading="Customers">
              {(companies.data ?? []).slice(0, 40).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`customer ${c.name} ${c.install_id ?? ""} ${c.business_type ?? ""}`}
                  onSelect={() => go("/management/customers")}
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
            <CommandGroup heading="Licenses">
              {(licenses.data ?? []).slice(0, 40).map((l) => (
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
            <CommandGroup heading="Installations">
              {(installs.data ?? []).slice(0, 40).map((i) => (
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
        </CommandList>
      </CommandDialog>
    </>
  );
}

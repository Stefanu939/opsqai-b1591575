// OPSQAI dashboard — KPI summary card per licensed work module.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { getModuleKpis } from "@/lib/module-kpis.functions";
import { useLicense } from "@/lib/license";
import { resolveEffectiveConfig } from "@/lib/product-architecture";
import { useT } from "@/i18n";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: "Modules at a glance",
    opsqai_transport: "OPSQAI Transport",
    opsqai_hr: "OPSQAI HR",
    vehicles: "Vehicles",
    drivers: "Drivers",
    openIncidents: "Open incidents",
    expiring: "Documents expiring",
    expired: "Expired",
    employees: "Employees",
    onboarding: "Onboarding",
    openTasks: "Open tasks",
    overdueTasks: "Overdue tasks",
    contractsExpiring: "Contracts expiring",
    open: "Open",
  },
  de: {
    title: "Module im Überblick",
    opsqai_transport: "OPSQAI Transport",
    opsqai_hr: "OPSQAI HR",
    vehicles: "Fahrzeuge",
    drivers: "Fahrer",
    openIncidents: "Offene Vorfälle",
    expiring: "Ablaufende Dokumente",
    expired: "Abgelaufen",
    employees: "Mitarbeiter",
    onboarding: "Onboarding",
    openTasks: "Offene Aufgaben",
    overdueTasks: "Überfällige Aufgaben",
    contractsExpiring: "Auslaufende Verträge",
    open: "Öffnen",
  },
  ro: {
    title: "Module — sinteză",
    opsqai_transport: "OPSQAI Transport",
    opsqai_hr: "OPSQAI HR",
    vehicles: "Vehicule",
    drivers: "Șoferi",
    openIncidents: "Incidente deschise",
    expiring: "Documente ce expiră",
    expired: "Expirate",
    employees: "Angajați",
    onboarding: "Onboarding",
    openTasks: "Sarcini deschise",
    overdueTasks: "Sarcini întârziate",
    contractsExpiring: "Contracte ce expiră",
    open: "Deschide",
  },
};

const ROUTES: Record<string, string> = {
  opsqai_transport: "/app/products/transport/overview",
  opsqai_hr: "/app/products/hr/overview",
};

export function ModuleKpis() {
  const { lang } = useT();
  const l = LABELS[lang] ?? LABELS.en!;
  const license = useLicense();
  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: license.modules,
  });
  const fn = useServerFn(getModuleKpis);
  const query = useQuery({ queryKey: ["dashboard", "module-kpis"], queryFn: () => fn() });

  const modules = (query.data?.modules ?? []).filter((m) => cfg.products.includes(m.product as never));
  if (!modules.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{l.title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <Panel key={m.product}>
            <div className="flex items-center justify-between gap-3 p-4 pb-0">
              <p className="font-medium">{l[m.product] ?? m.product}</p>
              <Button asChild size="sm" variant="ghost">
                <Link to={ROUTES[m.product] ?? "/app/modules"}>
                  {l.open}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {m.kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {l[k.label] ?? k.label}
                  </p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      k.tone === "critical"
                        ? "text-destructive"
                        : k.tone === "warning"
                          ? "text-amber-500"
                          : "text-foreground"
                    }`}
                  >
                    {k.value}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

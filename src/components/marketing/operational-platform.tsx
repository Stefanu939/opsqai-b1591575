import { Link } from "@tanstack/react-router";
import { Workflow, Puzzle, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

const copy = {
  ro: {
    title: "Module operaționale. Fluxuri custom. O singură platformă.",
    body: "OPSQAI nu se oprește la răspunsuri din documente. Leagă cunoștințele de activitatea echipei: cereri, instruire, documente, operațiuni și urmărirea responsabilităților.",
    items: [
      ["Module disponibile", "HR, Transport, Logistică și Operations, alături de Academy, cereri interne și rapoarte. Funcții activate prin licența companiei."],
      ["Dezvoltare pe fluxul tău", "Bănci, service-uri auto, producție sau alte afaceri: diagnosticăm procesul și propunem un workspace custom. Domeniul nu este limita; cerințele și infrastructura stabilesc soluția."],
      ["Impact verificat în pilot", "Măsurăm timpii, erorile și pașii manuali înainte și după implementare. Simulările sunt estimări, nu economii garantate sau rezultate ale unor clienți."],
    ],
    modules: "Explorează modulele", custom: "Discută un flux custom",
  },
  en: {
    title: "Operational modules. Custom workflows. One platform.",
    body: "OPSQAI goes beyond document answers. It connects knowledge to team activity: requests, training, documents, operations and accountability.",
    items: [
      ["Available modules", "HR, Transport, Logistics and Operations, alongside Academy, internal requests and reports. Capabilities are activated through your company license."],
      ["Built around your workflow", "Banks, auto repair shops, manufacturing and other businesses: we diagnose the process and propose a custom workspace. Requirements and infrastructure define the solution, not a closed industry list."],
      ["Impact measured in a pilot", "We compare time, errors and manual steps before and after implementation. Simulations are estimates, not guaranteed savings or customer results."],
    ],
    modules: "Explore modules", custom: "Discuss a custom workflow",
  },
  de: {
    title: "Operative Module. Individuelle Abläufe. Eine Plattform.",
    body: "OPSQAI geht über Dokumentenantworten hinaus. Es verbindet Wissen mit Teamarbeit: Anfragen, Schulungen, Dokumente, Betrieb und Verantwortlichkeiten.",
    items: [
      ["Verfügbare Module", "HR, Transport, Logistik und Operations sowie Academy, interne Anfragen und Berichte. Funktionen werden über die Unternehmenslizenz aktiviert."],
      ["Für Ihren Ablauf entwickelt", "Banken, Kfz-Werkstätten, Produktion und andere Unternehmen: Wir analysieren den Prozess und schlagen einen individuellen Workspace vor. Anforderungen und Infrastruktur bestimmen die Lösung, nicht eine begrenzte Branchenliste."],
      ["Wirkung im Pilot messen", "Wir vergleichen Zeitaufwand, Fehler und manuelle Schritte vor und nach der Umsetzung. Simulationen sind Schätzungen, keine garantierten Einsparungen oder Kundenergebnisse."],
    ],
    modules: "Module entdecken", custom: "Individuellen Ablauf besprechen",
  },
};
const icons = [Workflow, Puzzle, ShieldCheck];

export function OperationalPlatform() {
  const { lang } = useT();
  const t = copy[lang === "en" || lang === "de" ? lang : "ro"];
  return (
    <section className="border-y border-border bg-surface-1">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <h2 className="max-w-3xl font-display text-3xl font-semibold text-foreground md:text-4xl">{t.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{t.body}</p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {t.items.map(([title, body], i) => {
            const Icon = icons[i];
            return <div key={title}>
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>;
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link to="/modules">{t.modules}<ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline"><Link to="/discovery">{t.custom}<ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
    </section>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { OixLayout } from "@/components/oix/oix-layout";
import { SectionShell } from "@/components/oix/section-shell";
import { OperationalBenchmarks, OperationalSimulator } from "@/components/oix/operational-benchmarks";
import { useBenchmarkCopy } from "@/i18n/pages/benchmarks";

export const Route = createFileRoute("/studies")({
  head: () => ({
    meta: [
      { title: "Studii de piață și simulator de impact operațional — OPSQAI" },
      { name: "description", content: "Analize OPSQAI pe studii Microsoft și Coveo, cu surse și metodologie. Simulează costul căutării informației pe datele firmei tale, fără economii promise." },
      { property: "og:title", content: "Studii & impact operațional — OPSQAI" },
      { property: "og:description", content: "Cercetare de industrie, analiză OPSQAI și un simulator transparent al costului operațional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/studies" }],
  }),
  component: StudiesPage,
});

function StudiesPage() {
  const t = useBenchmarkCopy();
  return <OixLayout>
    <SectionShell className="pb-8 md:pb-10">
      <p className="text-xs font-semibold text-primary">OPSQAI / {t.nav}</p>
      <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold md:text-5xl">{t.methodology}</h1>
      <div className="mt-10 grid gap-8 md:grid-cols-3">{t.steps.map(([title, body], index) => <div key={title} className="border-t border-border pt-5"><p className="font-mono text-sm text-primary">0{index + 1}</p><h2 className="mt-3 font-display text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p></div>)}</div>
    </SectionShell>
    <OperationalBenchmarks />
    <OperationalSimulator />
  </OixLayout>;
}
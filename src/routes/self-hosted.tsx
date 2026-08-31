import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead } from "@/lib/seo";
import {
  HardDrive,
  Shield,
  Database,
  Cpu,
  Server,
  Lock,
  CheckCircle2,
  ArrowDown,
  Cloud,
} from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ServerMonolith } from "@/components/three/primitives/server-monolith";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
import { useSelfHostedCopy } from "@/i18n/pages/self-hosted";

export const Route = createFileRoute("/self-hosted")({
  head: () =>
    pageHead({
      title: "Self-Hosted — OPSQAI on Windows · The Product",
      description:
        "The Windows Self-Hosted installation is the product. Local PostgreSQL, pgvector, local embeddings, customer-owned AI provider. OPSQAI Cloud is used only for licensing, updates and support.",
      path: "/self-hosted",
      keywords:
        "windows self-hosted AI, on-premise AI, windows server AI, sovereign AI, private LLM, enterprise on-prem AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Self-hosted", path: "/self-hosted" },
      ],
    }),
  component: SelfHostedPage,
});

const PILLAR_ICONS = [HardDrive, Database, Cpu, Shield, Lock, Server];
const FLOW_ICONS = [Server, HardDrive, Database, Database, HardDrive, Cpu];

function SelfHostedPage() {
  const t = useSelfHostedCopy();

  return (
    <OixLayout>
      {/* Cinematic hero with rotating monolith */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[3.5, 1.2, 5.5]} cameraFov={42}>
            <ambientLight intensity={0.35} />
            <pointLight position={[5, 4, 5]} intensity={1.2} color="#5b8cf7" />
            <pointLight position={[-4, 2, 3]} intensity={0.7} color="#5b3df5" />
            <GridFloor />
            <EmberFog />
            <ServerMonolith />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 30% 40%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.85) 80%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={t.heroEyebrow}
              serifAccent={t.heroSerifAccent}
            >
              {t.heroHeadline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {t.heroBody}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact" variant="gold" withArrow>
                {t.ctaRequestInstallation}
              </OixButton>
              <OixButton to="/documentation" variant="ghost">
                {t.ctaReadDocumentation}
              </OixButton>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </section>

      {/* Boundary diagram */}
      <SectionShell className="oix-hairline-bottom">
        <EditorialHeadline eyebrow={t.dataFlowEyebrow} serifAccent={t.dataFlowSerifAccent}>
          {t.dataFlowHeadline}
        </EditorialHeadline>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--oix-cream)]/70">
          {t.dataFlowBody}
        </p>

        <div className="mt-14 grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-10 items-start">
          <div className="flex flex-col items-center gap-2">
            {t.flow.map((f, i) => {
              const Icon = FLOW_ICONS[i];
              return (
                <div key={f.label} className="w-full max-w-md flex flex-col items-center">
                  <Card className="w-full p-4 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur flex items-center gap-4">
                    <Icon className="h-5 w-5 text-[var(--oix-gold)] shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[var(--oix-cream)]">{f.label}</div>
                      <p className="text-xs text-[var(--oix-cream)]/60 mt-0.5">{f.body}</p>
                    </div>
                  </Card>
                  {i < t.flow.length - 1 && (
                    <ArrowDown className="h-4 w-4 text-[var(--oix-gold)]/60 my-1" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <Card className="p-5 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-[var(--oix-gold)]" />
                <div className="font-semibold text-sm text-[var(--oix-cream)]">
                  {t.crossesBoundaryTitle}
                </div>
              </div>
              <ul className="mt-3 text-xs text-[var(--oix-cream)]/65 leading-relaxed space-y-1.5 list-disc list-inside">
                {t.crossesBoundaryItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-5 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[var(--oix-emerald-glow)]" />
                <div className="font-semibold text-sm text-[var(--oix-cream)]">
                  {t.neverLeavesTitle}
                </div>
              </div>
              <ul className="mt-3 text-xs text-[var(--oix-cream)]/65 leading-relaxed space-y-1.5 list-disc list-inside">
                {t.neverLeavesItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Pillars */}
      <SectionShell>
        <EditorialHeadline eyebrow={t.pillarsEyebrow} serifAccent={t.pillarsSerifAccent}>
          {t.pillarsHeadline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <Card
                key={p.title}
                className="p-6 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
              >
                <Icon className="h-6 w-6 text-[var(--oix-gold)]" />
                <div className="mt-4 font-semibold text-[var(--oix-cream)]">{p.title}</div>
                <p className="mt-2 text-sm text-[var(--oix-cream)]/65 leading-relaxed">{p.body}</p>
              </Card>
            );
          })}
        </div>
      </SectionShell>

      {/* Requirements */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow={t.requirementsEyebrow} serifAccent={t.requirementsSerifAccent}>
          {t.requirementsHeadline}
        </EditorialHeadline>
        <ul className="mt-10 grid md:grid-cols-2 gap-3">
          {t.requirements.map((r) => (
            <li
              key={r}
              className="flex items-start gap-3 text-sm text-[var(--oix-cream)]/75 border border-[var(--oix-gold-line)]/30 rounded-none p-4 bg-[var(--oix-onyx)]/40"
            >
              <CheckCircle2 className="h-4 w-4 text-[var(--oix-gold)] shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <EditorialHeadline
            align="center"
            eyebrow={t.finalEyebrow}
            serifAccent={t.finalSerifAccent}
          >
            {t.finalHeadline}
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            {t.finalBody}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact" variant="gold" withArrow>
              {t.ctaContactSales}
            </OixButton>
            <OixButton to="/security" variant="ghost">
              {t.ctaSecurityOverview}
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}

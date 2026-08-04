import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead } from "@/lib/seo";
import {
  Shield,
  Lock,
  KeyRound,
  FileCheck2,
  Database,
  Users,
  ScrollText,
  Server,
  ShieldCheck,
  Fingerprint,
  BadgeCheck,
  History,
  Cloud,
  HardDrive,
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
import { useSecurityCopy } from "@/i18n/pages/security";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security — OPSQAI · Sovereign by design",
      description:
        "Ed25519-signed licenses, signed activation bundles, hash-chained audit trail, CRL, chunk-level ACL. OPSQAI never sees operational knowledge.",
      path: "/security",
      keywords:
        "OPSQAI security, Ed25519 licenses, activation bundle, hash-chained audit, CRL, chunk-level ACL, GDPR",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Security", path: "/security" },
      ],
    }),
  component: SecurityPage,
});

const PILLAR_ICONS = [
  KeyRound,
  BadgeCheck,
  History,
  Shield,
  Lock,
  Fingerprint,
  FileCheck2,
  Database,
  ScrollText,
  Users,
  Server,
  ShieldCheck,
];

function SecurityPage() {
  const t = useSecurityCopy();
  const pillars = t.pillars.items.map((p, i) => ({ ...p, icon: PILLAR_ICONS[i] }));

  return (
    <OixLayout>
      {/* Cinematic hero — vault of signatures */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[0, 1.6, 6]} cameraFov={40}>
            <ambientLight intensity={0.3} />
            <pointLight position={[4, 3, 4]} intensity={1.1} color="#c9a84c" />
            <pointLight position={[-4, 2, 2]} intensity={0.6} color="#0d7a5f" />
            <GridFloor />
            <EmberFog />
            <ServerMonolith />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 70% 40%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.9) 82%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="hidden md:block" />
          <div>
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={t.hero.eyebrow}
              serifAccent={t.hero.serifAccent}
            >
              {t.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {t.hero.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact?subject=security" variant="gold" withArrow>
                {t.hero.ctaPrimary}
              </OixButton>
              <OixButton to="/self-hosted" variant="ghost">
                {t.hero.ctaSecondary}
              </OixButton>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee statement */}
      <SectionShell className="oix-hairline-bottom">
        <div className="max-w-3xl">
          <div className="oix-eyebrow mb-6">{t.guarantee.eyebrow}</div>
          <p className="oix-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.1] text-[var(--oix-cream)]">
            {t.guarantee.lead}{" "}
            <span className="oix-serif-italic normal-case tracking-normal text-[var(--oix-gold-soft)]">
              {t.guarantee.accent}
            </span>
          </p>
        </div>
      </SectionShell>

      {/* Twelve pillars */}
      <SectionShell>
        <EditorialHeadline eyebrow={t.pillars.eyebrow} serifAccent={t.pillars.serifAccent}>
          {t.pillars.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <Card
              key={p.title}
              className="p-6 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <p.icon className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="mt-4 font-semibold text-[var(--oix-cream)]">{p.title}</div>
              <p className="mt-2 text-sm text-[var(--oix-cream)]/65 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Boundary — cloud vs on-prem */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow={t.boundary.eyebrow} serifAccent={t.boundary.serifAccent}>
          {t.boundary.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Card className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="font-semibold text-[var(--oix-cream)]">{t.boundary.cloud.title}</div>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">
              {t.boundary.cloud.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            <div className="flex items-center gap-3">
              <HardDrive className="h-6 w-6 text-[var(--oix-emerald-glow)]" />
              <div className="font-semibold text-[var(--oix-cream)]">{t.boundary.onprem.title}</div>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">
              {t.boundary.onprem.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <EditorialHeadline
            align="center"
            eyebrow={t.finalCta.eyebrow}
            serifAccent={t.finalCta.serifAccent}
          >
            {t.finalCta.headline}
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            {t.finalCta.body}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact?subject=security" variant="gold" withArrow>
              {t.finalCta.ctaPrimary}
            </OixButton>
            <OixButton to="/self-hosted" variant="ghost">
              {t.finalCta.ctaSecondary}
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}

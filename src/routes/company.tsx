import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead } from "@/lib/seo";
import {
  Target,
  Eye,
  Compass,
  Users,
  MapPin,
  TrendingUp,
  Globe2,
  Factory,
  Truck,
} from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ParticleGenesis } from "@/components/three/particle-genesis";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";

export const Route = createFileRoute("/company")({
  head: () =>
    pageHead({
      title: "Company — OPSQAI · Enterprise Operational AI Platform",
      description:
        "OPSQAI is building the operational AI layer for industrial companies. Windows self-hosted, sovereign by design. Mission, team and go-to-market.",
      path: "/company",
      keywords:
        "OPSQAI company, mission, team, go-to-market, DACH logistics, industrial AI, sovereign AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Company", path: "/company" },
      ],
    }),
  component: CompanyPage,
});

const TEAM = [
  {
    name: "Ștefan Bari",
    role: "Founder & CEO / Owner",
    body: "Owns product direction, customer relationships and commercial strategy. Drives OPSQAI's positioning as the operational AI layer for industrial companies.",
  },
  {
    name: "CTO",
    role: "Chief Technology Officer — to be named",
    body: "Owns platform, security and the license system. Ships the Windows installer, audit trail and update pipeline.",
  },
  {
    name: "Head of AI",
    role: "AI & Retrieval — planned hire",
    body: "Owns the AI adapter registry, retrieval pipeline and grounded-prompt contract.",
  },
];

const PHASES = [
  {
    icon: Truck,
    tag: "Phase 01",
    title: "DACH Logistics",
    body: "Warehousing, 3PL and distribution operators in Germany, Austria and Switzerland. Windows-native fits their reality; data sovereignty is non-negotiable.",
  },
  {
    icon: Factory,
    tag: "Phase 02",
    title: "Industrial Manufacturing",
    body: "Discrete and process manufacturing. Same operational-knowledge problem, same regulatory pressure, same infrastructure profile.",
  },
  {
    icon: Globe2,
    tag: "Phase 03",
    title: "European Expansion",
    body: "Extend across regulated European industries where operational AI must run inside the customer's boundary.",
  },
];

const MARKET = [
  { tag: "TAM", value: "€4.8B", body: "EU industrial, logistics and manufacturing organisations with 250+ employees." },
  { tag: "SAM", value: "€1.1B", body: "DACH + Benelux + Nordics operators with a regulated SOP surface and enterprise IT budget." },
  { tag: "SOM", value: "€90M", body: "First-wave design partners: logistics networks, warehouse operators and mid-cap manufacturers." },
];

function CompanyPage() {
  return (
    <OixLayout>
      {/* Hero — particle genesis */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[0, 0.6, 6]} cameraFov={44}>
            <ambientLight intensity={0.35} />
            <pointLight position={[3, 3, 3]} intensity={1} color="#c9a84c" />
            <pointLight position={[-3, 2, 1]} intensity={0.5} color="#0d7a5f" />
            <GridFloor />
            <EmberFog />
            <ParticleGenesis progress={0.6} />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(65% 60% at 30% 45%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.88) 82%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow="Company · Made in Europe"
              serifAccent="not instead of them."
            >
              AI that works for people.
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              OPSQAI is building the operational AI layer for industrial companies —
              delivered as a Windows Self-Hosted product, sovereign by design, and
              owned entirely by the customer.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact?subject=partnership" variant="gold" withArrow>
                Talk to the founders
              </OixButton>
              <OixButton to="/self-hosted" variant="ghost">
                See the product
              </OixButton>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision / Why */}
      <SectionShell>
        <EditorialHeadline eyebrow="Mission · Vision · Why now" serifAccent="operate.">
          The principles we
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Mission", body: "Bring AI to work for the people who run operations — supervisors, warehouse leads, plant managers — without asking them to hand their knowledge to public cloud LLMs." },
            { icon: Eye, title: "Vision", body: "Every industrial company runs an operational AI platform inside its own boundary. Knowledge stays where it belongs; the AI helps the team instead of replacing it." },
            { icon: Compass, title: "Why now", body: "Industrial companies cannot place operational knowledge inside public LLMs. They need ownership, governance and full data sovereignty. OPSQAI is built for that reality." },
          ].map((p) => (
            <Card
              key={p.title}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <p.icon className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="mt-6 oix-display text-xl text-[var(--oix-cream)]">{p.title}</div>
              <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Team */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow="Team · Deliberate" serifAccent="overstated.">
          Small.  Never
        </EditorialHeadline>
        <p className="mt-6 max-w-2xl text-[15px] text-[var(--oix-cream)]/70 leading-relaxed">
          Every role reflects either an active founder or a planned hire — we
          don&apos;t list titles we don&apos;t hold.
        </p>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {TEAM.map((p) => (
            <Card
              key={p.role}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <Users className="h-5 w-5 text-[var(--oix-gold)]" />
              <div className="mt-6 oix-display text-lg text-[var(--oix-cream)]">{p.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--oix-gold-soft)]">
                {p.role}
              </div>
              <p className="mt-4 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Go-to-market */}
      <SectionShell>
        <EditorialHeadline eyebrow="Go-to-market" serifAccent="industrial Europe.">
          Land in DACH. Expand into
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {PHASES.map((p) => (
            <Card
              key={p.title}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <p.icon className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="mt-6 text-[10px] uppercase tracking-[0.24em] text-[var(--oix-gold-soft)] font-mono">
                {p.tag}
              </div>
              <div className="mt-2 oix-display text-xl text-[var(--oix-cream)]">{p.title}</div>
              <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Market */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow="Market · Discipline" serifAccent="defensible.">
          Large. And
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {MARKET.map((m) => (
            <Card
              key={m.tag}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--oix-gold)]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--oix-gold-soft)]">
                  {m.tag}
                </span>
              </div>
              <div className="mt-4 oix-display text-4xl text-[var(--oix-cream)]">{m.value}</div>
              <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{m.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <MapPin className="h-6 w-6 text-[var(--oix-gold)] mx-auto" />
          <div className="mt-6">
            <EditorialHeadline
              align="center"
              eyebrow="Built in Europe"
              serifAccent="Windows environment."
            >
              Deployed inside your
            </EditorialHeadline>
          </div>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            Talk to us about a reference install, a partnership, or a demo of the
            Windows Self-Hosted product.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact" variant="gold" withArrow>
              Contact OPSQAI
            </OixButton>
            <OixButton to="/self-hosted" variant="ghost">
              See the Self-Hosted product
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    tag: "Phase 1",
    title: "DACH Logistics",
    body: "Warehousing, 3PL and distribution operators in Germany, Austria and Switzerland. Windows-native fits their reality; data sovereignty is non-negotiable.",
  },
  {
    icon: Factory,
    tag: "Phase 2",
    title: "Industrial Manufacturing",
    body: "Discrete and process manufacturing. Same operational-knowledge problem, same regulatory pressure, same infrastructure profile.",
  },
  {
    icon: Globe2,
    tag: "Phase 3",
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
    <MarketingLayout>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Company</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          AI that works for people. Not instead of them.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI is building the operational AI layer for industrial companies —
          delivered as a Windows Self-Hosted product, sovereign by design, and owned
          entirely by the customer.
        </p>
      </section>

      {/* Mission / Vision / Why */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-border/60">
            <Target className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Mission</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Bring AI to work for the people who run operations — supervisors,
              warehouse leads, plant managers — without asking them to hand their
              knowledge to public cloud LLMs.
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <Eye className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Vision</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every industrial company runs an operational AI platform inside its
              own boundary. Knowledge stays where it belongs; the AI helps the team
              instead of replacing it.
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <Compass className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Why OPSQAI, Why now</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Industrial companies cannot place operational knowledge inside public
              LLMs. They need ownership, governance and full data sovereignty.
              OPSQAI is built for that reality — Windows-native and self-hosted.
            </p>
          </Card>
        </div>
      </section>

      {/* Team */}
      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Team</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
              A small, deliberate team.
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              We do not overstate the team. Every role reflects either an active
              founder or a planned hire.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TEAM.map((p) => (
              <Card key={p.role} className="p-6 border-border/60">
                <Users className="h-5 w-5 text-primary" />
                <div className="mt-4 font-semibold">{p.name}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                  {p.role}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Go-to-market */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">
            Go-to-market
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Land in DACH logistics. Expand into industrial Europe.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PHASES.map((p) => (
            <Card key={p.title} className="p-6 border-border/60">
              <p.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 text-xs uppercase tracking-wider text-primary font-mono">
                {p.tag}
              </div>
              <div className="mt-1 font-semibold">{p.title}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Market */}
      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Market</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
              A large, defensible market — approached with discipline.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {MARKET.map((m) => (
              <Card key={m.tag} className="p-6 border-border/60">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-xs font-mono text-primary">{m.tag}</span>
                </div>
                <div className="mt-3 font-semibold">{m.value}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Where we are */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <MapPin className="h-6 w-6 text-primary mx-auto" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Built in Europe. Deployed inside your Windows environment.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Talk to us about a reference install, a partnership, or a demo of the
          Windows Self-Hosted product.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button asChild>
            <Link to="/contact">Contact OPSQAI</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/self-hosted">See the Self-Hosted product</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

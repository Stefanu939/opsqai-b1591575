import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  BookOpen,
  ShieldCheck,
  Users,
  Building2,
  GraduationCap,
  Lock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Warehouse,
  Truck,
  Factory,
  PackageSearch,
  Boxes,
  Layers,
  Activity,
  Cpu,
  Database,
  ScrollText,
  KeyRound,
  Server,
  FileCheck2,
  Package,
  Puzzle,
  LifeBuoy,
  HardDrive,
  Globe2,
  ShieldAlert,
  Fingerprint,
  Workflow,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pageHead, softwareApplicationLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ParticleGenesis } from "@/components/three/particle-genesis";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { MottoBand } from "@/components/oix/motto-band";
import { SecurityWall } from "@/components/oix/security-wall";
import { OixButton } from "@/components/oix/buttons";
import { useHomeCopy } from "@/i18n/pages/home";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "OPSQAI — Enterprise Operational AI Platform · Windows Self-Hosted",
      description:
        "OPSQAI is an Enterprise Operational AI Platform delivered as a Windows Self-Hosted product. Sovereign by design: customers own their data, documents, embeddings and AI provider. OPSQAI never sees operational knowledge.",
      path: "/",
      keywords:
        "enterprise operational AI, windows self-hosted AI, sovereign AI, industrial AI platform, logistics AI, manufacturing AI, on-premise AI",
      jsonLd: [
        softwareApplicationLd({
          description:
            "Enterprise Operational AI Platform delivered as a Windows Self-Hosted product. Governed AI over operational knowledge, with local PostgreSQL, local embeddings, customer-owned AI provider, signed licenses and a hash-chained audit trail.",
        }),
      ],
    }),
  component: Home,
});

function Home() {
  // Self-Hosted desktop shell: never render the marketing landing.
  // The installed app must feel like a real desktop program — the
  // very first paint after health-gate is the login screen.
  //
  // The Electron shell already loads /auth?audience=company directly,
  // so this branch is only a belt-and-braces guard for a user who
  // types https://localhost/ into the address bar or hits a stale
  // bookmark. Compute synchronously (no useEffect) so the marketing
  // sections never mount in selfhost mode.
  const selfhostMode =
    typeof window !== "undefined" &&
    (((window as unknown as { __OPSQAI_MODE__?: string }).__OPSQAI_MODE__ ??
      (import.meta.env.VITE_OPSQAI_MODE as string | undefined)) === "selfhost");

  useEffect(() => {
    if (selfhostMode) {
      window.location.replace("/auth?audience=company");
    }
  }, [selfhostMode]);

  if (selfhostMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--oix-bg-deep, #04211a)",
        }}
        aria-hidden
      />
    );
  }


  return (
    <OixLayout>
      <Hero />
      <WhoFor />
      <WhyNow />
      <MottoBand />
      <ThreeSurfaces />
      <BasicPlatform />
      <PremiumModules />
      <DeliveryComparison />
      <Differentiation />
      <SecurityWall />
      <LandExpand />
      <Maturity />
      <FAQSection />
      <FinalCTA />
    </OixLayout>
  );
}

/* ---------------- Shared ---------------- */

function SectionHead({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "max-w-3xl mx-auto text-center" : "max-w-3xl"}>
      <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
      {intro && (
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">{intro}</p>
      )}
    </div>
  );
}

/* ---------------- Hero — Cinematic 3D Genesis ---------------- */

function useScrollProgress(maxScroll = 1100) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const y = Math.min(window.scrollY, maxScroll);
      setP((y / maxScroll) * 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxScroll]);
  return p;
}

function Hero() {
  const t = useHomeCopy();
  const progress = useScrollProgress(1100);
  const acts = t.hero.acts.map((label, i) => ({ i, label }));
  const activeAct = Math.min(4, Math.max(0, Math.round(progress)));

  return (
    <section className="relative isolate min-h-dvh overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Scene3D cameraPosition={[0, 0.5, 7]} cameraFov={48}>
          <ambientLight intensity={0.25} />
          <pointLight position={[6, 4, 6]} intensity={0.9} color="#c9a84c" />
          <pointLight position={[-6, -3, 4]} intensity={0.6} color="#2dd4a8" />
          <GridFloor />
          <EmberFog />
          <ParticleGenesis progress={progress} autoPlay={false} />
          <GoldBloom />
        </Scene3D>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 20%, rgba(13,122,95,0.20) 0%, transparent 60%), linear-gradient(180deg, rgba(4,10,8,0.55) 0%, rgba(4,10,8,0.85) 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-40 md:pt-40 md:pb-48">
        <div className="max-w-4xl">
          <EditorialHeadline
            as="h1"
            size="xl"
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-[var(--oix-gold)]" />
                {t.hero.eyebrow}
              </span>
            }
            serifAccent={t.hero.serifAccent}
          >
            {t.hero.h1a}
            <br className="hidden sm:block" /> {t.hero.h1b}
          </EditorialHeadline>

          <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-[var(--oix-cream)]/75">
            {t.hero.intro}{" "}
            <em className="oix-serif-italic text-[var(--oix-gold)]">{t.hero.introEm}</em>.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <OixButton to="/self-hosted" variant="gold" withArrow>
              {t.cta.howItWorks}
            </OixButton>
            <OixButton to="/contact" variant="ghost">
              {t.cta.requestDemo}
            </OixButton>
          </div>
        </div>

        <div className="pointer-events-none mt-24 hidden md:flex items-center gap-6 text-[10px] uppercase tracking-[0.28em] text-[var(--oix-cream)]/50">
          {acts.map((a) => (
            <div
              key={a.label}
              className={
                "flex items-center gap-2 transition-opacity duration-500 " +
                (a.i === activeAct ? "opacity-100 text-[var(--oix-gold)]" : "opacity-40")
              }
            >
              <span className="font-mono">0{a.i + 1}</span>
              <span>{a.label}</span>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[var(--oix-cream)]/40">
          {t.hero.scrollHint}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Who is it for ---------------- */

const AUDIENCE_ICONS = [Warehouse, Truck, Factory, Layers, PackageSearch, Building2];

function WhoFor() {
  const t = useHomeCopy().whoFor;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {t.audiences.map((label, i) => {
          const Icon = AUDIENCE_ICONS[i];
          return (
            <Card
              key={label}
              className="p-4 border-border/60 flex flex-col items-center text-center gap-2"
            >
              <Icon className="h-5 w-5 text-primary" />
              <div className="text-[13px] font-medium">{label}</div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Why now ---------------- */

const WHY_NOW_ICONS = [ShieldAlert, Fingerprint, Server];

function WhyNow() {
  const t = useHomeCopy().whyNow;
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
          <div className="grid gap-3">
            {t.reasons.map((r, i) => {
              const Icon = WHY_NOW_ICONS[i];
              return (
                <Card key={r.title} className="p-5 border-border/60">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">{r.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Three Surfaces ---------------- */

const SURFACE_ICONS = [Building2, Users, HardDrive];

function ThreeSurfaces() {
  const t = useHomeCopy().surfaces;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {t.items.map((s, i) => {
          const Icon = SURFACE_ICONS[i];
          return (
            <Card key={s.name} className="p-6 border-border/60 flex flex-col">
              <Icon className="h-6 w-6 text-primary" />
              <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {s.tag}
              </div>
              <div className="mt-1 font-semibold text-lg">{s.name}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
                {s.body}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-foreground/85 leading-relaxed">
        <span className="font-semibold text-primary">{t.noteStrong}</span> {t.note}
      </div>
    </section>
  );
}

/* ---------------- Basic Platform ---------------- */

const BASIC_ICONS = [MessageSquare, BookOpen, FileCheck2, GraduationCap, ScrollText, Users, Building2, Package];

function BasicPlatform() {
  const t = useHomeCopy().basic;
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {t.items.map((m, i) => {
            const Icon = BASIC_ICONS[i];
            return (
              <Card key={m.name} className="p-5 border-border/60">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-semibold text-sm">{m.name}</div>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{m.body}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Premium Modules ---------------- */

const PREMIUM_ICONS = [Activity, Puzzle, Workflow];

function PremiumModules() {
  const t = useHomeCopy().premium;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        <div className="space-y-3">
          {t.reasons.map((r, i) => {
            const Icon = PREMIUM_ICONS[i];
            return (
              <Card key={r.title} className="p-5 border-border/60">
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">{r.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
          <Button asChild variant="outline" className="mt-2">
            <Link to="/modules">
              {t.browseModules}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Delivery Comparison ---------------- */

function DeliveryComparison() {
  const t = useHomeCopy().compare;
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        <div className="mt-10 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium"></th>
                <th className="p-4 font-medium text-primary">{t.colHeaders[0]}</th>
                <th className="p-4 font-medium">{t.colHeaders[1]}</th>
                <th className="p-4 font-medium">{t.colHeaders[2]}</th>
                <th className="p-4 font-medium">{t.colHeaders[3]}</th>
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr
                  key={r.label}
                  className={i % 2 === 0 ? "bg-background" : "bg-surface-1/60"}
                >
                  <td className="p-4 font-medium">{r.label}</td>
                  <td className="p-4 text-primary font-medium">{r.opsqai}</td>
                  <td className="p-4 text-muted-foreground">{r.chatbot}</td>
                  <td className="p-4 text-muted-foreground">{r.diy}</td>
                  <td className="p-4 text-muted-foreground">{r.search}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Differentiation Grid ---------------- */

const DIFF_ICONS = [
  HardDrive, Server, Globe2, Brain, ScrollText, Puzzle,
  FileCheck2, Lock, Database, Fingerprint, Cpu, KeyRound,
];

function Differentiation() {
  const t = useHomeCopy().diff;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead eyebrow={t.eyebrow} title={t.title} />
      <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {t.items.map((d, i) => {
          const Icon = DIFF_ICONS[i];
          return (
            <Card key={d.title} className="p-5 border-border/60">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold text-sm">{d.title}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{d.body}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Land & Expand ---------------- */

function LandExpand() {
  const t = useHomeCopy().landExpand;
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {t.steps.map((s, i) => (
            <Card key={s.title} className="p-5 border-border/60">
              <div className="text-xs font-mono text-primary">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-2 font-semibold text-sm">{s.title}</div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Maturity ---------------- */

function Maturity() {
  const t = useHomeCopy().maturity;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      <div className="mt-10 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {t.items.map((m) => (
          <div
            key={m}
            className="flex items-start gap-2 rounded-md border border-border/60 bg-surface-1/60 px-4 py-3 text-sm"
          >
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground/90">{m}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

function FAQSection() {
  const t = useHomeCopy().faq;
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20">
        <SectionHead eyebrow={t.eyebrow} title={t.title} />
        <Accordion type="single" collapsible className="mt-8">
          {t.items.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left text-[15px] font-medium">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  const t = useHomeCopy().finalCta;
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-24 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
        {t.title}
      </h2>
      <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
        {t.body}
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg">
          <Link to="/contact">{t.requestDemo}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/self-hosted">{t.seeHowItWorks}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link to="/company">
            {t.aboutOpsqai}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

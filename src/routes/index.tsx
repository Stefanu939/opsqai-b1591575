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
  // Self-Hosted desktop shell: skip the marketing landing and go
  // straight to the local sign-in surface. The installed app must
  // behave like a real desktop program, not a browser tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mode =
      (window as unknown as { __OPSQAI_MODE__?: string }).__OPSQAI_MODE__ ??
      (import.meta.env.VITE_OPSQAI_MODE as string | undefined);
    if (mode === "selfhost") {
      window.location.replace("/auth?audience=company");
    }
  }, []);

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
  const progress = useScrollProgress(1100);
  const acts = [
    { i: 0, label: "Chaos" },
    { i: 1, label: "Documents" },
    { i: 2, label: "SOPs" },
    { i: 3, label: "Network" },
    { i: 4, label: "OPSQAI" },
  ];
  const activeAct = Math.min(4, Math.max(0, Math.round(progress)));

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
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
                Enterprise Operational Intelligence
              </span>
            }
            serifAccent="for people."
          >
            The operating system
            <br className="hidden sm:block" /> for operational knowledge —
          </EditorialHeadline>

          <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-[var(--oix-cream)]/75">
            OPSQAI is a Windows Self-Hosted platform that brings governed AI to
            industrial operations. Sovereign by design. Customers own their
            data, documents, embeddings and AI provider. We never see
            operational knowledge — and we built it that way on purpose,
            because it&apos;s{" "}
            <em className="oix-serif-italic text-[var(--oix-gold)]">not without them</em>.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <OixButton to="/self-hosted" variant="gold" withArrow>
              How it works
            </OixButton>
            <OixButton to="/contact" variant="ghost">
              Request demo
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
          Scroll — the film begins
        </div>
      </div>
    </section>
  );
}

/* ---------------- Who is it for ---------------- */

const AUDIENCES = [
  { icon: Warehouse, label: "Warehousing" },
  { icon: Truck, label: "Logistics" },
  { icon: Factory, label: "Manufacturing" },
  { icon: Layers, label: "Production" },
  { icon: PackageSearch, label: "Distribution" },
  { icon: Building2, label: "Enterprise Operations" },
];

function WhoFor() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead
        eyebrow="Who is OPSQAI for"
        title="Built for industrial operations."
        intro="OPSQAI is designed for teams whose knowledge is operational, regulated and never allowed to leave the company boundary."
      />
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {AUDIENCES.map((a) => (
          <Card
            key={a.label}
            className="p-4 border-border/60 flex flex-col items-center text-center gap-2"
          >
            <a.icon className="h-5 w-5 text-primary" />
            <div className="text-[13px] font-medium">{a.label}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Why now ---------------- */

function WhyNow() {
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <SectionHead
            eyebrow="Why now"
            title="Industrial companies can't hand knowledge to public LLMs."
            intro="Operational documents, SOPs, procedures and audits describe how a business actually runs. They require ownership, governance and complete data sovereignty — not a chat window backed by a cloud tenant nobody controls."
          />
          <div className="grid gap-3">
            {[
              { icon: ShieldAlert, title: "Data cannot leave the company", body: "Operational knowledge is proprietary. Regulators and customers demand it stays inside the company boundary." },
              { icon: Fingerprint, title: "AI must be governed", body: "Every answer needs provenance: which document, which version, which user. Public chatbots cannot deliver this." },
              { icon: Server, title: "Infrastructure is Windows", body: "Real operations run Windows Server, Active Directory and on-prem PostgreSQL. OPSQAI meets them there." },
            ].map((r) => (
              <Card key={r.title} className="p-5 border-border/60">
                <div className="flex items-start gap-3">
                  <r.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">{r.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Three Surfaces ---------------- */

const SURFACES = [
  {
    icon: Building2,
    tag: "Cloud · OPSQAI only",
    name: "Management Center",
    body:
      "Internal control plane used exclusively by OPSQAI to administer customers: companies, installations, licenses, releases, signing keys, activation bundles, ownership, support and audit. Never sold. Never installed. Never accessed by customers.",
  },
  {
    icon: Users,
    tag: "Cloud · Customer contacts",
    name: "Customer Portal",
    body:
      "Service surface at opsqai.de for designated customer contacts. Download the installer and updates, retrieve activation bundles, read release notes and documentation, manage subscription and support. Not the product — a service layer around it.",
  },
  {
    icon: HardDrive,
    tag: "Windows · The product",
    name: "Self-Hosted",
    body:
      "The Windows Self-Hosted installation is the product. AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription, Updates and Modules — all running inside the customer's environment. Employees work here every day.",
  },
];

function ThreeSurfaces() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead
        eyebrow="Product architecture"
        title="One platform. Three surfaces. One product."
        intro="OPSQAI Cloud is not the product. The Windows Self-Hosted installation is the product. The two cloud surfaces exist only to support it."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SURFACES.map((s) => (
          <Card key={s.name} className="p-6 border-border/60 flex flex-col">
            <s.icon className="h-6 w-6 text-primary" />
            <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {s.tag}
            </div>
            <div className="mt-1 font-semibold text-lg">{s.name}</div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
              {s.body}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-foreground/85 leading-relaxed">
        <span className="font-semibold text-primary">Important:</span> OPSQAI
        Cloud is not the product. It exists only for licensing, releases,
        installer distribution, customer support, the Customer Portal and the
        Management Center. The product itself is the Windows installation
        inside the customer's environment.
      </div>
    </section>
  );
}

/* ---------------- Basic Platform ---------------- */

const BASIC = [
  { icon: MessageSquare, name: "AI Chat", body: "Grounded, source-cited conversations over the customer's own knowledge." },
  { icon: BookOpen, name: "Knowledge Base", body: "SOPs, manuals and procedures — chunked, embedded and retrievable locally." },
  { icon: FileCheck2, name: "FAQ", body: "Curated operational answers, ranked and reused across the workforce." },
  { icon: GraduationCap, name: "Academy", body: "Structured training paths and lessons built from the knowledge base." },
  { icon: ScrollText, name: "AI Audit", body: "Every AI interaction is logged with inputs, outputs, sources and users." },
  { icon: Users, name: "Users", body: "Role-based access: owner, admin, manager, supervisor, worker, viewer." },
  { icon: Building2, name: "Organization", body: "Configure AI provider, departments, branding and workspace-wide policy." },
  { icon: Package, name: "Subscription", body: "See the exact platform and modules licensed to this installation." },
];

function BasicPlatform() {
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead
          eyebrow="Basic Platform"
          title="Everything you need to operate on day one."
          intro="The Basic Platform ships with every OPSQAI installation. It's what employees use every day."
        />
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {BASIC.map((m) => (
            <Card key={m.name} className="p-5 border-border/60">
              <m.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold text-sm">{m.name}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{m.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Premium Modules ---------------- */

function PremiumModules() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <SectionHead
          eyebrow="Premium Modules"
          title="Grow capability without reinstalling."
          intro="Premium modules unlock deeper capabilities on top of the Basic Platform. Each is licensed separately and activated by OPSQAI through a signed license — no reinstall, no downtime."
        />
        <div className="space-y-3">
          {[
            { icon: Activity, title: "Signed license activation", body: "OPSQAI issues an Ed25519-signed license bundle. The install verifies it locally and unlocks the module." },
            { icon: Puzzle, title: "No cross-module dependencies", body: "Modules are independent. Buy only what your operation needs, when it needs it." },
            { icon: Workflow, title: "Activated in place", body: "No reinstall, no migration, no data movement. Activation is silent and instant." },
          ].map((r) => (
            <Card key={r.title} className="p-5 border-border/60">
              <div className="flex items-start gap-3">
                <r.icon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">{r.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                </div>
              </div>
            </Card>
          ))}
          <Button asChild variant="outline" className="mt-2">
            <Link to="/modules">
              Browse all modules
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Delivery Comparison ---------------- */

const COMPARE = [
  {
    label: "Deployment",
    opsqai: "Windows Self-Hosted",
    chatbot: "Public SaaS",
    diy: "DIY on-prem stack",
    search: "Enterprise SaaS",
  },
  {
    label: "Data ownership",
    opsqai: "Customer",
    chatbot: "Vendor tenant",
    diy: "Customer",
    search: "Vendor tenant",
  },
  {
    label: "AI provider",
    opsqai: "Customer's choice",
    chatbot: "Vendor-locked",
    diy: "Customer's choice",
    search: "Vendor-locked",
  },
  {
    label: "Auditability",
    opsqai: "Hash-chained audit",
    chatbot: "Vendor-defined",
    diy: "Build it yourself",
    search: "Partial",
  },
  {
    label: "Governance",
    opsqai: "Role-based, chunk-level",
    chatbot: "Basic",
    diy: "DIY",
    search: "Document-level",
  },
  {
    label: "Grounded answers",
    opsqai: "Always cited",
    chatbot: "Often hallucinates",
    diy: "Depends on build",
    search: "Keyword-limited",
  },
  {
    label: "Time to value",
    opsqai: "Weeks",
    chatbot: "Days",
    diy: "Quarters",
    search: "Quarters",
  },
];

function DeliveryComparison() {
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead
          eyebrow="Delivery model"
          title="OPSQAI vs. cloud chatbots, DIY RAG and enterprise search."
          intro="OPSQAI is not a hosted chatbot, not a DIY stack, not another enterprise search tool. It is a self-hosted operational AI platform."
        />
        <div className="mt-10 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium"></th>
                <th className="p-4 font-medium text-primary">OPSQAI</th>
                <th className="p-4 font-medium">Cloud chatbot</th>
                <th className="p-4 font-medium">DIY RAG</th>
                <th className="p-4 font-medium">Enterprise search</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r, i) => (
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

const DIFF = [
  { icon: HardDrive, title: "Self-Hosted", body: "Runs entirely inside your Windows environment." },
  { icon: Server, title: "Windows Native", body: "Windows Server, WinSW services, Caddy — no Docker, no Linux." },
  { icon: Globe2, title: "Offline Capable", body: "Daily operation is fully local. Cloud only for licensing and updates." },
  { icon: Brain, title: "Governed AI", body: "Every answer is grounded and cited from local knowledge." },
  { icon: ScrollText, title: "Audit Trail", body: "Hash-chained, append-only audit of every privileged and AI action." },
  { icon: Puzzle, title: "Module Licensing", body: "Signed premium modules activated without reinstall." },
  { icon: FileCheck2, title: "Source Citations", body: "Answers point back to the exact document and section." },
  { icon: Lock, title: "Role-Based Access", body: "Chunk-level ACLs; owners, admins, managers, workers, viewers." },
  { icon: Database, title: "Local Embeddings", body: "pgvector inside your PostgreSQL. Vectors never leave." },
  { icon: Fingerprint, title: "Customer Owns Data", body: "Documents, embeddings, chats, users — all customer-owned." },
  { icon: Cpu, title: "Choice of AI Model", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter or compatible endpoints." },
  { icon: KeyRound, title: "No Vendor Lock-In", body: "Signed artifacts, portable data, documented DR. You can leave." },
];

function Differentiation() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead
        eyebrow="Differentiation"
        title="Twelve reasons operations teams choose OPSQAI."
      />
      <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {DIFF.map((d) => (
          <Card key={d.title} className="p-5 border-border/60">
            <d.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold text-sm">{d.title}</div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{d.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Land & Expand ---------------- */

const STEPS = [
  { n: "01", title: "Land", body: "Start with the Basic Platform on one Windows Server. One department, one operational domain." },
  { n: "02", title: "Ground", body: "Ingest SOPs, manuals and procedures. Local embeddings; customer-owned AI provider." },
  { n: "03", title: "Adopt", body: "Employees use AI Chat, FAQ and Academy every day. AI Audit records every interaction." },
  { n: "04", title: "Expand", body: "Activate premium modules through signed licenses — no reinstall, no downtime." },
  { n: "05", title: "Scale", body: "Roll out to adjacent sites and departments. Annual Maintenance keeps everything current." },
];

function LandExpand() {
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <SectionHead
          eyebrow="Land & Expand"
          title="A five-step customer journey."
          intro="OPSQAI is designed to start focused and grow with the operation."
        />
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {STEPS.map((s) => (
            <Card key={s.n} className="p-5 border-border/60">
              <div className="text-xs font-mono text-primary">{s.n}</div>
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

const MATURITY = [
  "Windows Server installer with WinSW services",
  "Local PostgreSQL with pgvector",
  "Local embeddings, no cloud round-trip for content",
  "Ed25519-signed licenses, verified offline",
  "Signed activation bundles with 90-day validity",
  "Hash-chained audit trail with CRL",
  "Chunk-level ACL enforcement",
  "Configurable AI provider (OpenAI, Azure, Ollama, compatible)",
  "Signed release manifests and updates",
  "Documented disaster recovery with bootstrap tokens",
  "Role-based access control across the workspace",
  "Bilingual UI (EN/DE) and PWA support",
];

function Maturity() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <SectionHead
        eyebrow="Production maturity"
        title="Not a prototype. A production platform."
        intro="Everything below is shipping today in the Windows Self-Hosted product."
      />
      <div className="mt-10 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {MATURITY.map((m) => (
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

const FAQ = [
  {
    q: "Is OPSQAI a SaaS product?",
    a: "No. OPSQAI is a Windows Self-Hosted product. Employees never work inside the cloud — they work inside the installation running on the customer's own Windows Server. OPSQAI Cloud only exists for licensing, releases, installer distribution, customer support, the Customer Portal and the Management Center.",
  },
  {
    q: "Does OPSQAI see our operational knowledge?",
    a: "No. Documents, embeddings, chat content and users all live inside the customer install. OPSQAI never stores operational customer knowledge. Only license and installation metadata reaches OPSQAI Cloud.",
  },
  {
    q: "Which AI providers are supported?",
    a: "OpenAI, Azure OpenAI, Ollama, OpenRouter, and any custom OpenAI-compatible endpoint. The customer owns the AI provider and its keys. OPSQAI has no default provider.",
  },
  {
    q: "How do we get new modules?",
    a: "Premium modules are purchased separately and activated by OPSQAI through a signed license bundle. Activation is silent — no reinstall, no data movement.",
  },
  {
    q: "What happens if we go offline?",
    a: "Daily operation continues. The installation only needs to reach OPSQAI Cloud for license activation, update checks and support. Everything else — chat, retrieval, audit — is fully local.",
  },
  {
    q: "Do you run on Docker or Linux?",
    a: "No. OPSQAI is a Windows Self-Hosted product. It runs directly on Windows Server, managed by WinSW, with a local PostgreSQL and Caddy. There is no Docker, Kubernetes or Linux requirement.",
  },
];

function FAQSection() {
  return (
    <section className="border-y border-border/50 bg-surface-1">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20">
        <SectionHead eyebrow="FAQ" title="Answers to what matters." />
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map((f, i) => (
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
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-24 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Bring AI to work for your operation.
      </h2>
      <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
        Talk to OPSQAI about a reference install of the Windows Self-Hosted
        product. See exactly how governed operational AI runs inside your
        environment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg">
          <Link to="/contact">Request demo</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/self-hosted">See how it works</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link to="/company">
            About OPSQAI
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

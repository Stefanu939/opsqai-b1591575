import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Brain, BookOpen, FileText, ShieldCheck, Search, Users,
  Building2, Languages, GraduationCap, Lock, Network, CheckCircle2,
  XCircle, Upload, Sparkles, MessageSquare, FileCheck2, Workflow,
  Warehouse, Truck, Factory, PackageSearch, ShoppingCart, ClipboardCheck,
  Boxes, Layers, BarChart3, Zap, Clock, TrendingUp, Send, Paperclip,
  LayoutDashboard, Database, Activity,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

import { pageHead, softwareApplicationLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "OPSQAI — Enterprise AI Knowledge & Operations Platform for Logistics",
      description:
        "OPSQAI is an Enterprise AI Knowledge Platform for logistics and warehouse teams. Centralize SOPs, manuals and FAQs; deliver source-backed answers, faster onboarding and standardized operations.",
      path: "/",
      keywords: "enterprise AI, knowledge management, warehouse AI, logistics AI, SOP software, operational knowledge platform",
      jsonLd: [
        softwareApplicationLd({
          description:
            "Enterprise AI knowledge platform for logistics and warehouse operations. Ingests SOPs, manuals and FAQs; delivers source-cited answers with multi-tenant isolation and audit logs.",
        }),
      ],
    }),
  component: Home,
});

function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <ProductShowcase />
      <TrustBar />
      <WhatIsOpsqai />
      <PlatformOverview />
      <WorkflowSection />
      <MetricsBand />
      <Benefits />
      <Industries />
      <Enterprise />
      <Screenshots />
      <Comparison />
      <WhyChoose />
      <FoundingCustomers />
      <FAQSection />
      <FinalCTA />
    </MarketingLayout>
  );
}

/* ---------------- Shared ---------------- */

function SectionHead({ eyebrow, title, intro, center = false }: { eyebrow: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={center ? "max-w-3xl mx-auto text-center" : "max-w-3xl"}>
      <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">{intro}</p>}
    </div>
  );
}

/* ---------------- Hero ---------------- */

const TRUST_BADGES = [
  { icon: Lock, label: "Secure" },
  { icon: Building2, label: "Enterprise Ready" },
  { icon: FileCheck2, label: "Source-backed AI" },
  { icon: Languages, label: "Multi-language" },
  { icon: ShieldCheck, label: "GDPR Ready" },
];

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 -z-10 bg-grid-faint opacity-40" />
      <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[120px] -z-10" />
      <div className="absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px] -z-10" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-medium uppercase tracking-wider text-[10px]">Enterprise AI Knowledge &amp; Operations Platform</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.75rem] font-semibold tracking-tight leading-[1.05]">
              Enterprise AI Platform for{" "}
              <span className="text-gradient-primary">Logistics &amp; Warehouse Operations</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              OPSQAI turns your SOPs, manuals and FAQs into an intelligent operational assistant.
              One governed platform for knowledge, people and AI — with source-backed answers your
              teams and auditors can trust.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
                <Link to="/demo">Launch Interactive Demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
                <Link to="/contact">Talk to Sales</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {TRUST_BADGES.map((b) => (
                <div key={b.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 backdrop-blur px-3.5 py-1.5 text-xs">
                  <b.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroProductMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroProductMock() {
  return (
    <div className="relative">
      {/* Glow behind the card */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl -z-10" />
      {/* Chat window */}
      <div className="relative rounded-2xl border border-border/70 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center gap-2 px-4 h-9 border-b border-border/60 bg-muted/40">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 text-[11px] text-muted-foreground font-mono">app.opsqai.de / assistant</div>
        </div>
        <div className="p-5 space-y-4">
          {/* User bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 border border-primary/25 px-4 py-2.5 text-sm text-foreground">
              What is the procedure for damaged pallets on inbound?
            </div>
          </div>
          {/* AI bubble */}
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-muted/60 border border-border/70 px-4 py-3 text-sm leading-relaxed">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">
                <Brain className="h-3 w-3" /> OPSQAI Assistant
              </div>
              Isolate the pallet in the <span className="text-primary font-medium">Quarantine zone Q-2</span>,
              photograph the damage and create a non-conformity ticket within 30&nbsp;min.
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                  <FileCheck2 className="h-2.5 w-2.5" /> SOP-INB-014 · §4.2
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                  <FileCheck2 className="h-2.5 w-2.5" /> QA-Manual · p. 27
                </span>
              </div>
            </div>
          </div>
          {/* Input */}
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-xs text-muted-foreground">Ask about a procedure, policy or manual…</div>
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Send className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-primary" /> Confidence 96%</div>
          <div className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Workspace-isolated</div>
        </div>
      </div>

      {/* Floating stat card */}
      <div className="hidden md:flex absolute -left-8 -bottom-8 items-center gap-3 rounded-xl border border-border/70 bg-background/90 backdrop-blur-xl shadow-xl px-4 py-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 grid place-items-center text-primary">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Answer time</div>
          <div className="text-sm font-semibold">under 2 seconds</div>
        </div>
      </div>
      <div className="hidden md:flex absolute -right-6 -top-6 items-center gap-3 rounded-xl border border-border/70 bg-background/90 backdrop-blur-xl shadow-xl px-4 py-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 grid place-items-center text-primary">
          <FileCheck2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</div>
          <div className="text-sm font-semibold">Always cited</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Trust bar ---------------- */

function TrustBar() {
  const items = ["Logistics", "Warehousing", "3PL", "Distribution", "Manufacturing", "Supply Chain"];
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Built for</span>
        {items.map((i) => (
          <span key={i} className="text-sm text-foreground/70 font-medium tracking-tight">{i}</span>
        ))}
      </div>
    </section>
  );
}


/* ---------------- What is OPSQAI ---------------- */

const CAPABILITIES = [
  "AI Knowledge Base", "AI Assistant", "Document Intelligence", "FAQ Management",
  "SOP Management", "Enterprise Search", "User Management", "Workspace Management",
  "AI-powered Onboarding", "Role-based Access", "Multi-company SaaS", "Audit & Compliance",
];

function WhatIsOpsqai() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5">
          <SectionHead
            eyebrow="What is OPSQAI?"
            title="Not a chatbot. A complete AI knowledge platform."
            intro="OPSQAI is an Enterprise AI Platform that turns your company documentation into an intelligent operational assistant. The chat is only one interface — behind it sits a full knowledge, governance and analytics stack."
          />
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            Built for logistics, warehousing and operations teams that need reliable,
            source-backed answers — not generic AI guesses.
          </p>
        </div>
        <div className="lg:col-span-7">
          <div className="card-enterprise p-6 sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OPSQAI combines</div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CAPABILITIES.map((c) => (
                <div key={c} className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-[13px] flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Platform Overview ---------------- */

const FEATURES = [
  { icon: Brain, title: "AI Assistant", body: "Employees receive instant answers based only on approved company knowledge." },
  { icon: BookOpen, title: "Knowledge Base", body: "Upload PDFs, Word files, manuals, procedures and internal documentation." },
  { icon: Search, title: "Semantic Search", body: "Find information instantly — without browsing hundreds of pages." },
  { icon: FileCheck2, title: "Source Citations", body: "Every answer links back to the original document and section." },
  { icon: MessageSquare, title: "FAQ Management", body: "Centralize frequently asked questions across teams and sites." },
  { icon: Users, title: "User & Role Management", body: "Control permissions across departments and workspaces." },
  { icon: ShieldCheck, title: "Enterprise Security", body: "Private workspaces and protected company knowledge, isolated per tenant." },
  { icon: Languages, title: "Multi-language AI", body: "Employees ask questions in virtually any language — ideal for international teams." },
  { icon: GraduationCap, title: "Fast Onboarding", body: "Reduce onboarding time by giving new hires instant access to company knowledge." },
];

function PlatformOverview() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Platform Overview"
          title="Every capability operations teams need"
          intro="One governed platform for knowledge, people and AI — not a collection of disconnected tools."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card-enterprise hover-lift p-6 group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Workflow ---------------- */

const FLOW = [
  { icon: Upload, title: "Upload documents", body: "SOPs, manuals, PDFs, DOCX and FAQs." },
  { icon: Sparkles, title: "AI indexes knowledge", body: "Semantic embeddings scoped to your workspace." },
  { icon: MessageSquare, title: "Employees ask questions", body: "In plain language, in any supported language." },
  { icon: Search, title: "OPSQAI searches your knowledge", body: "Hybrid semantic + keyword retrieval." },
  { icon: Brain, title: "Instant verified answer", body: "Grounded in your documents — never invented." },
  { icon: FileCheck2, title: "Source citations included", body: "Document, section and excerpt attached." },
  { icon: Workflow, title: "Higher productivity", body: "Standardized operations, fewer mistakes." },
];

function WorkflowSection() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="How it works"
          title="From documents to verified answers"
          intro="A repeatable workflow that turns unstructured company knowledge into operational intelligence."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          {FLOW.map((s, i) => (
            <div key={s.title} className="card-enterprise p-4 relative">
              <div className="flex items-center gap-2 text-[10px] font-mono text-primary">
                <span>STEP {i + 1}</span>
              </div>
              <div className="mt-2 h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-3 text-sm font-semibold leading-tight">{s.title}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Benefits ---------------- */

const BENEFITS = [
  "Reduce onboarding time",
  "Reduce repetitive questions",
  "Standardize company knowledge",
  "Decrease operational mistakes",
  "Improve employee productivity",
  "Instant access to procedures",
  "No more searching through folders",
  "Knowledge stays inside the company",
  "Works across multiple warehouses",
];

function Benefits() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Business Outcomes"
          title="Real results — not just AI features"
          intro="Operations leaders adopt OPSQAI because it moves the metrics that matter: onboarding speed, error rate and productivity."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b} className="card-enterprise p-5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm font-medium">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Industries ---------------- */

const INDUSTRIES = [
  { icon: Warehouse, label: "Warehousing" },
  { icon: Truck, label: "Logistics" },
  { icon: PackageSearch, label: "Distribution Centers" },
  { icon: ShoppingCart, label: "Retail Logistics" },
  { icon: Factory, label: "Manufacturing" },
  { icon: Boxes, label: "Supply Chain" },
  { icon: Workflow, label: "Operations Teams" },
  { icon: ClipboardCheck, label: "Quality Management" },
];

function Industries() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Industries"
          title="Built for operational, hands-on teams"
          intro="OPSQAI is designed for the industries where procedures, safety and consistency define the day."
        />
        <div className="mt-10 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRIES.map((i) => (
            <div key={i.label} className="card-enterprise hover-lift p-5 flex items-center gap-3">
              <span className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                <i.icon className="h-5 w-5" />
              </span>
              <div className="text-sm font-semibold">{i.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Enterprise ---------------- */

const ENTERPRISE_FEATURES = [
  { icon: Network, title: "Multi-company SaaS", body: "Serve multiple companies from one governed platform." },
  { icon: Building2, title: "Workspace isolation", body: "Each workspace has its own data, users and configuration." },
  { icon: Lock, title: "Role-based permissions", body: "Granular control across departments and functions." },
  { icon: ShieldCheck, title: "Secure authentication", body: "Encrypted sessions, audit logs and access reviews." },
  { icon: Layers, title: "Cloud infrastructure", body: "EU hosting, daily backups, point-in-time recovery." },
  { icon: Sparkles, title: "Modern AI", body: "State-of-the-art models, tuned for grounded answers." },
  { icon: Workflow, title: "Scalable architecture", body: "From a single site to enterprise-wide deployment." },
  { icon: Users, title: "Browser-based", body: "No installation. Works on desktop, tablet and mobile." },
];

function Enterprise() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Enterprise"
          title="Built for enterprise operations from day one"
          intro="Multi-tenant architecture, governance and security engineered for organizations that cannot afford shortcuts. OPSQAI itself is not yet SOC 2 or ISO 27001 certified — see the Trust Center."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ENTERPRISE_FEATURES.map((e) => (
            <article key={e.title} className="card-enterprise p-5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <e.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-3 font-semibold text-sm">{e.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{e.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Screenshots (product surfaces) ---------------- */

function Screenshots() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Inside the Platform"
          title="Much more than a chat window"
          intro="A full operational surface — dashboards, knowledge management, users, analytics — not just a message box."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <MockDashboard />
          <MockKnowledge />
          <MockAnalytics />
        </div>
      </div>
    </section>
  );
}

function MockShell({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="card-enterprise hover-lift overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 h-10">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span>{title}</span>
        </div>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <span className="h-2 w-2 rounded-full bg-green-400/60" />
        </div>
      </div>
      <div className="p-4 min-h-[240px]">{children}</div>
    </div>
  );
}

function MockDashboard() {
  const kpis = [
    { label: "Questions", value: "12,480", trend: "+18%" },
    { label: "Accuracy", value: "96%", trend: "+2.1%" },
    { label: "Sources", value: "3,214", trend: "+124" },
    { label: "Active users", value: "428", trend: "+34" },
  ];
  return (
    <MockShell title="Dashboard" icon={LayoutDashboard}>
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-lg font-semibold">{k.value}</div>
            <div className="text-[10px] text-primary flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />{k.trend}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Weekly activity</div>
        <div className="flex items-end gap-1.5 h-14">
          {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Live operational KPIs and adoption at a glance.</div>
    </MockShell>
  );
}

function MockKnowledge() {
  const docs = [
    { name: "SOP-INB-014 · Inbound Damages", tag: "Published", tint: "text-primary bg-primary/10 border-primary/30" },
    { name: "Safety Manual v3.2", tag: "Indexed", tint: "text-primary bg-primary/10 border-primary/30" },
    { name: "Picking & Packing Guide", tag: "Draft", tint: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
    { name: "Returns Policy 2026", tag: "Published", tint: "text-primary bg-primary/10 border-primary/30" },
    { name: "Forklift Operation Rules", tag: "Indexed", tint: "text-primary bg-primary/10 border-primary/30" },
  ];
  return (
    <MockShell title="Knowledge Base" icon={Database}>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" /> Search SOPs, manuals, policies…
      </div>
      <div className="mt-3 space-y-1.5">
        {docs.map((d) => (
          <div key={d.name} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="text-[12px] truncate flex-1">{d.name}</div>
            <span className={`text-[9px] uppercase tracking-wider rounded border px-1.5 py-0.5 ${d.tint}`}>{d.tag}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Central repository with versioning and status.</div>
    </MockShell>
  );
}

function MockAnalytics() {
  const gaps = [
    { q: "What's the SLA for damaged returns?", count: 42 },
    { q: "Which SOP covers cold-chain breaks?", count: 31 },
    { q: "Who signs off overtime on Sundays?", count: 24 },
  ];
  return (
    <MockShell title="Analytics" icon={BarChart3}>
      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Answer confidence</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="text-2xl font-semibold">96%</div>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-[96%] bg-gradient-to-r from-primary to-primary/60" />
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-primary" /> Top knowledge gaps
        </div>
        <div className="space-y-1.5">
          {gaps.map((g) => (
            <div key={g.q} className="flex items-center justify-between text-[11px]">
              <span className="truncate pr-2">{g.q}</span>
              <span className="text-primary font-mono">{g.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Usage, AI activity and knowledge health.</div>
    </MockShell>
  );
}

/* ---------------- Metrics band ---------------- */

function MetricsBand() {
  const metrics = [
    { k: "< 2s", v: "Answer latency", sub: "Median across pilot workspaces" },
    { k: "96%", v: "Source accuracy", sub: "Answers grounded in citations" },
    { k: "70%", v: "Onboarding time", sub: "Reduction versus manual handover" },
    { k: "3", v: "Languages, day 1", sub: "DE · EN · RO — more on request" },
  ];
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.v}>
              <div className="text-4xl font-semibold tracking-tight text-gradient-primary">{m.k}</div>
              <div className="mt-1 text-sm font-semibold">{m.v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Comparison ---------------- */

const COMPARE = [
  { row: "Knowledge scope", chatbot: "Generic public web", opsqai: "Your company knowledge only" },
  { row: "Answer reliability", chatbot: "Prone to hallucinations", opsqai: "Source-backed, refuses when unknown" },
  { row: "Document management", chatbot: "None", opsqai: "Full knowledge base with versioning" },
  { row: "Permissions", chatbot: "None", opsqai: "Enterprise roles & access control" },
  { row: "Workspace separation", chatbot: "None", opsqai: "Multi-company SaaS with isolation" },
  { row: "Onboarding workflows", chatbot: "None", opsqai: "Structured onboarding & assignments" },
  { row: "Auditability", chatbot: "None", opsqai: "Every question and answer logged" },
  { row: "Data residency", chatbot: "Unknown / shared", opsqai: "EU hosting, GDPR-ready" },
];

function Comparison() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="OPSQAI vs Generic AI"
          title="Why a generic chatbot is not enough"
          intro="ChatGPT-style tools answer from the public web. OPSQAI answers from your governed operational knowledge — with the controls enterprises require."
        />
        <div className="mt-10 card-enterprise overflow-hidden">
          <div className="grid grid-cols-12 border-b border-border/60 bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Capability</div>
            <div className="col-span-4">Generic AI Chatbot</div>
            <div className="col-span-4 text-primary">OPSQAI</div>
          </div>
          {COMPARE.map((c, i) => (
            <div key={c.row} className={`grid grid-cols-12 px-5 py-4 text-sm items-start gap-3 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
              <div className="col-span-4 font-medium">{c.row}</div>
              <div className="col-span-4 text-muted-foreground flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive/70 mt-0.5 shrink-0" />
                <span>{c.chatbot}</span>
              </div>
              <div className="col-span-4 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{c.opsqai}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Why Choose ---------------- */

const WHY = [
  { icon: GraduationCap, title: "Faster onboarding", body: "New hires productive in days, not months." },
  { icon: FileCheck2, title: "Reliable answers", body: "Grounded in approved documentation." },
  { icon: BookOpen, title: "Reduced knowledge loss", body: "Institutional knowledge captured and reused." },
  { icon: ShieldCheck, title: "Improved compliance", body: "Versioned SOPs, audit trails, acknowledgements." },
  { icon: Workflow, title: "Higher operational efficiency", body: "Less searching, more executing." },
  { icon: Lock, title: "Enterprise security", body: "Per-tenant isolation and role-based access." },
  { icon: Warehouse, title: "Designed for operations", body: "Built for warehouses, sites and shift work." },
];

function WhyChoose() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Why OPSQAI"
          title="Chosen by operations leaders who need reliability"
          intro="OPSQAI is engineered for teams that cannot afford wrong answers or slow onboarding."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <article key={w.title} className="card-enterprise hover-lift p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{w.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Founding customers ---------------- */

const PILOT_PILLARS = [
  { icon: Sparkles, title: "Hands-on rollout", body: "We personally shape the workspace, ingest your SOPs and tune the assistant to your operations vocabulary." },
  { icon: ShieldCheck, title: "Enterprise controls from day one", body: "Workspace isolation, roles, audit log and EU hosting — even during pilot." },
  { icon: TrendingUp, title: "Shared success metrics", body: "We define onboarding-time, error-rate and adoption KPIs with you, and review them monthly." },
];

function FoundingCustomers() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Founding Customer Program</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
              Partner with us early — shape the product, own the outcome
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              OPSQAI is currently onboarding a limited set of founding customers across logistics
              and warehousing. You get direct access to the founding team, preferential pricing and
              a roadmap you can influence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/contact">Talk to the team <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-7 grid gap-3">
            {PILOT_PILLARS.map((p) => (
              <div key={p.title} className="card-enterprise p-5 flex items-start gap-4">
                <span className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{p.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


/* ---------------- FAQ ---------------- */

const FAQS = [
  { q: "What makes OPSQAI different from ChatGPT?", a: "OPSQAI answers only from your approved company documentation, with citations to the exact source. It adds knowledge management, user roles, workspace isolation and audit logging — a full enterprise platform, not just a chat window." },
  { q: "Can OPSQAI replace internal documentation?", a: "No — it enhances it. OPSQAI is where your existing SOPs, manuals and FAQs become instantly usable, searchable and enforceable across teams." },
  { q: "Does it support multiple languages?", a: "Yes. Employees can ask in virtually any language supported by modern AI models, making OPSQAI suitable for international operations." },
  { q: "Can multiple companies use the platform?", a: "Yes. OPSQAI is a true multi-company SaaS. Each customer has an isolated workspace with its own data, users and configuration." },
  { q: "Can answers include document sources?", a: "Every AI answer includes the source document, section and excerpt — so your team, auditors and managers can verify the origin." },
  { q: "Is company data private?", a: "Yes. Data is isolated per workspace at the database layer, encrypted in transit and at rest, hosted in the EU and never used to train shared models." },
];

function FAQSection() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="FAQ"
          title="Answers to common questions"
          center
        />
        <div className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 md:py-28 text-center">
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Get Started</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          Turn your documentation into your <span className="text-gradient-primary">operational advantage</span>
        </h2>
        <p className="mt-5 text-[15px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Start with your existing SOPs and see OPSQAI deliver verified, source-backed answers to your teams — in days, not months.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
            <Link to="/demo">Launch Interactive Demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
            <Link to="/contact">Talk to Sales</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

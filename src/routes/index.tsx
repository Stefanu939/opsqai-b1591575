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
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OPSQAI — Enterprise AI Knowledge & Operations Platform for Logistics" },
      { name: "description", content: "OPSQAI is an Enterprise AI Knowledge Platform for logistics and warehouse teams. Centralize SOPs, manuals and FAQs; deliver source-backed answers, faster onboarding and standardized operations." },
      { property: "og:title", content: "OPSQAI — Enterprise AI Knowledge Platform for Operations" },
      { property: "og:description", content: "Turn company documentation into an intelligent operational assistant. Built for logistics, warehousing and supply chain teams." },
      { property: "og:url", content: "https://opsqai.de/" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <WhatIsOpsqai />
      <PlatformOverview />
      <WorkflowSection />
      <Benefits />
      <Industries />
      <Enterprise />
      <Screenshots />
      <Comparison />
      <WhyChoose />
      <Testimonials />
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-24">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Enterprise AI Knowledge & Operations Platform</span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Enterprise AI Platform for{" "}
            <span className="text-gradient-primary">Logistics &amp; Warehouse Operations</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Transform company knowledge into instant answers. OPSQAI centralizes procedures, SOPs,
            manuals, FAQs and operational documentation into one secure AI-powered platform that
            helps employees work faster, reduce mistakes and onboard more efficiently.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
              <Link to="/auth">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
              <Link to="/contact">Book a Demo</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-2.5">
          {TRUST_BADGES.map((b) => (
            <div key={b.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 backdrop-blur px-3.5 py-1.5 text-xs">
              <b.icon className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>
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
          title="Enterprise-grade from day one"
          intro="Multi-tenant architecture, governance and security engineered for organizations that cannot afford shortcuts."
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

/* ---------------- Screenshots ---------------- */

const SCREENS = [
  { title: "Dashboard", body: "Live operational KPIs and adoption at a glance." },
  { title: "Knowledge Base", body: "Central repository for SOPs, manuals and policies." },
  { title: "FAQ", body: "Structured, versioned answers to the questions teams repeat." },
  { title: "Chat", body: "The AI Assistant, grounded in your documents." },
  { title: "Documents", body: "Ingested files with version history and status." },
  { title: "Users", body: "Roles, teams and department assignments." },
  { title: "Settings", body: "Workspace, branding and policy configuration." },
  { title: "Admin", body: "Cross-tenant governance for platform owners." },
  { title: "Analytics", body: "Usage, AI activity and knowledge health." },
];

function Screenshots() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Inside the Platform"
          title="More than a chat window"
          intro="A full operational surface — dashboards, knowledge management, users, analytics — not just a message box."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((s) => (
            <div key={s.title} className="card-enterprise overflow-hidden">
              <div className="aspect-[16/10] bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/60 relative">
                <div className="absolute inset-0 bg-grid-faint opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg border border-primary/30 bg-background/70 backdrop-blur px-3 py-1.5 text-xs text-primary font-medium">
                    {s.title}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.body}</div>
              </div>
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

/* ---------------- Testimonials placeholder ---------------- */

function Testimonials() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Customer Stories"
          title="Trusted by operations teams"
          intro="Case studies and quotes from pilot customers will be published here as they graduate to production."
          center
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-enterprise p-6">
              <Quote className="h-6 w-6 text-primary/60" />
              <div className="mt-4 h-3 w-4/5 rounded bg-muted-foreground/15" />
              <div className="mt-2 h-3 w-3/5 rounded bg-muted-foreground/15" />
              <div className="mt-2 h-3 w-2/3 rounded bg-muted-foreground/15" />
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15" />
                <div>
                  <div className="h-2.5 w-24 rounded bg-muted-foreground/20" />
                  <div className="mt-1.5 h-2 w-16 rounded bg-muted-foreground/15" />
                </div>
              </div>
            </div>
          ))}
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
            <Link to="/auth">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
            <Link to="/contact">Book a Demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

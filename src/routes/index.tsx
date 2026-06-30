import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Brain, BookOpen, GraduationCap, FileText, ShieldCheck,
  Activity, BarChart3, Building2, Sparkles, Palette, LifeBuoy,
  CheckCircle2, Languages, Quote, Layers, Lock, Users, Workflow,
  Search, AlertTriangle, FileCheck2, FileSpreadsheet, ClipboardList,
  Award, TrendingUp, Database, Network,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OPSQAI — Enterprise AI Platform for Operational Knowledge, Training & Compliance" },
      { name: "description", content: "Centralize company knowledge, train employees, generate enterprise documentation, perform AI-powered audits and standardize operational excellence from a single platform." },
      { property: "og:title", content: "OPSQAI — Enterprise AI Operations Platform" },
      { property: "og:description", content: "Knowledge, Academy, AI Audit, Enterprise Documents and Analytics in a single enterprise platform." },
      { property: "og:url", content: "https://opsqai.de/" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/" }],
  }),
  component: Home,
});

/* ---------------- Data ---------------- */

const MODULES = [
  { icon: Brain, title: "AI Assistant", body: "Answers grounded in approved company knowledge, with source references and refusal when nothing is found." },
  { icon: BookOpen, title: "Knowledge Base", body: "Centralize SOPs, manuals, policies and FAQs into one searchable, versioned source of truth." },
  { icon: GraduationCap, title: "Academy & Onboarding", body: "Role-based learning paths, AI-generated courses, quizzes and certificates for every team." },
  { icon: FileText, title: "AI SOP Generator", body: "Draft structured SOPs from prompts or existing material — reviewed, versioned and ready to publish." },
  { icon: ShieldCheck, title: "AI Audit", body: "Detect knowledge gaps, missing SOPs and duplicates. Continuous recommendations to harden operations." },
  { icon: Activity, title: "Knowledge Health", body: "A live score for the quality, freshness and coverage of your operational knowledge." },
  { icon: BarChart3, title: "Analytics", body: "Usage, adoption, AI activity and learning progress across people, teams and workspaces." },
  { icon: Building2, title: "Customer Workspaces", body: "Multi-tenant isolation with per-workspace data, roles and configuration." },
  { icon: Sparkles, title: "Enterprise AI Documents", body: "Generate executive summaries, proposals, implementation and training plans on demand." },
  { icon: Palette, title: "Brand Center", body: "Centralized branding, tone of voice and templates so every output stays on-brand." },
  { icon: LifeBuoy, title: "Support Center", body: "Built-in support inbox with attachments — your teams reach the right people, faster." },
];

const ACADEMY = [
  "Learning Paths", "Courses", "Lessons", "AI Course Generation",
  "Role-based Assignments", "Team Assignments", "Progress Tracking",
  "Certificates", "Continuous Learning",
];

const ASSISTANT = [
  { icon: BookOpen, label: "SOPs" },
  { icon: ClipboardList, label: "FAQs" },
  { icon: Database, label: "Knowledge Base" },
  { icon: FileCheck2, label: "Source References" },
  { icon: Languages, label: "Multilingual Support" },
];

const AUDIT = [
  { icon: AlertTriangle, title: "Knowledge Gaps", body: "Surface questions employees ask that the knowledge base cannot answer." },
  { icon: Search, title: "Missing SOP Detection", body: "Identify operational areas without documented procedures." },
  { icon: Layers, title: "Duplicate Content", body: "Detect overlapping or conflicting documents before they confuse teams." },
  { icon: Sparkles, title: "Improvement Recommendations", body: "Actionable suggestions to strengthen coverage and clarity." },
  { icon: Activity, title: "Knowledge Health Score", body: "A single number that tells leadership how trustworthy operational knowledge is." },
];

const DOCS = [
  "Executive Summary", "Commercial Proposal", "Implementation Plan",
  "Training Plan", "Customer Documentation",
];

const ANALYTICS = [
  { icon: BookOpen, label: "Knowledge Usage" },
  { icon: GraduationCap, label: "Academy Progress" },
  { icon: Brain, label: "AI Activity" },
  { icon: Users, label: "User Adoption" },
  { icon: TrendingUp, label: "Operational Insights" },
];

const OUTCOMES = [
  { icon: GraduationCap, title: "Reduce onboarding time", body: "New hires reach productivity faster with guided learning paths and instant answers." },
  { icon: Workflow, title: "Standardize operational knowledge", body: "One approved source of truth across sites, shifts and languages." },
  { icon: TrendingUp, title: "Increase employee productivity", body: "Less time searching, more time executing — with AI grounded in your procedures." },
  { icon: ShieldCheck, title: "Improve compliance", body: "Versioned SOPs, acknowledgements and audit trails ready for review." },
  { icon: FileSpreadsheet, title: "Centralize documentation", body: "From SOPs to commercial documents — generated, stored and governed in one place." },
  { icon: Award, title: "Accelerate training", body: "AI-generated courses, role-based assignments and certificates at scale." },
];

const TRUST = [
  { icon: Network, title: "Multi-Tenant Architecture", body: "Per-workspace data isolation enforced at the database layer with row-level security." },
  { icon: Lock, title: "Role-Based Access Control", body: "Seven enterprise roles with granular permissions and full audit logging." },
  { icon: ShieldCheck, title: "Secure Knowledge Management", body: "Encryption in transit and at rest. EU hosting, GDPR-ready, ISO 27001 roadmap." },
  { icon: Building2, title: "Enterprise Ready", body: "SSO-friendly, multilingual, with the governance enterprises require." },
];

/* ---------------- Page ---------------- */

function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <PlatformOverview />
      <Academy />
      <Assistant />
      <Audit />
      <EnterpriseDocs />
      <Analytics />
      <WhyOpsqai />
      <Trust />
      <FinalCTA />
    </MarketingLayout>
  );
}

/* ---------------- Sections ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 -z-10 bg-grid-faint opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Enterprise AI Operations Platform</span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Enterprise AI Platform for{" "}
            <span className="text-gradient-primary">Operational Knowledge, Training &amp; Compliance</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Centralize company knowledge, train employees, generate enterprise documentation,
            perform AI-powered audits and standardize operational excellence from a single platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
              <Link to="/contact">Request demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
              <Link to="/features">Explore features</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Unified", v: "Knowledge, Academy & Audit in one platform" },
            { k: "Grounded", v: "AI answers only from approved sources" },
            { k: "Multi-tenant", v: "Workspace isolation, RBAC, audit log" },
            { k: "EU", v: "GDPR-ready, ISO 27001 roadmap" },
          ].map((i) => (
            <div key={i.k} className="card-enterprise p-4 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{i.k}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{i.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">{intro}</p>}
    </div>
  );
}

function PlatformOverview() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="The Platform"
          title="One enterprise platform. Every operational capability."
          intro="OPSQAI brings knowledge, learning, AI assistance, audit and analytics into a single governed environment — built for multi-site, multi-team enterprises."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <article key={m.title} className="card-enterprise hover-lift p-6 group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Academy() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5">
          <SectionHead
            eyebrow="Academy"
            title="Train every employee with AI-powered learning"
            intro="Academy turns your knowledge base into structured learning paths, courses and lessons — assigned by role, tracked by progress and rewarded with certificates."
          />
          <Button asChild variant="outline" className="mt-8 border-border bg-background/40">
            <Link to="/features">See Academy features <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="lg:col-span-7 space-y-4">
          <div className="card-enterprise p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">OPSQAI Academy</div>
                <div className="text-xs text-muted-foreground">Department → Path → Chapter → Lesson → Quiz</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ACADEMY.map((a) => (
                <div key={a} className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-[13px] flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Assistant() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 order-2 lg:order-1 space-y-4">
          <div className="card-enterprise p-6 sm:p-8">
            <div className="rounded-lg border border-border bg-background/40 p-4">
              <div className="text-xs text-muted-foreground">You</div>
              <div className="mt-1 text-sm">What is the procedure for damaged goods on receipt?</div>
            </div>
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Brain className="h-3.5 w-3.5" /> OPSQAI · grounded answer
              </div>
              <div className="mt-2 text-sm leading-relaxed">
                Follow the Damaged Goods SOP: isolate the pallet, photograph the damage, register the incident
                in the WMS and notify the shift lead within 15 minutes.
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="chip">SOP · Goods Receipt v3.2</span>
                <span className="chip">FAQ · Damaged Pallets</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 order-1 lg:order-2">
          <SectionHead
            eyebrow="AI Assistant"
            title="Answers from your approved knowledge — never invented"
            intro="Employees ask in plain language. OPSQAI answers using your SOPs, FAQs and policies, with source references attached to every response."
          />
          <ul className="mt-6 space-y-2.5">
            {ASSISTANT.map((a) => (
              <li key={a.label} className="flex items-center gap-3 text-sm">
                <span className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                  <a.icon className="h-4 w-4" />
                </span>
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Audit() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="AI Audit"
          title="A continuous AI auditor for your operational knowledge"
          intro="OPSQAI continuously analyses your knowledge base to expose gaps, conflicts and weaknesses — and recommends what to improve next."
        />
        
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIT.map((a) => (
            <article key={a.title} className="card-enterprise hover-lift p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EnterpriseDocs() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-6">
          <SectionHead
            eyebrow="Enterprise Documents"
            title="Generate consulting-grade documentation in minutes"
            intro="OPSQAI produces enterprise-ready documents grounded in your customer profile, subscription and approved facts — consistent, on-brand and ready for review."
          />
        </div>
        <div className="lg:col-span-7">
          <div className="card-enterprise p-6 sm:p-8 grid sm:grid-cols-2 gap-3">
            {DOCS.map((d) => (
              <div key={d} className="rounded-lg border border-border bg-background/40 p-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold">{d}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground leading-snug">
                  Personalized, internally consistent and suitable for immediate enterprise review.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Analytics() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Analytics"
          title="Operational insight across every workspace"
          intro="Track how knowledge is used, how teams learn and where AI is creating measurable impact."
        />
        <AnalyticsCharts />
        <div className="mt-8 card-enterprise p-2 overflow-hidden">
          <img src={demoAnalytics} alt="OPSQAI Analytics dashboard preview" loading="lazy" width={1280} height={800}
               className="w-full rounded-md border border-border/60" />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ANALYTICS.map((a) => (
            <div key={a.label} className="card-enterprise hover-lift p-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[14px] font-semibold">{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalyticsCharts() {
  const adoption = [
    { m: "Jan", v: 28 }, { m: "Feb", v: 41 }, { m: "Mar", v: 53 },
    { m: "Apr", v: 62 }, { m: "May", v: 71 }, { m: "Jun", v: 84 },
  ];
  const usage = [
    { d: "Mon", q: 320 }, { d: "Tue", q: 410 }, { d: "Wed", q: 478 },
    { d: "Thu", q: 442 }, { d: "Fri", q: 510 }, { d: "Sat", q: 198 }, { d: "Sun", q: 156 },
  ];
  const teams = [
    { t: "Warehouse", v: 78 }, { t: "Operations", v: 64 },
    { t: "Quality", v: 52 }, { t: "Training", v: 47 }, { t: "Support", v: 39 },
  ];
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-3">
      <div className="card-enterprise p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">Adoption</div>
          <div className="text-xs text-primary font-semibold">+56% H1</div>
        </div>
        <div className="mt-1 text-2xl font-display font-semibold tracking-tight">84%</div>
        <div className="h-32 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={adoption} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="gAdop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area dataKey="v" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#gAdop)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card-enterprise p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">Weekly questions</div>
          <div className="text-xs text-[var(--color-chart-2)] font-semibold">2.5k</div>
        </div>
        <div className="mt-1 text-2xl font-display font-semibold tracking-tight">+22%</div>
        <div className="h-32 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usage} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Line dataKey="q" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card-enterprise p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">Active by team</div>
          <div className="text-xs text-muted-foreground">last 30 days</div>
        </div>
        <div className="mt-1 text-2xl font-display font-semibold tracking-tight">5 teams</div>
        <div className="h-32 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teams} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="v" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function WhyOpsqai() {
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Why OPSQAI"
          title="Business outcomes, not features in isolation"
          intro="OPSQAI is designed to deliver measurable operational impact — faster onboarding, higher productivity and stronger compliance."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OUTCOMES.map((o) => (
            <article key={o.title} className="card-enterprise hover-lift p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <o.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{o.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{o.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <SectionHead
          eyebrow="Built for Enterprise"
          title="Architecture and governance the enterprise expects"
          intro="OPSQAI is engineered for multi-tenant deployments where data isolation, access control and auditability are non-negotiable."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <article key={t.title} className="card-enterprise hover-lift p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{t.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2 text-xs">
          <Link to="/trust" className="chip border-primary/30 !bg-primary/5 !text-primary hover:!bg-primary/10">Visit the Trust Center →</Link>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-border/50 bg-hero">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-24 md:py-32 text-center">
        <Quote className="h-7 w-7 mx-auto text-primary/60" />
        <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
          Transform Operational Knowledge into{" "}
          <span className="text-gradient-primary">Competitive Advantage</span>
        </h2>
        <p className="mt-5 max-w-2xl mx-auto text-[15px] md:text-base text-muted-foreground leading-relaxed">
          Everything your organization needs to centralize knowledge, onboard employees,
          improve compliance and empower teams with AI.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
            <Link to="/contact">Request a demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
            <Link to="/features">Explore features</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

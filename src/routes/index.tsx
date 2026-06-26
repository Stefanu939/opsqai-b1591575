import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ShieldCheck, Brain, Languages, FileSearch, GitBranch, Users,
  BarChart3, AlertTriangle, Search, Bell, Sparkles, MessageSquare, BookOpen,
  CheckCircle2, TrendingUp, Lock, Globe, ArrowUpRight, Quote,
  Warehouse, Truck, PackageCheck, Store, Factory, ShoppingCart,
  Snowflake, ArrowLeftRight, Ship, Network, ScrollText, KeyRound,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Button } from "@/components/ui/button";
import logo from "@/assets/opsqai-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OPSQAI — The AI Operating System for Logistics Operations" },
      { name: "description", content: "Enterprise AI Knowledge Management, Operational Intelligence & Compliance for Logistics and Supply Chain. Source-grounded answers, multilingual, GDPR-ready." },
      { property: "og:title", content: "OPSQAI — Enterprise AI for Logistics" },
      { property: "og:description", content: "Instant access to company knowledge across every warehouse, shift and language." },
      { property: "og:url", content: "https://opsqai.de/" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/" }],
  }),
  component: Home,
});

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const HERO_KPIS = [
  { label: "Source-grounded", value: "100%", sub: "reliable answers" },
  { label: "Onboarding", value: "−60%", sub: "time to productivity" },
  { label: "Errors", value: "−35%", sub: "operational mistakes" },
  { label: "Security", value: "EU", sub: "ISO 27001 roadmap" },
];

const INDUSTRIES: Array<{ icon: typeof Warehouse; title: string; body: string }> = [
  { icon: Warehouse, title: "Warehousing", body: "Standardised receiving, putaway, picking and cycle-count procedures across every site." },
  { icon: PackageCheck, title: "Distribution Centers", body: "Shift-ready SOPs, safety rules and KPIs for high-throughput DC operations." },
  { icon: Network, title: "3PL Logistics", body: "Per-client procedures, SLAs and quality controls — isolated and auditable." },
  { icon: Truck, title: "Transport & Fleet", body: "Driver workflows, CMR handling, vehicle checks and incident reporting." },
  { icon: Store, title: "Retail Logistics", body: "Store replenishment, returns and inter-branch transfer playbooks." },
  { icon: Factory, title: "Manufacturing Logistics", body: "Line-feed, work-in-progress and finished-goods movement standards." },
  { icon: ShoppingCart, title: "E-Commerce Fulfillment", body: "Pick-pack-ship SOPs, packaging standards and returns processing." },
  { icon: Snowflake, title: "Cold Chain Logistics", body: "Temperature compliance, traceability and HACCP-aligned procedures." },
  { icon: ArrowLeftRight, title: "Cross Dock Operations", body: "Inbound-to-outbound coordination, staging discipline and dock scheduling." },
  { icon: Ship, title: "Freight Forwarding", body: "Customs, documentation and multimodal coordination knowledge in one place." },
  { icon: GitBranch, title: "Supply Chain Operations", body: "End-to-end procedures spanning planning, sourcing and distribution." },
];

const FEATURES = [
  { icon: Brain, title: "Knowledge Management", body: "Centralize SOPs, manuals and FAQs. One source of truth, instantly searchable." },
  { icon: BarChart3, title: "Operational Intelligence", body: "Analytics and insights that help you measure performance and reduce risk." },
  { icon: ShieldCheck, title: "Compliance & Safety", body: "Keep safety rules and certifications consistent across every shift and site." },
  { icon: TrendingUp, title: "Analytics", body: "Trend dashboards, heatmaps and audit-grade exports for managers." },
  { icon: Sparkles, title: "AI Workspace", body: "Analyse, compare and generate documents from temporary, session-scoped files." },
  { icon: AlertTriangle, title: "Knowledge Gaps", body: "Detect unanswerable questions and turn them into new SOPs or FAQs." },
  { icon: Search, title: "Enterprise Search", body: "Hybrid semantic + keyword retrieval over every document, with citations." },
  { icon: Bell, title: "Notifications", body: "Critical SOPs surface to the right people. Acknowledgement tracked." },
  { icon: GitBranch, title: "Version Control", body: "Replace an SOP in one click. Old versions stay in the audit trail." },
];

const PLATFORM_TABS: Array<{ id: string; label: string; render: () => React.ReactElement }> = [
  { id: "dashboard", label: "Dashboard", render: () => <MockDashboard /> },
  { id: "chat", label: "AI Chat", render: () => <MockChat /> },
  { id: "knowledge", label: "Knowledge Base", render: () => <MockKnowledge /> },
  { id: "analytics", label: "Analytics", render: () => <MockAnalytics /> },
  { id: "workspace", label: "AI Workspace", render: () => <MockWorkspace /> },
];

const STATS = [
  { value: "95%", label: "faster knowledge retrieval" },
  { value: "70%", label: "reduced onboarding time" },
  { value: "24/7", label: "multilingual AI assistance" },
  { value: "EU", label: "enterprise-ready architecture" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <TrustBar />
      <FeaturesGrid />
      <PlatformShowcase />
      <CapabilitiesSection />
      <GovernanceSection />
      <RoadmapSection />
      <WhyImprovingSection />
      <PlatformStatusSection />
      <StatsStrip />
      <Testimonial />
      <FinalCTA />
    </MarketingLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 -z-10 bg-grid-faint opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-medium uppercase tracking-wider text-[10px]">New</span>
              <span className="text-foreground/80 text-[12px]">AI Workspace — analyse, compare &amp; generate documents</span>
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              The AI Operating System
              <br />
              for <span className="text-gradient-primary">Logistics Operations</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              OPSQAI unifies your SOPs, knowledge and operations in one platform. Get instant
              answers, ensure compliance and empower every team across your warehouses, transport
              and supply chain.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_12px_32px_-8px_oklch(0.82_0.14_200/0.55)]">
                <Link to="/contact">Book a demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
                <Link to="/product">Explore the platform</Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {HERO_KPIS.map((k) => (
                <div key={k.label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{k.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{k.value} · {k.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: mock dashboard */}
          <div className="lg:col-span-6">
            <HeroMockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockDashboard() {
  return (
    <div className="relative">
      {/* Glow halo */}
      <div className="absolute -inset-6 -z-10 bg-[radial-gradient(50%_60%_at_50%_50%,oklch(0.82_0.14_200/0.20),transparent_70%)] animate-pulse-glow" />
      <div className="card-enterprise glow-ring p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-semibold">Good morning, Stefan!</span>
              <span aria-hidden>👋</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Here's what's happening today.</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="chip">This week</span>
            <div className="relative h-8 w-8 rounded-md border border-border grid place-items-center text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">3</span>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <MockKpi label="Questions answered" value="184" delta="+12%" tone="up" />
          <MockKpi label="AI Confidence" value="97%" delta="+5%" tone="up" />
          <MockKpi label="Knowledge gaps" value="3" delta="−25%" tone="up" />
          <MockKpi label="Critical SOPs" value="2" delta="View all" tone="neutral" />
        </div>

        {/* Two columns: recent / top SOPs */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold">Recent questions</div>
              <Link to="/app" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
            <ul className="space-y-1.5">
              {[
                ["What are the steps for goods receipt?", "10:23"],
                ["How do I create a CMR document?", "09:15"],
                ["What safety rules apply in the warehouse?", "08:43"],
                ["Procedure for damaged goods?", "Yesterday"],
              ].map(([q, t]) => (
                <li key={q} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="truncate flex items-center gap-1.5 text-foreground/90">
                    <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                    {q}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold">Top SOPs</div>
              <Link to="/app" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
            <ul className="space-y-1.5">
              {[
                ["Goods Receipt Procedure", 23],
                ["Forklift Safety Checklist", 18],
                ["Outbound Process", 17],
                ["Incident Reporting", 14],
              ].map(([t, n]) => (
                <li key={t as string} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="truncate flex items-center gap-1.5 text-foreground/90">
                    <BookOpen className="h-3 w-3 text-primary shrink-0" />
                    {t}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Activity + donut */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div className="sm:col-span-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="text-xs font-semibold mb-1.5">Activity overview</div>
            <Sparkline />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-border bg-background/40 p-3">
            <div className="text-xs font-semibold mb-1.5">Knowledge status</div>
            <DonutMock />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockKpi({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: "up" | "down" | "neutral" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-primary";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="text-xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className={`text-[10.5px] font-medium ${color}`}>{delta}</div>
      </div>
    </div>
  );
}

function Sparkline() {
  // points roughly mimic the reference's hero chart
  const points = [40, 45, 60, 55, 80, 90, 110];
  const max = Math.max(...points);
  const w = 280, h = 70, pad = 6;
  const dx = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [pad + i * dx, h - pad - (p / max) * (h - pad * 2)] as const);
  const path = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.14 200)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="oklch(0.82 0.14 200)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} stroke="oklch(0.82 0.14 200)" strokeWidth="1.5" fill="none" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 3 : 1.5} fill="oklch(0.82 0.14 200)" />
      ))}
    </svg>
  );
}

function DonutMock() {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={R} stroke="oklch(0.30 0.04 230)" strokeWidth="8" fill="none" />
        <circle cx="40" cy="40" r={R} stroke="oklch(0.82 0.14 200)" strokeWidth="8" fill="none"
          strokeDasharray={`${C * 0.82} ${C}`} strokeLinecap="round" />
        <text x="40" y="42" textAnchor="middle" className="fill-foreground text-[11px] font-semibold" transform="rotate(90 40 40)">82%</text>
      </svg>
      <ul className="text-[11px] space-y-1">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> Complete</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[oklch(0.55_0.12_250)]" /> In progress</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Missing</li>
      </ul>
    </div>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-border/50 bg-[oklch(0.15_0.03_240)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Industries we serve</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Built for modern logistics operations
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            OPSQAI is designed for organizations that rely on standardized procedures,
            operational excellence, compliance, and AI-powered knowledge management.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INDUSTRIES.map((it) => (
            <div key={it.title} className="card-enterprise hover-lift p-5 group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[14.5px]">{it.title}</h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Built for Logistics. Designed for People.</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            One platform. Every team. Every operation.
          </h2>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-enterprise hover-lift p-6 group">
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{f.title}</h3>
              <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- Platform showcase -------------------- */

function PlatformShowcase() {
  return (
    <section className="border-y border-border/50 bg-[oklch(0.15_0.03_240)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">All your operations. One platform.</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
              Everything you need,<br />where you need it.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-foreground/90">
              {[
                "Chat with your operational knowledge",
                "Upload and manage SOPs & documents",
                "Identify gaps and improve continuously",
                "Generate reports, presentations and more",
                "Work securely, with full data isolation",
              ].map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/features">Explore all features <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <PlatformTabs />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformTabs() {
  // Use a stateless tabbed look via details/summary fallback isn't needed — use buttons + simple state.
  return (
    <div className="card-enterprise p-3 sm:p-4 overflow-hidden">
      <div className="flex items-center justify-between px-2 pb-3 border-b border-border">
        <div className="flex gap-1.5 flex-wrap">
          {PLATFORM_TABS.map((t, i) => (
            <span key={t.id} className={`px-2.5 py-1 rounded-md text-xs ${i === 0 ? "bg-primary/15 text-primary border border-primary/25" : "text-muted-foreground border border-transparent"}`}>
              {t.label}
            </span>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
      </div>
      <div className="pt-3">
        {/* Stack mocks vertically so the user sees each surface */}
        <div className="grid gap-3">
          <MockWorkspace />
        </div>
      </div>
    </div>
  );
}

function MockDashboard() {
  return <HeroMockDashboard />;
}

function MockChat() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-xs font-semibold mb-2">AI Chat · grounded answer</div>
      <div className="space-y-2">
        <div className="rounded-md bg-primary/10 border border-primary/20 text-primary px-3 py-2 text-[12px] max-w-[80%] ml-auto">What are the goods-receipt steps?</div>
        <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-[12px]">
          1. Verify CMR · 2. Visual inspection · 3. Quantity check · 4. Sign and stamp.
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip !py-0.5 text-[10px]">Goods Receipt v3</span>
            <span className="chip !py-0.5 text-[10px]">Confidence 97%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockKnowledge() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-xs font-semibold mb-2">Knowledge Base · 7 active SOPs</div>
      <ul className="text-[12px] divide-y divide-border">
        {["Goods Receipt Procedure", "Outbound Process", "Forklift Safety"].map((t, i) => (
          <li key={t} className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2 text-foreground/90"><BookOpen className="h-3.5 w-3.5 text-primary" />{t}</span>
            <span className="chip !py-0 text-[10px]">v{i + 2}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MockAnalytics() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-xs font-semibold mb-2">Analytics</div>
      <Sparkline />
    </div>
  );
}

function MockWorkspace() {
  return (
    <div className="rounded-lg border border-border bg-background/40">
      <div className="grid grid-cols-12 gap-0 min-h-[260px]">
        {/* Sidebar */}
        <div className="col-span-3 border-r border-border p-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-foreground/90 px-2 py-1.5"><Sparkles className="h-3 w-3 text-primary" /> AI Workspace</div>
          {[
            ["Dashboard", false], ["Chat", false], ["Knowledge Base", false],
            ["AI Workspace", true], ["Analytics", false], ["Knowledge Gaps", false],
            ["Internal Requests", false], ["Users", false], ["Settings", false],
          ].map(([l, active]) => (
            <div key={l as string} className={`px-2 py-1.5 rounded ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>{l as string}</div>
          ))}
        </div>
        {/* Center */}
        <div className="col-span-6 p-3 border-r border-border">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <div className="font-semibold">Session: Q2 Management Report</div>
            <span className="chip !py-0 text-[10px]">Retention 24h</span>
          </div>
          <div className="rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground mb-2">
            Drag and drop files here, or click to browse
          </div>
          <ul className="space-y-1 text-[11px]">
            {[
              ["Warehouse_Report_Q2.xlsx", "2.2 MB"],
              ["Safety_Inspection_May.pdf", "1.7 MB"],
              ["Transport_Kpis.xlsx", "2.1 MB"],
            ].map(([n, s]) => (
              <li key={n} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-2 py-1.5">
                <span className="flex items-center gap-1.5 text-foreground/90"><FileSearch className="h-3 w-3 text-primary" />{n}</span>
                <span className="text-muted-foreground tabular-nums">{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            Ask AI to analyze your documents…
          </div>
        </div>
        {/* Right artifacts */}
        <div className="col-span-3 p-3 text-[11px] space-y-2">
          <div className="rounded-md border border-border bg-background/50 p-2">
            <div className="font-semibold text-foreground/90 mb-1">Q2 Management Presentation</div>
            <div className="h-16 rounded bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20" />
            <div className="mt-1 text-muted-foreground">12 slides · PPTX</div>
          </div>
          <div className="rounded-md border border-border bg-background/50 p-2">
            <div className="font-semibold text-foreground/90 mb-1">KPI Summary</div>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between"><span>On-time Delivery</span><span className="text-emerald-400">96.2%</span></div>
              <div className="flex justify-between"><span>Dock to Stock</span><span className="text-emerald-400">1.4 h</span></div>
              <div className="flex justify-between"><span>Damage Rate</span><span className="text-emerald-400">0.32%</span></div>
            </div>
            <div className="mt-1 text-muted-foreground">Excel report · XLSX</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsStrip() {
  return (
    <section className="border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-gradient-primary">{s.value}</div>
            <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="card-enterprise p-8 md:p-10 relative overflow-hidden">
          <Quote className="absolute -top-2 -left-2 h-20 w-20 text-primary/10" />
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <p className="text-lg md:text-xl leading-relaxed text-foreground/95">
              "OPSQAI has become our daily tool. Answers are fast, reliable and always based on
              our own procedures. Onboarding new warehouse staff is finally consistent."
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 grid place-items-center text-primary font-semibold">MP</div>
              <div>
                <div className="font-semibold text-sm">M. Popescu</div>
                <div className="text-xs text-muted-foreground">Operations Manager · Logistics Operator</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div
          className="relative overflow-hidden rounded-2xl border border-primary/25 p-8 md:p-12"
          style={{ background: "var(--gradient-cta)" }}
        >
          {/* Animated lines */}
          <div aria-hidden className="absolute inset-0 -z-0 opacity-40">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-[oklch(0.55_0.12_250)]/20 blur-3xl" />
          </div>
          <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Bring your operational knowledge to life.
              </h3>
              <p className="mt-3 text-muted-foreground max-w-xl text-sm md:text-base">
                See how OPSQAI can simplify operations and empower your teams. A 30-minute walkthrough
                with our team is all it takes.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Setup in days, not months</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Secure &amp; GDPR-compliant</span>
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> EU-hosted</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                <Link to="/contact">Book a demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/product">Explore the platform <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          {/* Floating logo watermark */}
          <img src={logo} alt="" width={120} height={120} className="hidden md:block absolute right-6 bottom-6 opacity-10" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* New informational sections (platform status, capabilities, roadmap) */
/* ------------------------------------------------------------------ */

type Stage = "available" | "in_development" | "coming_soon";

const STAGE_META: Record<Stage, { label: string; emoji: string; cls: string }> = {
  available:      { label: "Available",      emoji: "✓",  cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  in_development: { label: "In Development", emoji: "🚧", cls: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
  coming_soon:    { label: "Coming Soon",    emoji: "🔜", cls: "text-sky-400 bg-sky-400/10 border-sky-400/25" },
};

function StageChip({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${m.cls}`}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
}

function CapabilityCard({ title, stage }: { title: string; stage: Stage }) {
  return (
    <div className="card-enterprise hover-lift p-4 flex items-center justify-between gap-3 group">
      <span className="text-[13.5px] font-medium text-foreground/95 truncate">{title}</span>
      <StageChip stage={stage} />
    </div>
  );
}

const CAPABILITIES_AVAILABLE: string[] = [
  "AI Assistant (Grounded RAG)", "Knowledge Base", "FAQ Management", "SOP Templates",
  "Multi Workspace", "Multi Company", "Audit Log", "Knowledge Gaps",
  "Executive Dashboard", "Analytics", "Enterprise RBAC", "Platform Owner",
  "Platform Administration", "AI SOP Generator", "Dark / Light Mode", "Mobile Responsive",
  "Source Citations", "Conversation Audit", "Workspace Isolation", "Role Permissions",
  "Enterprise Search foundation",
];

const CAPABILITIES_IN_DEV: string[] = [
  "AI Workspace Audit", "Executive KPI Charts", "Workspace Health Score",
  "Knowledge Health Dashboard", "Operational Insights", "Advanced Notifications",
  "Global Enterprise Search", "AI Validation Engine", "Dashboard Personalization",
  "Professional Audit Reports",
];

const CAPABILITIES_COMING: string[] = [
  "Workflow Automation", "Scheduled Reports", "Email Notifications",
  "Teams Integration", "Slack Integration", "Microsoft 365 Integration",
  "Google Workspace Integration", "SAP Integration",
  "Warehouse Management Connectors", "Transport Management Connectors",
  "API Marketplace", "Enterprise Billing", "SSO", "SCIM Provisioning",
  "ISO27001 Toolkit", "Advanced AI Process Intelligence",
  "Predictive Operational Analytics", "AI Recommendation Engine",
  "AI Process Optimization",
];

function CapabilitiesSection() {
  const groups: Array<{ stage: Stage; heading: string; items: string[] }> = [
    { stage: "available",      heading: "Available today",     items: CAPABILITIES_AVAILABLE },
    { stage: "in_development", heading: "In development",      items: CAPABILITIES_IN_DEV },
    { stage: "coming_soon",    heading: "Coming soon",         items: CAPABILITIES_COMING },
  ];
  return (
    <section id="capabilities" className="border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Platform status</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Current Platform Capabilities</h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            A transparent view of what OPSQAI delivers today and what's being built next — so teams know
            exactly what to expect when they roll the platform out.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {groups.map((g) => (
            <div key={g.stage}>
              <div className="flex items-center gap-3 mb-4">
                <StageChip stage={g.stage} />
                <h3 className="text-[13.5px] font-semibold tracking-tight uppercase text-foreground/80">{g.heading}</h3>
                <span className="text-[11px] text-muted-foreground">· {g.items.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map((t) => <CapabilityCard key={t} title={t} stage={g.stage} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const GOVERNANCE: Array<{ title: string; body: string; icon: typeof ShieldCheck }> = [
  { title: "Platform Owner",          body: "A protected, immutable role with full platform authority and self-healing safeguards.", icon: ShieldCheck },
  { title: "Platform Administration", body: "Centralized control for companies, super admins and platform-wide policies.",          icon: ShieldCheck },
  { title: "Company Administration",  body: "Per-tenant administration with full isolation from other companies.",                   icon: Lock },
  { title: "Workspace Administration",body: "Manage SOPs, FAQs, members and access at the workspace level.",                         icon: Users },
  { title: "Role Based Access Control", body: "Seven enterprise roles, from Viewer to Platform Owner, with permission inheritance.", icon: ShieldCheck },
  { title: "Audit Trail",             body: "Every question, source and admin action recorded for compliance reviews.",              icon: ScrollText },
  { title: "Knowledge Governance",    body: "SOP lifecycle, versioning, gaps and critical-document acknowledgements.",                icon: BookOpen },
  { title: "AI Governance",           body: "Grounded answers, confidence scoring and policy controls for AI usage.",                 icon: Brain },
  { title: "Permission Engine",       body: "Granular, table-driven permissions enforced on both the API and the UI.",                icon: KeyRound },
];

function GovernanceSection() {
  return (
    <section id="governance" className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Enterprise Governance</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Governance built in, not bolted on</h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            OPSQAI already ships with the governance primitives enterprise operations expect: isolation,
            roles, audit trails and AI controls.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GOVERNANCE.map((g) => (
            <div key={g.title} className="card-enterprise hover-lift p-6 group">
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[15px]">{g.title}</h3>
              <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed">{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ROADMAP: Array<{ phase: string; status: string; stage: Stage; items: string[] }> = [
  { phase: "Phase 1", status: "Completed", stage: "available", items: [
    "AI Assistant", "Knowledge Base", "Templates", "FAQ", "Audit Log",
    "Knowledge Gaps", "Executive Dashboard", "Platform Administration",
    "Multi Company", "RBAC", "AI SOP Generator",
  ]},
  { phase: "Phase 2", status: "Currently being developed", stage: "in_development", items: [
    "AI Workspace Audit", "Executive Charts", "Workspace Health",
    "AI Validation", "Global Search", "Executive Insights",
  ]},
  { phase: "Phase 3", status: "Future", stage: "coming_soon", items: [
    "Workflow Automation", "Predictive Analytics", "Enterprise Integrations",
    "Billing", "AI Process Intelligence",
  ]},
];

function RoadmapSection() {
  return (
    <section id="roadmap" className="border-y border-border/50 bg-[oklch(0.15_0.03_240)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Roadmap</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Current Development Roadmap</h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            A transparent picture of what's shipped, what's being built and what's planned next.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {ROADMAP.map((p) => (
            <div key={p.phase} className="card-enterprise p-6 relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.phase}</div>
                  <div className="mt-1 text-[15px] font-semibold tracking-tight">{p.status}</div>
                </div>
                <StageChip stage={p.stage} />
              </div>
              <ul className="mt-5 space-y-2">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-[13px] text-foreground/90">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{STAGE_META[p.stage].emoji} {it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyImprovingSection() {
  return (
    <section id="why-improving" className="relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="card-enterprise p-8 md:p-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] text-primary">
            <Sparkles className="h-3 w-3" /> Continuous delivery
          </div>
          <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">Why OPSQAI keeps improving</h2>
          <p className="mt-4 text-[14.5px] md:text-[15px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            OPSQAI evolves continuously based on operational experience, customer feedback and real
            warehouse workflows. New enterprise capabilities are released regularly while maintaining
            full backward compatibility.
          </p>
        </div>
      </div>
    </section>
  );
}

const STATUS_ITEMS: Array<{ label: string; value: string; sub: string }> = [
  { label: "Current maturity",   value: "Enterprise MVP",         sub: "Production-ready core" },
  { label: "Platform Status",    value: "Active Development",     sub: "New features every sprint" },
  { label: "Enterprise Features",value: "Growing every sprint",   sub: "Roadmap driven by customers" },
  { label: "AI Readiness",       value: "Enterprise Grade",       sub: "Grounded, audited, isolated" },
];

function PlatformStatusSection() {
  return (
    <section id="platform-status" className="border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Live status</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Enterprise Platform Status</h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ITEMS.map((s) => (
            <div key={s.label} className="card-enterprise hover-lift p-6">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</div>
              <div className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-gradient-primary">{s.value}</div>
              <div className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Avoid unused-import lints in case Users/Languages/etc. drop from FEATURES later
void Users; void Languages;


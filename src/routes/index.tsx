import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Brain, Languages, FileSearch, GitBranch, Users } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OPSQAI — AI Knowledge Platform for Logistics & Supply Chain" },
      { name: "description", content: "OPSQAI turns your SOPs, manuals and FAQs into instant, grounded answers for every warehouse and operations team. Multilingual, auditable, GDPR-ready." },
      { property: "og:title", content: "OPSQAI — AI Knowledge Platform for Logistics" },
      { property: "og:description", content: "Instant access to company knowledge across every warehouse, shift and language." },
      { property: "og:url", content: "https://opsqai.eu/" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.eu/" }],
  }),
  component: Home,
});

const FEATURES = [
  { icon: Brain, title: "Source-grounded answers", body: "Every answer cites the exact SOP, page and excerpt. No hallucinations — if it isn't in your documents, OPSQAI says so." },
  { icon: Languages, title: "Multilingual", body: "Ask in English, German or Romanian. OPSQAI translates from source documents on the fly while preserving codes and terminology." },
  { icon: FileSearch, title: "Semantic + keyword search", body: "Recursive chunking, pgvector embeddings and hybrid retrieval surface the right paragraph — not just the right document." },
  { icon: ShieldCheck, title: "Multi-tenant by design", body: "Row-level security isolates every company. Roles, audit logs and invite-only onboarding meet enterprise expectations." },
  { icon: GitBranch, title: "SOP version control", body: "Replace SOPs in one click. Old versions stay in the audit trail; the AI immediately uses the newest version." },
  { icon: Users, title: "Built for operations", body: "Inbound, outbound, transport, safety, internal procedures — designed around how warehouse teams actually work." },
];

function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.45_0.15_270/0.18),transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Now in private beta with logistics operators across the EU
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            The AI knowledge platform<br />for logistics operations.
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            OPSQAI gives every warehouse worker, team leader and manager instant, source-grounded answers from your own SOPs, manuals and FAQs — in their language, with citations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg"><Link to="/contact">Book a demo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/demo">Try the live demo</Link></Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card · GDPR-ready · Hosted in the EU</p>
        </div>
      </section>

      {/* Logo placeholder strip */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Trusted by operations teams at logistics, 3PL and supply chain companies</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">One platform. Every procedure.</h2>
          <p className="mt-3 text-muted-foreground">From inbound to last mile — OPSQAI centralizes the knowledge your teams need to work safely and consistently.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 border-border/60 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 border-t border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Reduce onboarding time. Reduce errors.</h2>
          <p className="mt-3 text-muted-foreground">See how OPSQAI fits into your operation — book a 30-minute walkthrough with our team.</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg"><Link to="/contact">Book a demo</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/pricing">See pricing</Link></Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

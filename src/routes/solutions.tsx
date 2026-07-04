import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, MessageSquareWarning, ShieldCheck, Wrench } from "lucide-react";
import { SOLUTION_PAGES } from "@/content/solutions/data";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/solutions")({
  head: () =>
    pageHead({
      title: "Solutions — OPSQAI for Warehouse & Logistics Operations",
      description:
        "OPSQAI solutions for warehouse operations: SOP assistant, onboarding, compliance, knowledge gap capture, shift handover and audit readiness.",
      path: "/solutions",
      keywords: "warehouse AI, SOP assistant, onboarding, compliance, shift handover, audit readiness",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Solutions", path: "/solutions" },
      ],
    }),
  component: SolutionsPage,
});

const SOLUTIONS = [
  {
    icon: BookOpen,
    title: "SOP assistant on the floor",
    body: "Every operator gets instant answers from your own SOPs in their own language — even if the SOP is written in another one. Cited verbatim, never invented.",
    bullets: ["Mobile-first chat", "Multilingual EN / DE / RO", "Verbatim source excerpts"],
  },
  {
    icon: GraduationCap,
    title: "New-hire onboarding",
    body: "New employees self-serve the basics — PPE, gate procedures, escalation paths — without pulling a team leader off the line.",
    bullets: ["Faster ramp-up", "Consistent answers across shifts", "Audit trail of what was asked"],
  },
  {
    icon: ClipboardCheck,
    title: "Compliance & audit readiness",
    body: "Every answer carries its sources. The audit log captures what was asked, what was used and what changed in the knowledge base — ready for an internal or external auditor.",
    bullets: ["Append-only audit log", "Per-tenant scoping with RLS", "Document version history"],
  },
  {
    icon: MessageSquareWarning,
    title: "Knowledge gap capture",
    body: "When the AI cannot answer from sources, the user can open an internal request. Managers triage it and promote the resolution to a FAQ or new SOP.",
    bullets: ["Refusal instead of guesses", "One-click promotion to FAQ / SOP", "Closes the loop on missing knowledge"],
  },
  {
    icon: Wrench,
    title: "Shift handover & tribal knowledge",
    body: "Capture the answers that usually live in team-leader heads. Make them queryable and assigned to a SOP — not a chat group people scroll past.",
    bullets: ["Promote answers to FAQs", "Re-index changed SOPs", "Searchable thread history"],
  },
  {
    icon: ShieldCheck,
    title: "Multi-site rollout",
    body: "Roll OPSQAI across multiple warehouses with strict tenant isolation. Each site keeps its own knowledge base, users and audit log.",
    bullets: ["Per-company RLS", "Platform-admin workspace switcher", "Invite-only onboarding"],
  },
];

function SolutionsPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Solutions</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Built for how warehouse teams actually work.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          OPSQAI is not a generic chatbot. Each solution below is grounded in real operations on the floor — fast answers, cited sources, and a clear path to fill the gaps.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <Card key={s.title} className="p-6 border-border/60">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {s.bullets.map((b) => <li key={b}>· {b}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Explore by use case</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Deep-dive landing pages</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {SOLUTION_PAGES.map((s) => (
            <Link key={s.slug} to="/solutions/$slug" params={{ slug: s.slug }} className="group rounded-xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/50 hover:bg-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">{s.eyebrow}</p>
                  <h3 className="mt-2 font-semibold text-foreground">{s.h1}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">

        <h2 className="text-2xl font-semibold tracking-tight">See it on your SOPs.</h2>
        <p className="mt-2 text-muted-foreground">A 20-minute working session with your real documents.</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Button asChild><Link to="/contact">Book a demo</Link></Button>
          <Button asChild variant="outline"><Link to="/demo">Try the live demo</Link></Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { LifeBuoy, MessageSquare, Clock, ShieldCheck, BookOpen } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () =>
    pageHead({
      title: "Support — OPSQAI",
      description:
        "OPSQAI support: how to reach us, response targets, and where customers open tickets. Existing customers file requests inside the Customer Portal.",
      path: "/support",
      keywords: "OPSQAI support, enterprise support, SLA, response time",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Support", path: "/support" },
      ],
    }),
  component: SupportPage,
});

const TIERS = [
  { label: "Critical", target: "1 business hour", body: "Install is down, license activation blocked, security incident." },
  { label: "High", target: "1 business day", body: "Feature broken for most users, module activation issue, upgrade failure." },
  { label: "Normal", target: "3 business days", body: "How-to questions, configuration guidance, non-blocking bugs." },
];

function SupportPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Support</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Real engineers. Real answers.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI support is handled by the team that ships the product. Customers file requests
          from inside the Customer Portal and receive responses under the SLA below.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/portal/support">Open Customer Portal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact sales</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-border/60">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Tickets in the Portal</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every customer contact can open, follow, and reply to conversations from
              <span className="font-mono"> /portal/support</span>. Full history is retained.
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <Clock className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Response targets by priority</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Priorities are set on the ticket. Critical incidents are picked up during business
              hours in Central European Time.
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <BookOpen className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">Documentation first</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Most operational questions are answered in the administrator guide and the technical
              handbook.{" "}
              <Link to="/documentation" className="underline underline-offset-4">Browse docs →</Link>
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Response targets
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {TIERS.map((t) => (
              <Card key={t.label} className="p-5 border-border/60">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</div>
                <div className="mt-1 font-semibold text-lg">{t.target}</div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{t.body}</p>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Targets apply to customers on an active Annual Maintenance contract. Exact SLA terms
            are in each customer agreement.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <LifeBuoy className="h-8 w-8 text-primary mx-auto" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Not a customer yet?</h2>
        <p className="mt-3 text-muted-foreground">
          Reach out and we'll route your question to the right person.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/contact">Contact OPSQAI</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

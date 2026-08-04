import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { LifeBuoy, MessageSquare, Clock, ShieldCheck, BookOpen } from "lucide-react";
import { useSupportCopy } from "@/i18n/pages/support";

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

function SupportPage() {
  const t = useSupportCopy();
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.hero.eyebrow}</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          {t.hero.headline}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t.hero.body}
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/portal/support">{t.hero.ctaPrimary}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">{t.hero.ctaSecondary}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-border/60">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{t.cards.tickets.title}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t.cards.tickets.body}
              <span className="font-mono"> /portal/support</span>
              {t.cards.tickets.bodyEnd}
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <Clock className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{t.cards.targets.title}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t.cards.targets.body}
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <BookOpen className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{t.cards.docs.title}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t.cards.docs.body}{" "}
              <Link to="/documentation" className="underline underline-offset-4">{t.cards.docs.link}</Link>
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> {t.slaSection.headline}
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {t.tiers.map((tier) => (
              <Card key={tier.label} className="p-5 border-border/60">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{tier.label}</div>
                <div className="mt-1 font-semibold text-lg">{tier.target}</div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{tier.body}</p>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            {t.slaSection.footnote}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <LifeBuoy className="h-8 w-8 text-primary mx-auto" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">{t.notCustomer.headline}</h2>
        <p className="mt-3 text-muted-foreground">
          {t.notCustomer.body}
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/contact">{t.notCustomer.cta}</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Check, Building2, Users, Sparkles, ShieldCheck } from "lucide-react";

import { pageHead, faqLd } from "@/lib/seo";

const PRICING_FAQS = [
  { question: "How is OPSQAI priced?", answer: "Per user per month, with a volume-tiered rate that decreases as the deployment scales. A one-time implementation package covers onboarding, initial knowledge ingestion and workspace configuration." },
  { question: "Is there a free trial?", answer: "OPSQAI offers a live, read-only interactive demo populated with real logistics operations data. Paid pilots are available on request for qualified enterprise buyers." },
  { question: "Where is our data hosted?", answer: "OPSQAI hosts customer data in the EU. Data residency, retention and processing terms are covered in the DPA included with every enterprise contract." },
  { question: "Do you support SSO?", answer: "Yes — SSO is available on request for enterprise plans, alongside role-based access control across departments and sites." },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — OPSQAI Enterprise AI Platform",
      description:
        "Transparent per-user pricing for OPSQAI. From €8 per user per month, plus a one-time implementation package. EU hosting, SSO on request, DPA included.",
      path: "/pricing",
      keywords: "OPSQAI pricing, enterprise AI pricing, per-user pricing, warehouse AI cost",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Pricing", path: "/pricing" },
      ],
      jsonLd: [faqLd(PRICING_FAQS)],
    }),
  component: PricingPage,
});

// Volume-tiered per-user monthly price. Larger organizations get a lower rate.
function perUserRate(users: number): number {
  if (users >= 2000) return 8;
  if (users >= 500) return 9;
  if (users >= 200) return 10;
  if (users >= 50) return 11;
  return 12;
}

const MIN_USERS = 25;
const MAX_USERS = 8000;
const SLIDER_MAX = 1000;

function usersToSliderPos(u: number): number {
  return (Math.log(u / MIN_USERS) / Math.log(MAX_USERS / MIN_USERS)) * SLIDER_MAX;
}

function sliderPosToUsers(p: number): number {
  const raw = MIN_USERS * Math.pow(MAX_USERS / MIN_USERS, p / SLIDER_MAX);
  return Math.round(raw / 25) * 25;
}

// One-time implementation fee scales with rollout complexity.
function implementationRange(users: number): [number, number] {
  if (users >= 2000) return [45000, 90000];
  if (users >= 500) return [20000, 45000];
  if (users >= 200) return [10000, 22000];
  if (users >= 50) return [5000, 12000];
  return [2500, 6000];
}

const FEATURES = [
  "Unlimited documents and SOPs",
  "Source-grounded answers with citations",
  "Role-based access and audit log",
  "OPSQAI Academy — training & certification",
  "Knowledge gap analytics",
  "EN / DE / RO out of the box",
  "EU hosting with multi-tenant isolation",
  "SSO / SAML on request",
  "DPA, subprocessors register & GDPR",
  "Dedicated onboarding & success manager",
];

const eur = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function PricingPage() {
  const [users, setUsers] = useState<number>(150);
  const rate = perUserRate(users);
  const [implLo, implHi] = implementationRange(users);
  const monthly = useMemo(() => rate * users, [rate, users]);
  const annual = monthly * 12;

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pricing</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          One enterprise plan. Priced per user.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          From <span className="font-semibold text-foreground">€8 / user / month</span>, plus a one-time
          implementation package sized to your rollout. Every feature is included from day one.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <Card className="p-6 md:p-8 border-primary/30 shadow-xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Estimate your investment
          </div>
          <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Users</div>
              <div className="text-4xl font-semibold tracking-tight">{users.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Per-user rate</div>
              <div className="text-2xl font-semibold text-primary">{eur.format(rate)}<span className="text-sm text-muted-foreground font-normal"> / user / mo</span></div>
            </div>
          </div>

          <div className="mt-5">
            <Slider
              value={[usersToSliderPos(users)]}
              onValueChange={(v) => setUsers(Math.max(MIN_USERS, sliderPosToUsers(v[0] ?? 0)))}
              min={0}
              max={SLIDER_MAX}
              step={1}
            />
            <div className="relative mt-2 h-4 text-[11px] text-muted-foreground">
              {[25, 500, 2000, 8000].map((v, i, arr) => (
                <span
                  key={v}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${(usersToSliderPos(v) / SLIDER_MAX) * 100}%` }}
                >
                  {v.toLocaleString()}{i === arr.length - 1 ? "+" : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat icon={Users} label="Monthly subscription" value={eur.format(monthly)} sub={`${eur.format(rate)} × ${users.toLocaleString()} users`} />
            <Stat icon={Building2} label="Annual subscription" value={eur.format(annual)} sub="Billed annually" />
            <Stat icon={ShieldCheck} label="Implementation (one-time)" value={`${eur.format(implLo)} – ${eur.format(implHi)}`} sub="Setup, migration, training" />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1"><Link to="/contact">Get a written quote</Link></Button>
            <Button asChild variant="outline" className="flex-1"><Link to="/demo">Book a live demo</Link></Button>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground">
            Estimates only. Final pricing depends on rollout scope, integrations, languages and support level.
            Volume discounts apply automatically as your team grows.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Enterprise plan
          </div>
          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Everything, for every operations team</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                A single enterprise plan that scales from a 25-person warehouse to an 8,000+ user
                multi-country group. No hidden tiers, no locked features.
              </p>
            </div>
            <Button asChild size="lg"><Link to="/contact">Talk to sales</Link></Button>
          </div>

          <ul className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center text-sm text-muted-foreground">
        <p>
          Every deployment includes EU hosting, multi-tenant isolation, audit log, role-based access,
          OPSQAI Academy and source-grounded answering. Onboarding and success management are part of
          the implementation package — never a paid add-on.
        </p>
      </section>
    </MarketingLayout>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

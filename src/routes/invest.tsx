import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ShieldCheck, XCircle } from "lucide-react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { SectionShell } from "@/components/oix/section-shell";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { investCopyEn, useInvestCopy, INVEST_EMAIL } from "@/i18n/pages/invest";

export const Route = createFileRoute("/invest")({
  head: () =>
    pageHead({
      title: investCopyEn.meta.title,
      description: investCopyEn.meta.description,
      path: "/invest",
      keywords:
        "OPSQAI investors, seed round, sovereign AI platform, self-hosted operational AI, logistics AI investment, Germany DACH",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Invest", path: "/invest" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Invest", path: "/invest" },
        ]),
      ],
    }),
  component: InvestPage,
});

function InvestPage() {
  const t = useInvestCopy();
  const mailto = `mailto:${INVEST_EMAIL}?subject=${encodeURIComponent("OPSQAI — investor enquiry")}`;

  return (
    <OixLayout>
      <SectionShell className="pt-24 md:pt-32">
        <div className="max-w-4xl">
          <EditorialHeadline as="h1" size="xl" eyebrow={<span>{t.hero.eyebrow}</span>}>
            {t.hero.h1a}
            <br className="hidden sm:block" /> {t.hero.h1b}
          </EditorialHeadline>
          <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t.hero.intro}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={mailto}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[var(--oix-emerald)] px-5 py-3 text-sm font-semibold text-[var(--oix-primary-ink)] transition-colors hover:bg-[var(--oix-emerald-strong)]"
            >
              <Mail className="h-4 w-4" strokeWidth={1.6} />
              {t.hero.primary}
            </a>
            <Link
              to="/discovery"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-[var(--oix-border-strong)] px-5 py-3 text-sm font-semibold text-[var(--oix-cream)] transition-colors hover:bg-[var(--oix-surface)]"
            >
              {t.hero.secondary}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <h2 className="oix-display text-4xl md:text-5xl">{t.thesisTitle}</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
          {t.thesis.map((item) => (
            <div key={item.title} className="bg-card p-6">
              <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.6} />
              <div className="mt-3 font-display text-xl font-semibold text-foreground">
                {item.title}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <h2 className="oix-display text-3xl md:text-4xl">{t.stageTitle}</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {t.stage.map((s) => (
            <div key={s.label} className="bg-card p-6">
              <div className="oix-eyebrow text-[10px]">{s.label}</div>
              <div className="mt-3 font-display text-2xl font-semibold text-foreground">
                {s.value}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <h2 className="oix-display text-3xl md:text-4xl">{t.modelTitle}</h2>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t.modelNote}</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {t.model.map((m) => (
            <div key={m.title} className="bg-card p-6">
              <div className="oix-eyebrow text-[10px]">{m.title}</div>
              <div className="mt-3 font-display text-2xl font-semibold text-foreground">
                {m.value}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <h2 className="oix-display text-3xl md:text-4xl">{t.planTitle}</h2>
        <div className="mt-10 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-card/60">
              <tr className="oix-eyebrow text-[10px]">
                <th className="px-5 py-4">{t.planHead.year}</th>
                <th className="px-5 py-4">{t.planHead.customers}</th>
                <th className="px-5 py-4">{t.planHead.revenue}</th>
                <th className="px-5 py-4">{t.planHead.per}</th>
              </tr>
            </thead>
            <tbody>
              {t.plan.map((row) => (
                <tr key={row.year} className="border-t border-border">
                  <td className="px-5 py-4 font-display text-base font-semibold text-foreground">
                    {row.year}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{row.customers}</td>
                  <td className="px-5 py-4 text-foreground">{row.revenue}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-xs text-muted-foreground">{t.planNote}</p>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="oix-display text-3xl md:text-4xl">{t.roundTitle}</h2>
            <div className="mt-6 font-display text-5xl font-semibold text-foreground">
              {t.roundAmount}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t.roundBody}</p>
          </div>
          <ul className="space-y-3 self-center">
            {t.roundUse.map((u) => (
              <li key={u} className="flex items-start gap-3 text-sm text-foreground/90">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.6} />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <div className="max-w-3xl">
          <h2 className="oix-display text-3xl md:text-4xl">{t.riskTitle}</h2>
          <ul className="mt-8 space-y-3">
            {t.risks.map((r) => (
              <li key={r} className="flex items-start gap-3 text-sm text-foreground/90">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.6} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="oix-display text-4xl md:text-5xl">{t.ctaTitle}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{t.ctaBody}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={mailto}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[var(--oix-emerald)] px-5 py-3 text-sm font-semibold text-[var(--oix-primary-ink)] transition-colors hover:bg-[var(--oix-emerald-strong)]"
            >
              <Mail className="h-4 w-4" strokeWidth={1.6} />
              {t.ctaButton}
            </a>
            <a
              href={mailto}
              className="inline-flex min-h-11 items-center rounded-sm border border-[var(--oix-border-strong)] px-5 py-3 text-sm font-semibold text-[var(--oix-cream)] transition-colors hover:bg-[var(--oix-surface)]"
            >
              {INVEST_EMAIL}
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t.ctaNote}</p>
        </div>
      </SectionShell>
    </OixLayout>
  );
}

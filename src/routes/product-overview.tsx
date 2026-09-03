import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BookOpen,
  Sparkles,
  GraduationCap,
  Activity,
  LayoutDashboard,
  HardDrive,
  ArrowDown,
  Check,
} from "lucide-react";
import { pageHead, softwareApplicationLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
import { useProductOverviewCopy } from "@/i18n/pages/product-overview";

const PDF_HREF = "/OPSQAI_Product_Overview.pdf";

export const Route = createFileRoute("/product-overview")({
  head: () =>
    pageHead({
      title: "Product Overview — OPSQAI Operational Intelligence Platform",
      description:
        "One workspace for operational knowledge, AI and intelligence: Knowledge Base, SOPs, FAQs, AI Chat, Knowledge Gaps, AI Audit, Academy, management dashboards, Cloud or Self-Hosted.",
      path: "/product-overview",
      keywords:
        "operational intelligence platform, knowledge base, SOP management, AI chat approved sources, knowledge gaps, AI audit, academy, self-hosted AI, local AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Product Overview", path: "/product-overview" },
      ],
      jsonLd: [
        softwareApplicationLd({
          description:
            "OPSQAI is an Operational Intelligence Platform combining knowledge, AI, learning, intelligence and management in one workspace, available Cloud or Self-Hosted.",
        }),
      ],
    }),
  component: ProductOverviewPage,
});

const CAPABILITY_ICONS = [BookOpen, Sparkles, GraduationCap, Activity, LayoutDashboard, HardDrive];

function PdfButton({ label, variant = "ghost" }: { label: string; variant?: "gold" | "ghost" }) {
  return (
    <a
      href={PDF_HREF}
      download="OPSQAI_Product_Overview.pdf"
      className={[
        "group relative oix-brackets inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-300",
        variant === "gold"
          ? "bg-[var(--oix-gold)] text-[#0a0b14] hover:bg-[var(--oix-gold-soft)]"
          : "border border-[var(--oix-gold-line)] text-[var(--oix-cream)] hover:border-[var(--oix-gold)] hover:text-[var(--oix-gold-soft)]",
      ].join(" ")}
    >
      <span>{label}</span>
      <ArrowDownToLine
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5"
        strokeWidth={1.5}
      />
    </a>
  );
}

function ProductOverviewPage() {
  const c = useProductOverviewCopy();

  return (
    <OixLayout>
      {/* 1 — Hero */}
      <SectionShell className="oix-hairline-bottom pt-32 md:pt-40">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <EditorialHeadline
              as="h1"
              size="lg"
              eyebrow={c.hero.eyebrow}
              serifAccent={c.hero.serifAccent}
            >
              {c.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream)]/80">
              {c.hero.body}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--oix-cream-dim)]">
              {c.hero.body2}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/product-overview#capabilities" variant="gold" withArrow>
                {c.hero.ctaPrimary}
              </OixButton>
              <PdfButton label={c.hero.ctaPdf} />
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-px bg-[var(--oix-gold-line)] sm:grid-cols-3 lg:grid-cols-2">
            {c.glance.groups.map((g) => (
              <li key={g.name} className="bg-[var(--oix-bg-deep)] p-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--oix-gold)]">
                  {g.name}
                </div>
                <div className="mt-2 text-xs leading-relaxed text-[var(--oix-cream-dim)]">
                  {g.items.slice(0, 3).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      {/* 1b — Demo video */}
      <SectionShell className="oix-hairline-bottom">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <EditorialHeadline size="md" eyebrow={c.demo.eyebrow} serifAccent={c.demo.serifAccent}>
              {c.demo.headline}
            </EditorialHeadline>
            <p className="mt-6 text-base leading-relaxed text-[var(--oix-cream)]/80">{c.demo.body}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--oix-gold)]">
              {c.demo.caption}
            </p>
          </div>
          <div className="border border-[var(--oix-gold-line)] bg-[var(--oix-bg-deep)] p-2">
            <video
              className="block w-full"
              src={demoVideo.url}
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      </SectionShell>

      {/* 2 — What is OPSQAI */}

      <SectionShell>
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <EditorialHeadline
              size="md"
              eyebrow={c.what.eyebrow}
              serifAccent={c.what.serifAccent}
            >
              {c.what.headline}
            </EditorialHeadline>
            <p className="mt-8 text-base leading-relaxed text-[var(--oix-cream)]/80">{c.what.body}</p>
            <p className="mt-4 text-base leading-relaxed text-[var(--oix-cream-dim)]">
              {c.what.body2}
            </p>
          </div>

          {/* Simple premium hub visual */}
          <div className="relative">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center">
              <div className="oix-brackets flex h-24 w-40 items-center justify-center border border-[var(--oix-gold)] bg-[var(--oix-surface-2)]">
                <span className="oix-display text-lg tracking-[0.24em] text-[var(--oix-gold)]">
                  {c.what.center}
                </span>
              </div>
              <div className="h-10 w-px bg-[var(--oix-gold-line)]" />
              <div className="grid w-full grid-cols-2 gap-px bg-[var(--oix-gold-line)] sm:grid-cols-3">
                {c.what.nodes.map((n) => (
                  <div key={n.label} className="bg-[var(--oix-bg-deep)] p-4 text-center">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--oix-cream)]">
                      {n.label}
                    </div>
                    <div className="mt-1.5 text-[11px] leading-snug text-[var(--oix-cream-dim)]">
                      {n.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* 3 — Six core capabilities */}
      <SectionShell id="capabilities" className="oix-hairline-top">
        <div className="max-w-2xl">
          <EditorialHeadline
            size="md"
            eyebrow={c.capabilities.eyebrow}
            serifAccent={c.capabilities.serifAccent}
          >
            {c.capabilities.headline}
          </EditorialHeadline>
        </div>

        <div className="mt-14 grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-2 xl:grid-cols-3">
          {c.capabilities.items.map((item, i) => {
            const Icon = CAPABILITY_ICONS[i] ?? BookOpen;
            return (
              <article
                key={item.title}
                className="flex flex-col bg-[var(--oix-bg-deep)] p-8 transition-colors hover:bg-[var(--oix-surface-2)]"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-[var(--oix-gold)]" strokeWidth={1.4} />
                  <span className="oix-display text-sm text-[var(--oix-gold-soft)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="oix-display mt-6 text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream-dim)]">
                  {item.intro}
                </p>
                <ul className="mt-6 space-y-2">
                  {item.items.map((cap) => (
                    <li
                      key={cap}
                      className="flex items-start gap-2 text-sm text-[var(--oix-cream)]/75"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--oix-gold)]"
                        strokeWidth={2}
                      />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
                <p className="oix-serif-italic mt-7 border-t border-[var(--oix-gold-line)] pt-5 text-sm text-[var(--oix-cream)]/85">
                  {item.key}
                </p>
              </article>
            );
          })}
        </div>
      </SectionShell>

      <MottoBand />

      {/* 4 — How OPSQAI works */}
      <SectionShell className="oix-hairline-top">
        <div className="max-w-2xl">
          <EditorialHeadline size="md" eyebrow={c.how.eyebrow} serifAccent={c.how.serifAccent}>
            {c.how.headline}
          </EditorialHeadline>
        </div>

        <div className="mt-14 space-y-0">
          {c.how.stages.map((stage, i) => (
            <div key={stage.label}>
              <div className="oix-brackets border border-[var(--oix-gold-line)] bg-[var(--oix-bg-deep)] p-6 md:flex md:items-center md:gap-8">
                <div className="flex items-center gap-3 md:w-72 md:shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-[var(--oix-gold)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="oix-display text-base">{stage.label}</span>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2 md:mt-0">
                  {stage.items.map((it) => (
                    <li
                      key={it}
                      className="border border-[var(--oix-gold-line)] px-3 py-1.5 text-xs text-[var(--oix-cream-dim)]"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
              {i < c.how.stages.length - 1 ? (
                <div className="flex justify-center py-4">
                  <ArrowDown className="h-5 w-5 text-[var(--oix-gold)]" strokeWidth={1.4} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <p className="oix-display mt-12 text-center text-[clamp(1.25rem,2.6vw,2rem)] text-[var(--oix-gold-soft)]">
          {c.how.outcome}
        </p>
      </SectionShell>

      {/* 5 — Use cases */}
      <SectionShell className="oix-hairline-top">
        <div className="max-w-2xl">
          <EditorialHeadline
            size="md"
            eyebrow={c.useCases.eyebrow}
            serifAccent={c.useCases.serifAccent}
          >
            {c.useCases.headline}
          </EditorialHeadline>
        </div>

        <div className="mt-14 grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-2 xl:grid-cols-3">
          {c.useCases.items.map((u, i) => (
            <article key={u.title} className="bg-[var(--oix-bg-deep)] p-8">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--oix-gold)]">
                {`Use case ${String(i + 1).padStart(2, "0")}`}
              </div>
              <h3 className="oix-display mt-4 text-lg">{u.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{u.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--oix-cream-dim)]">
          {c.useCases.note}
        </p>
      </SectionShell>

      {/* 6 — Self-Hosted */}
      <SectionShell className="oix-hairline-top" bracketed>
        <div className="max-w-3xl">
          <EditorialHeadline
            size="lg"
            eyebrow={c.selfHosted.eyebrow}
            serifAccent={c.selfHosted.serifAccent}
          >
            {c.selfHosted.headline}
          </EditorialHeadline>
          <p className="mt-8 text-lg leading-relaxed text-[var(--oix-cream)]/80">
            {c.selfHosted.body}
          </p>
        </div>

        <div className="mt-14 grid gap-px bg-[var(--oix-gold-line)] sm:grid-cols-2 xl:grid-cols-4">
          {c.selfHosted.items.map((s) => (
            <div key={s.title} className="bg-[var(--oix-bg-deep)] p-7">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--oix-gold)]">
                {s.title}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <OixButton to="/self-hosted" variant="ghost" withArrow>
            {c.selfHosted.cta}
          </OixButton>
        </div>
      </SectionShell>

      {/* 7 — Platform at a glance */}
      <SectionShell className="oix-hairline-top">
        <div className="max-w-2xl">
          <EditorialHeadline size="md" eyebrow={c.glance.eyebrow} serifAccent={c.glance.serifAccent}>
            {c.glance.headline}
          </EditorialHeadline>
        </div>

        <div className="mt-14 grid gap-px bg-[var(--oix-gold-line)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {c.glance.groups.map((g) => (
            <div key={g.name} className="bg-[var(--oix-bg-deep)] p-6">
              <div className="oix-display text-sm tracking-[0.18em] text-[var(--oix-gold)]">
                {g.name}
              </div>
              <ul className="mt-4 space-y-2">
                {g.items.map((it) => (
                  <li key={it} className="text-sm text-[var(--oix-cream-dim)]">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* 8 — Final CTA */}
      <SectionShell className="oix-hairline-top text-center">
        <EditorialHeadline
          align="center"
          size="md"
          serifAccent={c.finalCta.serifAccent}
        >
          {c.finalCta.headline}
        </EditorialHeadline>
        <p className="mx-auto mt-6 max-w-2xl text-[var(--oix-cream-dim)]">{c.finalCta.body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <OixButton to="/contact" variant="gold" withArrow>
            {c.finalCta.ctaPrimary}
          </OixButton>
          <PdfButton label={c.finalCta.ctaPdf} />
        </div>
      </SectionShell>
    </OixLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { MottoBand } from "@/components/oix/motto-band";
import { OixButton } from "@/components/oix/buttons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pageHead } from "@/lib/seo";
import {
  ADDON_CATALOG,
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  workspacesForProduct,
} from "@/lib/product-architecture";
import { Check, Package } from "lucide-react";
import { useModulesCopy } from "@/i18n/pages/modules";
import { useT } from "@/i18n";
import { localizeWorkspaceLabel } from "@/i18n/pages/product-workspaces";

export const Route = createFileRoute("/modules")({
  head: () =>
    pageHead({
      title: "Platform — OPSQAI Core, Products & Add-ons",
      description:
        "The OPSQAI Core platform ships with every installation. OPSQAI products cover your business domain, and optional add-ons are licensed only if you need them.",
      path: "/modules",
      keywords: "OPSQAI platform, OPSQAI products, core capabilities, add-ons, self-hosted AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Platform", path: "/modules" },
      ],
    }),
  component: ModulesPage,
});

function ModulesPage() {
  const t = useModulesCopy();
  const { lang } = useT();

  return (
    <OixLayout>
      {/* Cinematic hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-32 pt-32 md:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)] md:pb-40 md:pt-40">
          <div>
          <EditorialHeadline
            as="h1"
            size="xl"
            eyebrow={t.heroEyebrow}
            serifAccent={t.heroSerifAccent}
            className="max-w-4xl"
          >
            {t.heroHeadline}
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {t.heroBody}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <OixButton variant="gold" to="/contact" withArrow>
              {t.ctaRequestModules}
            </OixButton>
            <OixButton variant="ghost" to="/pricing">
              {t.ctaSeePricing}
            </OixButton>
          </div>
          </div>
          <EnterpriseIntelligence variant="platform" compact className="hidden md:flex" />
        </div>
      </section>

      {/* Motto band */}
      <MottoBand compact />

      {/* Core / Products / Add-ons */}
      <section className="mx-auto max-w-6xl px-6 py-24 space-y-16">
        <div>
          <SectionHeading icon={Package} title={t.coreTitle} />
          <div className="mt-4 flex items-center gap-3">
            <Badge className="border-[var(--oix-emerald)]/40 bg-[var(--oix-emerald)]/10 text-[10px] text-[var(--oix-emerald)]">
              <Check className="h-3 w-3 mr-1" /> {t.coreBadge}
            </Badge>
            <p className="text-xs leading-relaxed text-[var(--oix-cream-dim)]">{t.coreBody}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CORE_CAPABILITIES.map((cap) => (
              <Card
                key={cap.key}
                className="p-5"
              >
                <div className="text-sm font-semibold text-[var(--oix-cream)]">{cap.label}</div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--oix-cream-dim)]">{cap.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading icon={Package} title={t.productsTitle} />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--oix-cream-dim)]">{t.productsBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_CATALOG.map((p) => (
              <Card
                key={p.key}
                className="p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--oix-cream)]">{p.label}</div>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "available"
                        ? "border-[var(--oix-emerald)]/40 text-[10px] text-[var(--oix-emerald)]"
                        : "border-[var(--oix-gold-line)] text-[10px] text-[var(--oix-cream-dim)]"
                    }
                  >
                    {p.status === "available" ? t.availableBadge : t.plannedBadge}
                  </Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--oix-cream-dim)]">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {workspacesForProduct(p.key).map((w) => (
                    <span
                      key={w.key}
                      className="rounded-full border border-[var(--oix-gold-line)] bg-[var(--oix-surface)] px-2 py-0.5 text-[10px] text-[var(--oix-cream-dim)]"
                    >
                      {localizeWorkspaceLabel(w.route, w.label, lang)}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading icon={Package} title={t.addonsTitle} />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--oix-cream-dim)]">{t.addonsBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ADDON_CATALOG.map((a) => (
              <Card
                key={a.key}
                className="p-6"
              >
                <div className="text-sm font-semibold text-[var(--oix-cream)]">{a.label}</div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--oix-cream-dim)]">{a.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Activation */}
      <section className="border-t border-[var(--oix-gold-line)] bg-[var(--oix-surface-2)]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="oix-eyebrow">
            {t.activationEyebrow}
          </p>
          <h2 className="oix-display mt-4 text-4xl md:text-5xl">
            {t.activationHeadlinePrefix}{" "}
            <span className="italic text-[var(--oix-gold)]">{t.activationHeadlineAccent}</span>
          </h2>
          <p className="mt-5 text-[var(--oix-cream-dim)] leading-relaxed">
            {t.activationBody}
          </p>
          <div className="mt-8">
            <OixButton variant="gold" to="/contact" withArrow>
              {t.ctaRequestActivation}
            </OixButton>
          </div>
        </div>
      </section>
    </OixLayout>
  );
}

// Shared gold rule + label used by the three architecture sections.
function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: typeof Package;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-[#C9A24C]/40 to-transparent" />
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#C9A24C]" />
        <h2 className="text-[11px] uppercase tracking-[0.32em] text-white/60">{title}</h2>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-[#C9A24C]/40 to-transparent" />
    </div>
  );
}

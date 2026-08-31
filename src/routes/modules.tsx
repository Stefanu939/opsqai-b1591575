import { createFileRoute } from "@tanstack/react-router";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ModuleConstellation } from "@/components/three/primitives/module-constellation";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
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
} from "@/lib/product-architecture";
import { Check, Package } from "lucide-react";
import { useModulesCopy } from "@/i18n/pages/modules";

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

  return (
    <OixLayout>
      {/* Cinematic hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 h-[720px]">
          <Scene3D cameraPosition={[0, 0.6, 6.5]} cameraFov={45}>
            <ambientLight intensity={0.3} />
            <ModuleConstellation nodeCount={16} />
            <GoldBloom />
          </Scene3D>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-40 md:pt-40 md:pb-48">
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
      </section>

      {/* Motto band */}
      <MottoBand compact />

      {/* Core / Products / Add-ons */}
      <section className="mx-auto max-w-6xl px-6 py-24 space-y-16">
        <div>
          <SectionHeading icon={Package} title={t.coreTitle} />
          <div className="mt-4 flex items-center gap-3">
            <Badge className="border-[#5b3df5]/40 bg-[#5b3df5]/15 text-[10px] text-[#5fd4b3]">
              <Check className="h-3 w-3 mr-1" /> {t.coreBadge}
            </Badge>
            <p className="text-xs leading-relaxed text-white/60">{t.coreBody}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CORE_CAPABILITIES.map((cap) => (
              <Card
                key={cap.key}
                className="border-white/10 bg-white/[0.02] p-5 transition-all hover:border-[#C9A24C]/40"
              >
                <div className="text-sm font-semibold text-white">{cap.label}</div>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{cap.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading icon={Package} title={t.productsTitle} />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/60">{t.productsBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_CATALOG.map((p) => (
              <Card
                key={p.key}
                className="border-white/10 bg-white/[0.02] p-6 transition-all hover:border-[#C9A24C]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{p.label}</div>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "available"
                        ? "border-[#C9A24C]/40 text-[10px] text-[#C9A24C]"
                        : "border-white/20 text-[10px] text-white/50"
                    }
                  >
                    {p.status === "available" ? t.availableBadge : t.plannedBadge}
                  </Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">{p.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading icon={Package} title={t.addonsTitle} />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/60">{t.addonsBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ADDON_CATALOG.map((a) => (
              <Card
                key={a.key}
                className="border-white/10 bg-white/[0.02] p-6 transition-all hover:border-[#C9A24C]/40"
              >
                <div className="text-sm font-semibold text-white">{a.label}</div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">{a.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Activation */}
      <section className="border-t border-white/5 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#C9A24C]/80">
            {t.activationEyebrow}
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-light tracking-tight text-white">
            {t.activationHeadlinePrefix}{" "}
            <span className="font-serif italic text-[#C9A24C]">{t.activationHeadlineAccent}</span>
          </h2>
          <p className="mt-5 text-white/60 leading-relaxed">
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

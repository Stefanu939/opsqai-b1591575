import { createFileRoute, Link } from "@tanstack/react-router";
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
import { LICENSE_MODULE_CATALOG, BASIC_MODULES } from "@/lib/license-modules";
import { Check, Package } from "lucide-react";

export const Route = createFileRoute("/modules")({
  head: () =>
    pageHead({
      title: "Modules — OPSQAI Platform",
      description:
        "Every module available for OPSQAI. Basic modules ship with every install. Premium modules are licensed separately and activated by OPSQAI.",
      path: "/modules",
      keywords: "OPSQAI modules, AI modules, knowledge base, academy, audit, executive dashboard",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Modules", path: "/modules" },
      ],
    }),
  component: ModulesPage,
});

function ModulesPage() {
  const basicSet = new Set<string>(BASIC_MODULES);
  const categories = Array.from(new Set(LICENSE_MODULE_CATALOG.map((m) => m.category)));

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
            eyebrow="The OPSQAI module network"
            serifAccent="Every module orbits it."
            className="max-w-4xl"
          >
            One platform.
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            The Basic Platform ships with every OPSQAI installation. Premium modules
            dock in through signed license bundles — activated by OPSQAI, no reinstall,
            no seat inflation, no cloud dependency.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <OixButton variant="gold" to="/contact" withArrow>
              Request modules
            </OixButton>
            <OixButton variant="ghost" to="/pricing">
              See pricing model
            </OixButton>
          </div>
        </div>
      </section>

      {/* Motto band */}
      <MottoBand compact />

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        {categories.map((cat) => {
          const items = LICENSE_MODULE_CATALOG.filter((m) => m.category === cat);
          return (
            <div key={cat} className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-[#C9A24C]/40 to-transparent" />
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-[#C9A24C]" />
                  <h2 className="text-[11px] uppercase tracking-[0.32em] text-white/60">
                    {cat}
                  </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-[#C9A24C]/40 to-transparent" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const isBasic = basicSet.has(m.key);
                  return (
                    <Card
                      key={m.key}
                      className="group relative overflow-hidden border-white/10 bg-white/[0.02] p-6 transition-all hover:border-[#C9A24C]/40 hover:bg-white/[0.04]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute -inset-x-4 -top-4 h-24 bg-gradient-to-b from-[#C9A24C]/10 to-transparent blur-2xl" />
                      </div>
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="font-semibold text-sm text-white">{m.label}</div>
                        {isBasic ? (
                          <Badge className="border-[#0d7a5f]/40 bg-[#0d7a5f]/15 text-[10px] text-[#5fd4b3]">
                            <Check className="h-3 w-3 mr-1" /> Basic
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-[#C9A24C]/40 text-[10px] text-[#C9A24C]"
                          >
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="relative mt-3 text-xs leading-relaxed text-white/60">
                        {m.description}
                      </p>
                      <div className="relative mt-5 pt-4 border-t border-white/10 text-xs tabular-nums text-white/50">
                        {isBasic
                          ? "Included with Basic"
                          : `From €${(m.defaultPriceCents / 100).toLocaleString("de-DE")} · one-time`}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Activation */}
      <section className="border-t border-white/5 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#C9A24C]/80">
            Activation
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-light tracking-tight text-white">
            Modules dock in through{" "}
            <span className="font-serif italic text-[#C9A24C]">signed bundles.</span>
          </h2>
          <p className="mt-5 text-white/60 leading-relaxed">
            OPSQAI issues an Ed25519-signed license bundle. Your installation verifies it
            offline and unlocks the module instantly — no reinstall, no cloud call, no seat
            inflation.
          </p>
          <div className="mt-8">
            <OixButton asChild variant="primary">
              <Link to="/contact">
                Request activation <ArrowRight className="h-4 w-4" />
              </Link>
            </OixButton>
          </div>
        </div>
      </section>
    </OixLayout>
  );
}

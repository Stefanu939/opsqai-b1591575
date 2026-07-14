import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Modules</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Buy the platform once. Add modules as you grow.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI ships with a Basic bundle covering chat, knowledge base, FAQ, notifications,
          bilingual UI, and PWA. Premium modules unlock deeper capabilities and are licensed
          separately.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/contact">Request modules</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">See pricing model</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        {categories.map((cat) => {
          const items = LICENSE_MODULE_CATALOG.filter((m) => m.category === cat);
          return (
            <div key={cat} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground">{cat}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const isBasic = basicSet.has(m.key);
                  return (
                    <Card key={m.key} className="p-5 border-border/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm">{m.label}</div>
                        {isBasic ? (
                          <Badge variant="default" className="text-[10px]">
                            <Check className="h-3 w-3 mr-1" /> Basic
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Premium</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>
                      <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground tabular-nums">
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

      <section className="bg-surface-1 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Activation is handled by OPSQAI.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Modules are unlocked with signed license bundles issued by our team. Customers request
            activation from inside the product — no self-service billing, no seat inflation.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/contact">Request activation</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

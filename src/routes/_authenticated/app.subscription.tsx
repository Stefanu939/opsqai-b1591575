import { createFileRoute } from "@tanstack/react-router";
import { useLicense } from "@/lib/license";
import { LICENSE_MODULE_CATALOG, BASIC_MODULES } from "@/lib/license-modules";
import { Check, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "Subscription — OPSQAI" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const license = useLicense();
  const modules = license.state.modules ?? [];
  const active = new Set<string>([...BASIC_MODULES, ...modules]);

  const basic = LICENSE_MODULE_CATALOG.filter((m) => m.inBasic);
  const addons = LICENSE_MODULE_CATALOG.filter((m) => !m.inBasic);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Basic bundle is always included. Extra modules unlock when you purchase a license
          from OPSQAI.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Basic bundle (included)
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {basic.map((m) => (
            <li key={m.key} className="flex items-center gap-3 p-4">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Add-on modules
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {addons.map((m) => {
            const on = active.has(m.key);
            return (
              <li key={m.key} className="flex items-center gap-3 p-4">
                {on ? (
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.description}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {on ? "Active" : `€${(m.defaultPriceCents / 100).toLocaleString("de-DE")}`}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          To request an add-on, contact your OPSQAI representative or open a support ticket.
        </p>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { LICENSE_MODULE_CATALOG } from "@/lib/license-modules";

export const Route = createFileRoute("/_authenticated/app/admin/billing")({
  head: () => ({ meta: [{ title: "Billing — Mission Control" }] }),
  component: BillingPage,
});

const PRODUCT_PRICE_EUR = 15000;
const MAINTENANCE_MIN_EUR = 200;
const MAINTENANCE_MAX_EUR = 500;

function BillingPage() {
  const addons = LICENSE_MODULE_CATALOG.filter((m) => !m.inBasic);
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Billing model</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fixed one-time product price + monthly maintenance band + per-module add-ons.
          Everything else is quoted per customer.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Product (one-off)"
          value={`€${PRODUCT_PRICE_EUR.toLocaleString("de-DE")}`}
          sub="Includes on-site / remote installation, initial configuration and Basic bundle."
        />
        <Card
          title="Maintenance / month"
          value={`€${MAINTENANCE_MIN_EUR}–€${MAINTENANCE_MAX_EUR}`}
          sub="Recurring maintenance, updates and support. Set per customer in the license record."
        />
        <Card
          title="Extra modules"
          value="pay per module"
          sub="Any add-on unlocked by issuing a signed module license."
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Add-on module price list (default)
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Module</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-right px-4 py-2 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {addons.map((m) => (
                <tr key={m.key}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.description}</div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{m.category}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    €{(m.defaultPriceCents / 100).toLocaleString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Per-customer overrides and custom line items are stored on the license record when
          issuing / renewing. Defaults live in <code>src/lib/license-modules.ts</code>.
        </p>
      </section>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-2">{sub}</div>
    </div>
  );
}

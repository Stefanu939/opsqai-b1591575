import { createFileRoute } from "@tanstack/react-router";
import { LICENSE_MODULE_CATALOG, MODULE_CATALOG_VERSION } from "@/lib/license-modules";

export const Route = createFileRoute("/_authenticated/app/admin/module-catalog")({
  head: () => ({ meta: [{ title: "Module Catalog — Mission Control" }] }),
  component: ModuleCatalogPage,
});

function ModuleCatalogPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Module catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Frozen catalog v<code>{MODULE_CATALOG_VERSION}</code>. Bump the version in
          <code> src/lib/license-modules.ts</code> when adding, renaming or removing a module.
        </p>
      </header>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Key</th>
              <th className="text-left px-4 py-2 font-medium">Label</th>
              <th className="text-left px-4 py-2 font-medium">Category</th>
              <th className="text-left px-4 py-2 font-medium">Basic</th>
              <th className="text-right px-4 py-2 font-medium">Default price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {LICENSE_MODULE_CATALOG.map((m) => (
              <tr key={m.key}>
                <td className="px-4 py-2 font-mono text-xs">{m.key}</td>
                <td className="px-4 py-2">{m.label}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.category}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.inBasic ? "yes" : "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {m.defaultPriceCents === 0
                    ? "included"
                    : `€${(m.defaultPriceCents / 100).toLocaleString("de-DE")}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

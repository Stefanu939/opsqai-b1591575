// Dispatch strip: every vehicle as a tile grouped red / yellow / green by its
// worst document alert. Clicking a tile opens the vehicle in a side panel.
import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ExpiryAlert, TransportOverview, Vehicle } from "@/lib/transport/types";

type Lang = "en" | "de" | "ro";
type Band = "red" | "yellow" | "green";

const COPY: Record<Lang, { title: string; red: string; yellow: string; green: string; none: string; days: string; expired: string }> = {
  en: { title: "Dispatch", red: "Critical", yellow: "Attention", green: "OK", none: "No open document alerts.", days: "days left", expired: "expired" },
  de: { title: "Disposition", red: "Kritisch", yellow: "Achtung", green: "In Ordnung", none: "Keine offenen Dokumentwarnungen.", days: "Tage übrig", expired: "abgelaufen" },
  ro: { title: "Dispecerat", red: "Critic", yellow: "Atenție", green: "În regulă", none: "Nicio alertă de documente deschisă.", days: "zile rămase", expired: "expirat" },
};

function bandOf(alerts: ExpiryAlert[]): Band {
  if (alerts.some((a) => a.level === "expired" || a.level === "critical")) return "red";
  if (alerts.length > 0) return "yellow";
  return "green";
}

const DOT: Record<Band, string> = { red: "bg-destructive", yellow: "bg-warning", green: "bg-primary" };

export function DispatchStrip({ data, lang }: { data: TransportOverview; lang: Lang }) {
  const c = COPY[lang] ?? COPY.en;
  const [picked, setPicked] = useState<Vehicle | null>(null);

  const rows = useMemo(() => {
    const byVehicle = new Map<string, ExpiryAlert[]>();
    for (const a of data.alerts) {
      if (a.ownerKind !== "vehicle") continue;
      byVehicle.set(a.ownerId, [...(byVehicle.get(a.ownerId) ?? []), a]);
    }
    const order: Record<Band, number> = { red: 0, yellow: 1, green: 2 };
    return data.vehicles
      .map((v) => {
        const alerts = (byVehicle.get(v.id) ?? []).sort((x, y) => x.daysLeft - y.daysLeft);
        return { v, alerts, band: bandOf(alerts) };
      })
      .sort((a, b) => order[a.band] - order[b.band]);
  }, [data.alerts, data.vehicles]);

  const count = (b: Band) => rows.filter((r) => r.band === b).length;
  const active = picked ? rows.find((r) => r.v.id === picked.id) : undefined;

  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Truck className="size-4 text-muted-foreground" />
          {c.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(["red", "yellow", "green"] as Band[]).map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DOT[b]}`} />
              {c[b]} {count(b)}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {rows.map(({ v, alerts, band }) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setPicked(v)}
            className="flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[band]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{v.plate}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {alerts[0] ? alerts[0].docLabel || alerts[0].docType : [v.make, v.model].filter(Boolean).join(" ") || v.kind}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Sheet open={picked !== null} onOpenChange={(o) => !o && setPicked(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {active && (
            <>
              <SheetHeader className="text-left">
                <Badge variant={active.band === "red" ? "destructive" : "outline"} className="w-fit">
                  {c[active.band]}
                </Badge>
                <SheetTitle>{active.v.plate}</SheetTitle>
                <SheetDescription>
                  {[active.v.make, active.v.model, active.v.kind].filter(Boolean).join(" · ")}
                </SheetDescription>
              </SheetHeader>
              <ul className="mt-4 divide-y divide-border">
                {active.alerts.length === 0 ? (
                  <li className="py-4 text-sm text-muted-foreground">{c.none}</li>
                ) : (
                  active.alerts.map((a) => (
                    <li key={a.documentId} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{a.docLabel || a.docType}</span>
                        <span className="block text-xs text-muted-foreground">{a.expiresOn.slice(0, 10)}</span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {a.daysLeft < 0 ? c.expired : `${a.daysLeft} ${c.days}`}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

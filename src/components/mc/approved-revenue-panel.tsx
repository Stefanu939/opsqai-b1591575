import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { getApprovedOffersSummary } from "@/lib/crm.functions";
import { eur } from "@/lib/mc-pricing";

/** Sum of approved offers, split into one-off implementation and monthly recurring. */
export function ApprovedRevenuePanel({ enabled }: { enabled: boolean }) {
  const load = useServerFn(getApprovedOffersSummary);
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["mc-approved-offers"],
    queryFn: () => load({ data: {} } as never),
    enabled,
  });
  const t = q.data?.totals;
  const offers = q.data?.offers ?? [];
  return (
    <Panel
      title="Oferte aprobate"
      icon={BadgeCheck}
      description="Sumele din ofertele marcate „Aprobată” în CRM."
      actions={
        offers.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            Defalcare <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Implementare (o singură dată)" value={t ? eur(t.setup) : "—"} />
        <Stat label="Recurent / lună" value={t ? eur(t.monthly) : "—"} />
        <Stat label="Total primul an" value={t ? eur(t.firstYear) : "—"} strong />
      </div>
      {offers.length === 0 && !q.isLoading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nicio ofertă aprobată încă. Marchează o ofertă „Aprobată” în fișa prospectului din CRM.
        </p>
      )}
      {open && offers.length > 0 && (
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {offers.map((o) => (
            <Link
              key={o.id}
              to="/management/crm/$leadId"
              params={{ leadId: o.lead_id }}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-secondary/40"
            >
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{o.company}</span>
                <span className="block truncate text-xs text-muted-foreground">{o.title}</span>
              </span>
              <span className="text-right text-xs tabular-nums text-muted-foreground">
                {eur(o.setup)} + {eur(o.monthly)}/lună
                <span className="block font-medium text-foreground">{eur(o.firstYear)} primul an</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 tabular-nums text-foreground ${strong ? "font-display text-2xl font-semibold" : "text-lg font-medium"}`}>{value}</div>
    </div>
  );
}

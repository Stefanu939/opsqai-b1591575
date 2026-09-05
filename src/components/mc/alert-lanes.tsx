import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getMcAlerts, type McAlert } from "@/lib/mc-alerts.functions";

const LANES = [
  { key: "critical", label: "Needs action now", icon: AlertOctagon, tone: "text-destructive" },
  { key: "warning", label: "Watch list", icon: AlertTriangle, tone: "text-amber-500" },
  { key: "info", label: "For information", icon: Info, tone: "text-muted-foreground" },
] as const;

/** Control-centre alert lanes: what a colleague must do about their customers. */
export function AlertLanes() {
  const { session, loading } = useAuth();
  const fetchAlerts = useServerFn(getMcAlerts);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["mc-alerts", session?.user?.id ?? null],
    queryFn: () => fetchAlerts(),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />;
  }
  if (!data) return null;

  const total = data.counts.critical + data.counts.warning + data.counts.info;
  if (!total) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Nothing needs attention across {data.customers} customer(s).
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {LANES.map((lane) => {
        const items = data.alerts.filter((a: McAlert) => a.severity === lane.key);
        const open = expanded[lane.key];
        const shown = open ? items : items.slice(0, 4);
        const Icon = lane.icon;
        return (
          <div key={lane.key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${lane.tone}`} />
              <span className="text-sm font-medium text-foreground">{lane.label}</span>
              <Badge variant="outline" className="ml-auto tabular-nums">
                {items.length}
              </Badge>
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Clear.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {shown.map((a, i) => (
                  <li key={`${a.kind}-${a.company_id}-${i}`} className="text-xs">
                    <Link to={a.to} className="font-medium text-foreground hover:underline">
                      {a.company_name}
                    </Link>
                    <span className="ml-1 text-muted-foreground">{a.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 4 ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => setExpanded((p) => ({ ...p, [lane.key]: !p[lane.key] }))}
              >
                {open ? "Show less" : `Show all ${items.length}`}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

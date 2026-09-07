// Trend cards for the selected period. They used to sit on the overview; they
// now live in Intelligence so the overview stays about risk and today's work.
import { AlertTriangle, CalendarCheck, Inbox, LineChart } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import type { transportUi } from "@/i18n/pages/transport";
import type { TransportOverview, TransportTrend } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

function trendLabel(t: Ui, trend: TransportTrend): string {
  const delta = trend.current - trend.previous;
  const word = delta > 0 ? t.trendUp : delta < 0 ? t.trendDown : t.trendFlat;
  return `${delta > 0 ? "+" : ""}${delta} · ${word}`;
}

export function TrendsPanel({ t, data }: { t: Ui; data: TransportOverview }) {
  const c = data.counts;
  return (
    <Panel
      icon={LineChart}
      title={`${t.trends} · ${data.periodDays}d`}
      description={t.trendsBody}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label={t.openIncidents}
          value={String(c.openIncidents)}
          hint={trendLabel(t, data.trends.incidents)}
        />
        <StatCard
          icon={Inbox}
          label={t.openRequests}
          value={String(c.openRequests)}
          hint={trendLabel(t, data.trends.requests)}
        />
        <StatCard
          icon={Inbox}
          label={t.pendingApprovals}
          value={String(c.pendingApprovals)}
          hint={trendLabel(t, data.trends.approvals)}
        />
        <StatCard
          icon={CalendarCheck}
          label={t.auditScore}
          value={data.lastAudit ? `${data.lastAudit.score}/100` : "—"}
          hint={
            data.lastAudit ? new Date(data.lastAudit.created_at).toLocaleDateString() : t.noAudit
          }
        />
      </div>
    </Panel>
  );
}

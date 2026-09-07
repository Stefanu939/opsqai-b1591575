// Expiry timeline: the next 90 days grouped by month, plus what is already
// expired. It answers "what is coming at us and when" in one glance.
import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { transportUi } from "@/i18n/pages/transport";
import type { ExpiryAlert } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

interface Bucket {
  key: string;
  label: string;
  tone: "expired" | "critical" | "warning" | "watch";
  items: ExpiryAlert[];
}

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  ro: ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"],
};

export function ExpiryTimeline({
  t,
  alerts,
  lang,
}: {
  t: Ui;
  alerts: ExpiryAlert[];
  lang: "en" | "de" | "ro";
}) {
  const buckets = useMemo<Bucket[]>(() => {
    const months = MONTHS[lang] ?? MONTHS.en!;
    const expired = alerts.filter((a) => a.daysLeft < 0);
    const upcoming = alerts.filter((a) => a.daysLeft >= 0 && a.daysLeft <= 90);
    const byMonth = new Map<string, ExpiryAlert[]>();
    for (const a of upcoming) {
      const key = a.expiresOn.slice(0, 7);
      const list = byMonth.get(key) ?? [];
      list.push(a);
      byMonth.set(key, list);
    }
    const out: Bucket[] = [];
    if (expired.length) {
      out.push({ key: "expired", label: t.overdueNow, tone: "expired", items: expired });
    }
    for (const key of [...byMonth.keys()].sort()) {
      const items = byMonth.get(key)!;
      const monthIndex = Number(key.slice(5, 7)) - 1;
      const worst = items.some((i) => i.level === "critical")
        ? "critical"
        : items.some((i) => i.level === "warning")
          ? "warning"
          : "watch";
      out.push({
        key,
        label: `${months[monthIndex] ?? key} ${key.slice(0, 4)}`,
        tone: worst,
        items,
      });
    }
    return out;
  }, [alerts, lang, t.overdueNow]);

  const max = Math.max(1, ...buckets.map((b) => b.items.length));

  return (
    <Panel icon={CalendarRange} title={t.timeline} description={t.timelineBody}>
      {buckets.length === 0 ? (
        <EmptyState title={t.timelineEmpty} />
      ) : (
        <div className="grid gap-3">
          {buckets.map((b) => (
            <div key={b.key} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{b.label}</span>
                <Badge
                  variant={
                    b.tone === "expired" || b.tone === "critical"
                      ? "destructive"
                      : b.tone === "warning"
                        ? "secondary"
                        : "outline"
                  }
                  className="tabular-nums"
                >
                  {b.items.length}
                </Badge>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    b.tone === "expired" || b.tone === "critical"
                      ? "h-full rounded-full bg-destructive"
                      : b.tone === "warning"
                        ? "h-full rounded-full bg-amber-500"
                        : "h-full rounded-full bg-primary/60"
                  }
                  style={{ width: `${Math.round((b.items.length / max) * 100)}%` }}
                />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {b.items
                  .slice(0, 4)
                  .map((i) => `${i.ownerLabel} · ${i.docLabel}`)
                  .join(" · ")}
                {b.items.length > 4 ? " …" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

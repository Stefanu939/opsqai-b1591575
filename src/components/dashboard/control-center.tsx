/**
 * Control center band for the Self-Hosted operational overview.
 *
 * Shows what needs attention right now — deadlines, safety, people away,
 * upcoming events and the latest audit signals — with a one-page PDF export.
 * Fully localized (EN / DE / RO).
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Download,
  FileWarning,
  ShieldAlert,
  Sparkles,
  UserMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import {
  getControlCenter,
  exportControlCenterPdf,
  type ControlCenterItem,
} from "@/lib/control-center.functions";

type Lang = "en" | "de" | "ro";

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    eyebrow: "Control center",
    critical: "Critical",
    warning: "Needs planning",
    info: "Informational",
    deadlines: "Deadlines",
    safety: "Safety & incidents",
    absences: "People away",
    events: "Upcoming events",
    audits: "Latest audit signals",
    empty: "Nothing to report.",
    pdf: "Export PDF",
    exporting: "Preparing…",
    overdue: "overdue",
    inDays: "in {n} days",
    today: "today",
  },
  de: {
    eyebrow: "Leitstand",
    critical: "Kritisch",
    warning: "Planung nötig",
    info: "Information",
    deadlines: "Fristen",
    safety: "Sicherheit & Vorfälle",
    absences: "Abwesenheiten",
    events: "Kommende Termine",
    audits: "Letzte Audit-Signale",
    empty: "Nichts zu melden.",
    pdf: "PDF exportieren",
    exporting: "Wird erstellt…",
    overdue: "überfällig",
    inDays: "in {n} Tagen",
    today: "heute",
  },
  ro: {
    eyebrow: "Centru de control",
    critical: "Critic",
    warning: "De planificat",
    info: "Informativ",
    deadlines: "Termene limită",
    safety: "Siguranță și incidente",
    absences: "Persoane în concediu",
    events: "Evenimente apropiate",
    audits: "Ultimele semnale din audit",
    empty: "Nimic de raportat.",
    pdf: "Exportă PDF",
    exporting: "Se pregătește…",
    overdue: "depășit",
    inDays: "în {n} zile",
    today: "astăzi",
  },
};

function relative(date: string | null | undefined, c: Record<string, string>) {
  if (!date) return "";
  const days = Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d ${c.overdue}`;
  if (days === 0) return c.today;
  return (c.inDays ?? "").replace("{n}", String(days));
}

function Lane({
  title,
  icon,
  items,
  copy,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: ControlCenterItem[];
  copy: Record<string, string>;
}) {
  return (
    <Panel title={title} icon={icon} className="h-full">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
            >
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  i.severity === "critical"
                    ? "bg-destructive"
                    : i.severity === "warning"
                      ? "bg-amber-500"
                      : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.title}</div>
                {i.detail && (
                  <div className="truncate text-xs text-muted-foreground">{i.detail}</div>
                )}
              </div>
              {i.date && (
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {relative(i.date, copy)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ControlCenter() {
  const { lang } = useT();
  const l: Lang = lang === "de" ? "de" : lang === "ro" ? "ro" : "en";
  const c = COPY[l];

  const load = useServerFn(getControlCenter);
  const exportPdf = useServerFn(exportControlCenterPdf);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["control-center"], queryFn: () => load() });

  const download = async () => {
    setBusy(true);
    try {
      const res = await exportPdf();
      const bytes = Uint8Array.from(atob(res.base64), (ch) => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  const data = q.data;
  if (!data) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-sm border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" />
          {c.eyebrow}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.counts.critical > 0 ? "destructive" : "outline"}>
            {c.critical}: {data.counts.critical}
          </Badge>
          <Badge variant="secondary">
            {c.warning}: {data.counts.warning}
          </Badge>
          <Badge variant="outline">
            {c.info}: {data.counts.info}
          </Badge>
          <Button variant="outline" size="sm" onClick={download} disabled={busy}>
            <Download className="mr-2 h-4 w-4" />
            {busy ? c.exporting : c.pdf}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Lane title={c.deadlines} icon={FileWarning} items={data.deadlines} copy={c} />
        <Lane title={c.safety} icon={ShieldAlert} items={data.safety} copy={c} />
        <Lane title={c.absences} icon={UserMinus} items={data.absences} copy={c} />
        <Lane title={c.events} icon={CalendarClock} items={data.events} copy={c} />
        {data.audits.length > 0 && (
          <div className="lg:col-span-2">
            <Lane title={c.audits} icon={AlertTriangle} items={data.audits} copy={c} />
          </div>
        )}
      </div>
    </section>
  );
}

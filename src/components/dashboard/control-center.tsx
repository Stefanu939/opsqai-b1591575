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
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

const KIND_LINK: Partial<Record<ControlCenterItem["kind"], string>> = {
  academy: "/app/academy",
  event: "/app/calendar",
  absence: "/app/calendar",
  audit: "/app/audit",
};

const OPEN: Record<Lang, string> = { en: "Open module", de: "Modul öffnen", ro: "Deschide modulul" };
const ALL: Record<Lang, string> = { en: "All", de: "Alle", ro: "Toate" };

function dotClass(sev: ControlCenterItem["severity"]) {
  return sev === "critical" ? "bg-destructive" : sev === "warning" ? "bg-warning" : "bg-primary";
}

function Lane({
  title,
  icon,
  items,
  copy,
  onPick,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: ControlCenterItem[];
  copy: Record<string, string>;
  onPick: (i: ControlCenterItem) => void;
}) {
  return (
    <Panel title={title} icon={icon} className="h-full">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(i.severity)}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.title}</div>
                  {i.detail && <div className="truncate text-xs text-muted-foreground">{i.detail}</div>}
                </div>
                {i.date && (
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {relative(i.date, copy)}
                  </span>
                )}
              </button>
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
  const [filter, setFilter] = useState<ControlCenterItem["severity"] | null>(null);
  const [picked, setPicked] = useState<ControlCenterItem | null>(null);

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

  const f = (items: ControlCenterItem[]) => (filter ? items.filter((i) => i.severity === filter) : items);
  const tiles: Array<{ sev: ControlCenterItem["severity"]; label: string; n: number }> = [
    { sev: "critical", label: c.critical, n: data.counts.critical },
    { sev: "warning", label: c.warning, n: data.counts.warning },
    { sev: "info", label: c.info, n: data.counts.info },
  ];
  const link = picked ? KIND_LINK[picked.kind] : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-sm border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" />
          {c.eyebrow}
        </div>
        <div className="flex items-center gap-2">
          {filter && (
            <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>
              {ALL[l]}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={download} disabled={busy}>
            <Download className="mr-2 h-4 w-4" />
            {busy ? c.exporting : c.pdf}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.sev}
            type="button"
            aria-pressed={filter === t.sev}
            onClick={() => setFilter(filter === t.sev ? null : t.sev)}
            className={`flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filter === t.sev ? "border-foreground/40" : "border-border"
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dotClass(t.sev)}`} />
              {t.label}
            </span>
            <span className="font-display text-3xl tabular-nums">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Lane title={c.deadlines} icon={FileWarning} items={f(data.deadlines)} copy={c} onPick={setPicked} />
        <Lane title={c.safety} icon={ShieldAlert} items={f(data.safety)} copy={c} onPick={setPicked} />
        <Lane title={c.absences} icon={UserMinus} items={f(data.absences)} copy={c} onPick={setPicked} />
        <Lane title={c.events} icon={CalendarClock} items={f(data.events)} copy={c} onPick={setPicked} />
        {data.audits.length > 0 && (
          <div className="lg:col-span-2">
            <Lane title={c.audits} icon={AlertTriangle} items={f(data.audits)} copy={c} onPick={setPicked} />
          </div>
        )}
      </div>

      <Sheet open={picked !== null} onOpenChange={(o) => !o && setPicked(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {picked && (
            <>
              <SheetHeader className="text-left">
                <Badge variant={picked.severity === "critical" ? "destructive" : "outline"} className="w-fit">
                  {picked.severity === "critical" ? c.critical : picked.severity === "warning" ? c.warning : c.info}
                </Badge>
                <SheetTitle>{picked.title}</SheetTitle>
                {picked.detail && <SheetDescription>{picked.detail}</SheetDescription>}
              </SheetHeader>
              {picked.date && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {new Date(picked.date).toLocaleDateString(l)} · {relative(picked.date, c)}
                </p>
              )}
              {link && (
                <Button asChild className="mt-6">
                  <Link to={link}>{OPEN[l]}</Link>
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

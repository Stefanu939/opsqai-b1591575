import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Printer, ScrollText } from "lucide-react";
import { useT } from "@/i18n";
import { listActivityLog } from "@/lib/activity-log.functions";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({
    meta: [
      { title: "Activity log — OPSQAI" },
      { name: "description", content: "Append-only record of every important action in your OPSQAI installation." },
    ],
  }),
  component: ActivityPage,
});

const TXT = {
  ro: {
    eyebrow: "Securitate",
    title: "Jurnal de activitate",
    desc: "Fiecare acțiune importantă din instalarea ta: cine, ce, când. Înregistrările nu pot fi modificate sau șterse.",
    search: "Caută acțiune, obiect, detalii…",
    user: "Utilizator",
    from: "De la",
    to: "Până la",
    all: "Toate",
    print: "Tipărește / PDF",
    empty: "Nicio înregistrare pentru filtrele alese.",
    total: "înregistrări",
    prev: "Înapoi",
    next: "Înainte",
    system: "Sistem",
    failed: "eșuat",
    details: "Detalii înregistrare",
  },
  en: {
    eyebrow: "Security",
    title: "Activity log",
    desc: "Every important action in your installation: who, what, when. Entries cannot be changed or deleted.",
    search: "Search action, object, details…",
    user: "User",
    from: "From",
    to: "To",
    all: "All",
    print: "Print / PDF",
    empty: "No entries for the selected filters.",
    total: "entries",
    prev: "Previous",
    next: "Next",
    system: "System",
    failed: "failed",
    details: "Entry details",
  },
  de: {
    eyebrow: "Sicherheit",
    title: "Aktivitätsprotokoll",
    desc: "Jede wichtige Aktion in Ihrer Installation: wer, was, wann. Einträge können nicht geändert oder gelöscht werden.",
    search: "Aktion, Objekt, Details suchen…",
    user: "Benutzer",
    from: "Von",
    to: "Bis",
    all: "Alle",
    print: "Drucken / PDF",
    empty: "Keine Einträge für die gewählten Filter.",
    total: "Einträge",
    prev: "Zurück",
    next: "Weiter",
    system: "System",
    failed: "fehlgeschlagen",
    details: "Eintragsdetails",
  },
} as const;

const PAGE = 50;
const SEVERITIES = ["info", "warning", "critical"] as const;

function ActivityPage() {
  const { lang } = useT();
  const L = TXT[lang as keyof typeof TXT] ?? TXT.ro;
  const list = useServerFn(listActivityLog);
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number] | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const filters = {
    q: q || undefined,
    actor: actor || undefined,
    severity: severity || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: PAGE,
    offset,
  };
  const data = useQuery({
    queryKey: ["activity-log", filters],
    queryFn: () => list({ data: filters }),
  });
  const items = data.data?.items ?? [];
  const total = data.data?.total ?? 0;
  const selected = items.find((i) => i.id === open) ?? null;

  return (
    <ModulePage
      eyebrow={L.eyebrow}
      title={L.title}
      description={L.desc}
      actions={
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          {L.print}
        </Button>
      }
    >
      <Panel>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_auto_auto_auto]">
          <Input placeholder={L.search} value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} />
          <Input placeholder={L.user} value={actor} onChange={(e) => { setActor(e.target.value); setOffset(0); }} />
          <Input type="date" aria-label={L.from} value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} />
          <Input type="date" aria-label={L.to} value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} />
          <div className="flex gap-1">
            {(["", ...SEVERITIES] as const).map((s) => (
              <Button
                key={s || "all"}
                size="sm"
                variant={severity === s ? "default" : "ghost"}
                onClick={() => { setSeverity(s); setOffset(0); }}
              >
                {s || L.all}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {data.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.error ? (
            <p className="text-sm text-destructive">{(data.error as Error).message}</p>
          ) : items.length === 0 ? (
            <EmptyState icon={ScrollText} title={L.empty} />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(r.id)}
                    className="grid w-full grid-cols-[150px_1fr_auto] items-center gap-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(r.at).toLocaleString()}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{r.action}</span>
                      {r.target ? (
                        <span className="ml-2 truncate text-muted-foreground">{r.target}</span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        {r.actorName || r.actorEmail || L.system}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      {r.severity && r.severity !== "info" ? (
                        <Badge variant="destructive">{r.severity}</Badge>
                      ) : null}
                      {r.success === false ? <Badge variant="destructive">{L.failed}</Badge> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total} {L.total}
          </span>
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              {L.prev}
            </Button>
            <Button size="sm" variant="ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
              {L.next}
            </Button>
          </div>
        </div>
      </Panel>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{L.details}</SheetTitle>
            <SheetDescription>{selected ? new Date(selected.at).toLocaleString() : ""}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">{L.user}: </span>{selected.actorName || selected.actorEmail || L.system}</div>
              <div className="font-medium">{selected.action}</div>
              {selected.target ? <div className="break-all text-muted-foreground">{selected.target}</div> : null}
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(JSON.parse(selected.detail), null, 2)}
              </pre>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </ModulePage>
  );
}

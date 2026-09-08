// OPSQAI HR — HR Intelligence: grounded assistant + deterministic employee signals + workspace overview.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Brain, MessageSquare, Send, Users } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { askHrAssistant } from "@/lib/hr-ws.functions";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrIntelligence, useHrLang } from "./use-hr-ws";
import { StatCell } from "./shared";

export function IntelligenceSection({ w }: { w: HrWsUi }) {
  const query = useHrIntelligence();
  const language = useHrLang();
  const ask = useServerFn(askHrAssistant);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [term, setTerm] = useState("");

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.intelligence} description={(query.error as Error).message} />;
  const { signals: s, insights } = query.data!;
  const sigLabel = (k: string) =>
    (w.signals as Record<string, string>)[k] ?? k;
  const people = insights
    .filter((p) => p.signals.length > 0)
    .filter((p) => `${p.name} ${p.employee_no}`.toLowerCase().includes(term.toLowerCase()));

  const submit = () => {
    const question = q.trim();
    if (question.length < 3 || busy) return;
    setBusy(true);
    void ask({ data: { question, language } })
      .then((r) => {
        setHistory((h) => [{ q: question, a: r.answer }, ...h].slice(0, 20));
        setQ("");
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };

  const cards: Array<{ label: string; value: number; slug: string; tone?: "critical" | "warn" }> = [
    { label: w.openRequests, value: s.openRequests, slug: "requests" },
    { label: w.policiesPendingAck, value: s.policiesPendingAck, slug: "policies", tone: s.policiesPendingAck > 0 ? "warn" : undefined },
    { label: w.trainingsExpired, value: s.trainingsExpired, slug: "training", tone: s.trainingsExpired > 0 ? "critical" : undefined },
    { label: w.trainingsPlanned, value: s.trainingsPlanned, slug: "training" },
    { label: w.complianceOpen, value: s.complianceOpen, slug: "compliance" },
    { label: w.complianceOverdue, value: s.complianceOverdue, slug: "compliance", tone: s.complianceOverdue > 0 ? "critical" : undefined },
    { label: w.positionChanges, value: s.positionChanges90d, slug: "lifecycle" },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to="/app/products/hr/$workspace" params={{ workspace: c.slug }} className="block">
            <StatCell label={c.label} value={c.value} tone={c.tone} />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel icon={MessageSquare} title={w.assistant} description={w.assistantHint}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input value={q} placeholder={w.assistantPlaceholder} onChange={(e) => setQ(e.target.value)} disabled={busy} />
            <Button type="submit" disabled={busy || q.trim().length < 3}>
              <Send className="mr-1.5 size-4" /> {w.ask}
            </Button>
          </form>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{w.qaHistory}: —</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {history.map((h, i) => (
                <li key={`${i}-${h.q}`} className="grid gap-1.5">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{h.q}</div>
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border/60 bg-card px-3 py-2 text-sm">{h.a}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Users}
          title={w.employeeIntelligence}
          actions={<Input className="h-8 w-44" placeholder={w.searchEmployee} value={term} onChange={(e) => setTerm(e.target.value)} />}
        >
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">{w.noSignals}</p>
          ) : (
            <ul className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
              {people.slice(0, 100).map((p) => (
                <li key={p.id} className="rounded-lg border border-border/60 bg-card/50 p-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={p.attention >= 5 ? "destructive" : p.attention >= 3 ? "default" : "secondary"}>{w.attention} {p.attention}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.employee_no} · {p.name}</span>
                    <Button asChild size="sm" variant="ghost" className="h-7">
                      <Link to="/app/products/hr/$workspace" params={{ workspace: "employees" }}>
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.signals.map((sg) => (
                      <span
                        key={sg.key}
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          sg.level === "critical" ? "bg-destructive/15 text-destructive" : sg.level === "warning" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {sigLabel(sg.key)}{sg.value > 1 ? ` ×${sg.value}` : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={Brain} title={w.workspaces}>
        <p className="text-sm text-muted-foreground">{w.assistantHint}</p>
      </Panel>
    </div>
  );
}

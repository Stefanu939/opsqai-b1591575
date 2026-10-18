import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Brain, Copy, Eye, Megaphone, Search } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KaiRichMessage } from "@/components/kai/kai-rich-message";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { PROSPECT_SESSION_MESSAGES } from "@/lib/prospect-limits";
import {
  analyzeProspectSession,
  listProspectSessions,
  type ProspectSessionRow,
} from "@/lib/prospect-chat.functions";

export const Route = createFileRoute("/_authenticated/management/crm/prospects")({
  head: () => ({
    meta: [
      { title: "Prospect Radar — OPSQAI Management Center" },
      { name: "description", content: "Conversațiile prospecților cu Kai: transcript complet, durată, întrebări și mesaje de recuperare." },
      { property: "og:title", content: "Prospect Radar — OPSQAI Management Center" },
      { property: "og:description", content: "Ce au discutat prospecții cu Kai și cum îi recuperăm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProspectRadar,
});

type Status = "converted" | "exploring" | "gate";
const STATUS: Record<Status, { label: string; cls: string }> = {
  converted: { label: "Convertit", cls: "border-success/40 bg-success/10 text-success" },
  exploring: { label: "Conectat — fără acțiune", cls: "border-warning/40 bg-warning/10 text-warning" },
  gate: { label: "Abandonat la login", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
};
const INTEREST: Record<string, string> = { hot: "🔥 Fierbinte", warm: "🟡 Mediu", cold: "❄️ Rece" };

function statusOf(s: ProspectSessionRow): Status {
  if (s.converted_at) return "converted";
  if (s.user_id) return "exploring";
  return "gate";
}
function dur(a: string, b: string) {
  const sec = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000));
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)} min ${sec % 60}s`;
}
const fmt = (d: string) => new Date(d).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
const transcriptText = (s: ProspectSessionRow) =>
  s.messages.map((m) => `[${fmt(m.at)}] ${m.role === "user" ? "Prospect" : "Kai"}: ${m.content.replace("[[CONTACT_FORM]]", "").trim()}`).join("\n\n");

function ProspectRadar() {
  const { session, loading } = useAuth();
  const list = useServerFn(listProspectSessions);
  const { data, isLoading } = useQuery({
    queryKey: ["prospect-sessions"],
    queryFn: () => list(),
    enabled: !loading && Boolean(session?.user?.id),
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const sessions = data?.sessions ?? [];
  const counts = useMemo(() => {
    const c = { converted: 0, exploring: 0, gate: 0 };
    sessions.forEach((s) => c[statusOf(s)]++);
    return c;
  }, [sessions]);
  const shown = sessions.filter((s) => {
    if (filter !== "all" && statusOf(s) !== filter) return false;
    const hay = `${s.email ?? ""} ${s.messages.map((m) => m.content).join(" ")}`.toLowerCase();
    return !q.trim() || hay.includes(q.toLowerCase());
  });
  const open = sessions.find((s) => s.id === openId) ?? null;

  return (
    <ModulePage eyebrow="Management Center · CRM" title="Prospect Radar" description="Tot ce au discutat vizitatorii cu Kai în Prospect Mode.">
      <div className="grid gap-3 sm:grid-cols-4">
        {([["all", "Toate", sessions.length], ["converted", "Convertiți", counts.converted], ["exploring", "Conectați fără acțiune", counts.exploring], ["gate", "Abandonați la login", counts.gate]] as const).map(([k, label, n]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("rounded-xl border bg-card p-4 text-left transition", filter === k ? "border-primary" : "border-border hover:border-primary/50")}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-display text-2xl font-semibold">{n}</div>
          </button>
        ))}
      </div>
      <Panel title="Sesiuni">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Caută email sau text din conversație…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : !shown.length ? (
          <p className="text-sm text-muted-foreground">Nicio conversație încă.</p>
        ) : (
          <div className="divide-y divide-border">
            {shown.map((s) => {
              const st = STATUS[statusOf(s)];
              const first = s.messages.find((m) => m.role === "user")?.content ?? "";
              return (
                <div key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.email ?? "Vizitator anonim"}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", st.cls)}>{st.label}</span>
                      {s.analysis && <span className="text-xs">{INTEREST[s.analysis.interest]}</span>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">„{first}”</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(s.started_at)} · {dur(s.started_at, s.last_message_at)} · {s.user_message_count}/{PROSPECT_SESSION_MESSAGES} mesaje
                      {s.converted_at && ` · a cerut pilot după ${dur(s.started_at, s.converted_at)}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>
                    <Eye className="mr-1 h-4 w-4" /> Vezi conversația
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <ConversationDialog s={open} onClose={() => setOpenId(null)} />
    </ModulePage>
  );
}

function ConversationDialog({ s, onClose }: { s: ProspectSessionRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeProspectSession);
  const [busy, setBusy] = useState(false);
  if (!s) return null;
  const a = s.analysis;
  const run = async () => {
    setBusy(true);
    try {
      await analyze({ data: { id: s.id } });
      await qc.invalidateQueries({ queryKey: ["prospect-sessions"] });
    } catch {
      toast.error("Kai nu a putut analiza conversația acum.");
    } finally {
      setBusy(false);
    }
  };
  const copy = (t: string) => { void navigator.clipboard.writeText(t); toast.success("Copiat"); };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{s.email ?? "Vizitator anonim"}</DialogTitle>
          <DialogDescription>
            {fmt(s.started_at)} · durată {dur(s.started_at, s.last_message_at)} · {s.user_message_count} întrebări
            {s.login_gate_at && ` · login cerut după ${dur(s.started_at, s.login_gate_at)}`}
            {s.converted_at && ` · pilot cerut după ${dur(s.started_at, s.converted_at)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          {a ? (
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">{INTEREST[a.interest]}</span> — {a.summary}</p>
              {!!a.questions.length && <div><p className="text-xs uppercase text-muted-foreground">Întrebări puse</p><ul className="list-disc pl-5">{a.questions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
              {!!a.suggestions.length && <div><p className="text-xs uppercase text-muted-foreground">Ce a sugerat Kai</p><ul className="list-disc pl-5">{a.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
              <p><span className="text-xs uppercase text-muted-foreground">Blocaj: </span>{a.blocker}</p>
              <div className="rounded-lg border border-primary/30 bg-card p-2">
                <p className="text-xs uppercase text-muted-foreground">Mesaj de recuperare</p>
                <p className="whitespace-pre-wrap">{a.winback}</p>
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => copy(a.winback)}><Copy className="mr-1 h-4 w-4" /> Copiază</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Kai poate rezuma interesul, întrebările, sugestiile, blocajul și un mesaj de recuperare.</p>
          )}
          <Button size="sm" className="mt-2" onClick={run} disabled={busy}>
            <Brain className="mr-1 h-4 w-4" /> {busy ? "Analizez…" : a ? "Reanalizează" : "Analizează cu Kai"}
          </Button>
        </div>

        <div className="space-y-3">
          {s.messages.map((m, i) => {
            const content = m.content.replace("[[CONTACT_FORM]]", "").trim();
            return (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div className={cn("max-w-[88%] break-words rounded-xl px-3.5 py-2.5 text-sm", m.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "border border-border bg-card")}>
                  {m.role === "user" ? content : <KaiRichMessage content={content} />}
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">{m.role === "user" ? "Prospect" : "Kai"} · {fmt(m.at)}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button size="sm" asChild>
            <Link to="/management/sales" search={{ company: "", contact: "", phone: "", email: s.email ?? "", notes: (a ? `${a.summary}\nBlocaj: ${a.blocker}` : transcriptText(s)).slice(0, 1500) }}>
              <Megaphone className="mr-1 h-4 w-4" /> Trimite în Sales Cockpit
            </Link>
          </Button>
          {s.crm_lead_id && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/management/crm/$leadId" params={{ leadId: s.crm_lead_id }}>Deschide lead-ul CRM</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => copy(transcriptText(s))}>
            <Copy className="mr-1 h-4 w-4" /> Copiază transcript
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, HelpCircle, Users, Package, Truck, FileText, ShieldAlert, ArrowDownToLine, ArrowUpFromLine, Route as RouteIcon, ClipboardList, AlertTriangle, Check } from "lucide-react";
import { createThread } from "@/lib/threads.functions";
import { useServerFn } from "@tanstack/react-start";
import { listPendingCriticalSops, acknowledgeSop } from "@/lib/sop-ack.functions";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

interface Stats {
  conversationsToday: number;
  totalDocs: number;
  totalFaqs: number;
  totalUsers: number;
}
interface RecentThread { id: string; title: string; updated_at: string }

function Dashboard() {
  const { t, lang } = useT();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const newThread = useServerFn(createThread);
  const [stats, setStats] = useState<Stats>({ conversationsToday: 0, totalDocs: 0, totalFaqs: 0, totalUsers: 0 });
  const [threads, setThreads] = useState<RecentThread[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [tRes, dRes, fRes, uRes, recent] = await Promise.all([
        supabase.from("threads").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("knowledge_documents").select("id", { count: "exact", head: true }),
        supabase.from("faqs").select("id", { count: "exact", head: true }),
        (isAdmin ? supabase.from("profiles").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 } as { count: number | null })) as Promise<{ count: number | null }>,
        supabase.from("threads").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(5),
      ]);
      setStats({
        conversationsToday: tRes.count ?? 0,
        totalDocs: dRes.count ?? 0,
        totalFaqs: fRes.count ?? 0,
        totalUsers: (uRes as { count: number | null }).count ?? 0,
      });
      setThreads(recent.data ?? []);
    };
    load();
  }, [isAdmin]);

  const quickPrompts = [
    { icon: ArrowDownToLine, label: t("inbound") },
    { icon: ArrowUpFromLine, label: t("outbound") },
    { icon: Truck, label: t("loading") },
    { icon: FileText, label: t("cmr") },
    { icon: Package, label: t("processes") },
    { icon: RouteIcon, label: t("transport") },
    { icon: ShieldAlert, label: t("safety") },
    { icon: ClipboardList, label: t("internal") },
  ];

  const startChat = async (seed?: string) => {
    const title = seed ? seed.slice(0, 60) : (lang === "de" ? "Neue Unterhaltung" : "New conversation");
    const thread = await newThread({ data: { title } });
    navigate({ to: "/app/chat/$threadId", params: { threadId: thread.id }, search: seed ? { q: seed } : {} });
  };

  const kpis = [
    { label: t("conversations") + " · " + t("today"), value: stats.conversationsToday, icon: MessageSquare },
    { label: t("documents"), value: stats.totalDocs, icon: BookOpen },
    { label: t("faqs"), value: stats.totalFaqs, icon: HelpCircle },
    ...(isAdmin ? [{ label: t("activeUsers"), value: stats.totalUsers, icon: Users }] : []),
  ];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Operations Dashboard</h1>
        <p className="text-muted-foreground mt-1">{t("askAnything")}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-5 hover:shadow-md transition-shadow border-border/60">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">{k.label}</div>
                <div className="text-3xl font-semibold tracking-tight mt-1 tabular-nums">{k.value}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CriticalSopBanner />

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("quickStart")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => startChat(lang === "de" ? `Erzähl mir mehr über ${p.label}` : `Tell me more about ${p.label}`)}
              className="group text-left rounded-lg border border-border bg-card p-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <p.icon className="h-5 w-5 text-primary mb-3" />
              <div className="text-sm font-medium leading-tight">{p.label}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("recentChats")}</h2>
          <Button size="sm" onClick={() => startChat()}>{t("newChat")}</Button>
        </div>
        {threads.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{t("noThreads")}</Card>
        ) : (
          <Card className="divide-y divide-border">
            {threads.map((th) => (
              <Link key={th.id} to="/app/chat/$threadId" params={{ threadId: th.id }} className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{th.title}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{new Date(th.updated_at).toLocaleString()}</div>
                </div>
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function CriticalSopBanner() {
  const list = useServerFn(listPendingCriticalSops);
  const ack = useServerFn(acknowledgeSop);
  const [pending, setPending] = useState<Array<{ id: string; title: string; doc_code: string | null; version: number }>>([]);
  const load = async () => { try { const { pending } = await list(); setPending(pending); } catch { /* noop */ } };
  useEffect(() => { load(); }, []);
  const onAck = async (id: string, version: number) => {
    try { await ack({ data: { document_id: id, version } }); load(); } catch (e) { console.error(e); }
  };
  if (pending.length === 0) return null;
  return (
    <Card className="mb-6 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Critical SOPs awaiting acknowledgement</div>
          <p className="text-xs text-muted-foreground mt-0.5">Please confirm you've read each procedure below.</p>
          <ul className="mt-3 space-y-2">
            {pending.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                <div className="min-w-0 text-sm truncate">
                  {d.doc_code && <span className="font-mono text-[10px] text-muted-foreground mr-2">{d.doc_code}</span>}
                  {d.title} <span className="text-[10px] text-muted-foreground">v{d.version}</span>
                </div>
                <Button size="sm" variant="outline" className="h-7" onClick={() => onAck(d.id, d.version)}>
                  <Check className="h-3 w-3 mr-1" /> Acknowledge
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}


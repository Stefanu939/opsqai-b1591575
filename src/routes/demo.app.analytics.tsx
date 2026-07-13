import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import {
  BarChart3,
  Activity,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/demo/app/analytics")({
  component: DemoAnalyticsPage,
});

type AudRow = {
  module: string | null;
  action: string | null;
  question: string;
  created_at: string;
};
type Msg = { confidence: number | null };

function DemoAnalyticsPage() {
  const [audit, setAudit] = useState<AudRow[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [docs, setDocs] = useState<number>(0);
  const [faqs, setFaqs] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(87);

  useEffect(() => {
    (async () => {
      const [a, m, d, f, ai] = await Promise.all([
        supabase
          .from("audit_log")
          .select("module,action,question,created_at")
          .eq("company_id", DEMO_COMPANY_ID),
        supabase
          .from("messages")
          .select("confidence")
          .eq("company_id", DEMO_COMPANY_ID)
          .eq("role", "assistant")
          .not("confidence", "is", null),
        supabase
          .from("knowledge_documents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", DEMO_COMPANY_ID)
          .eq("is_active", true),
        supabase
          .from("faqs")
          .select("id", { count: "exact", head: true })
          .eq("company_id", DEMO_COMPANY_ID),
        supabase
          .from("ai_audits")
          .select("score")
          .eq("company_id", DEMO_COMPANY_ID)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setAudit((a.data ?? []) as AudRow[]);
      setMsgs((m.data ?? []) as Msg[]);
      setDocs(d.count ?? 0);
      setFaqs(f.count ?? 0);
      if (ai.data && ai.data[0]) setAiScore(Number(ai.data[0].score));
    })();
  }, []);

  const askCount = audit.filter((r) => r.module === "chat" && r.action === "ask").length;
  const knowledgeEvents = audit.filter((r) => r.module === "knowledge").length;
  const academyCompletions = audit.filter(
    (r) => r.module === "academy" && r.action === "lesson_completed",
  ).length;
  const confidences = msgs.map((m) => Number(m.confidence)).filter((n) => Number.isFinite(n));
  const avgConf = confidences.length
    ? confidences.reduce((s, n) => s + n, 0) / confidences.length
    : 0.94;

  // top questions (naive: count normalized question)
  const bucket = new Map<string, number>();
  audit
    .filter((r) => r.module === "chat")
    .forEach((r) => bucket.set(r.question, (bucket.get(r.question) ?? 0) + 1));
  const topQuestions = Array.from(bucket.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
        <BarChart3 className="h-3.5 w-3.5" /> Analytics
      </div>
      <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
        Operational intelligence
      </h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        AI performance, knowledge coverage, onboarding progress and audit readiness — in one
        dashboard.
      </p>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <Kpi label="AI questions" value={askCount} icon={MessageSquare} sub="last 60 days" />
        <Kpi
          label="AI confidence"
          value={`${Math.round(avgConf * 100)}%`}
          icon={TrendingUp}
          sub="assistant avg."
        />
        <Kpi
          label="Knowledge events"
          value={knowledgeEvents}
          icon={ShieldCheck}
          sub="uploads / updates / approvals"
        />
        <Kpi
          label="Academy completions"
          value={academyCompletions}
          icon={GraduationCap}
          sub="lessons finished"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> AI Audit
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl font-bold tabular-nums">{aiScore}</div>
            <div className="text-xs text-muted-foreground">
              / 100 · <span className="text-primary font-medium">Mature</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${aiScore}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Critical SOPs reviewed within 90 days. Damage-handling coverage comprehensive. Two minor
            gaps in cold-chain onboarding coverage.
          </p>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Coverage
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Knowledge documents</span>
              <span className="font-medium">{docs}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">FAQ entries</span>
              <span className="font-medium">{faqs}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Assistant answers with sources</span>
              <span className="font-medium">100%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Departments covered</span>
              <span className="font-medium">4 / 4</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Top questions asked
        </h2>
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-border/60">
            {topQuestions.map(([q, count]) => {
              const max = topQuestions[0]?.[1] ?? 1;
              return (
                <li key={q} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{q}</div>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">×{count}</div>
                </li>
              );
            })}
            {topQuestions.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground text-center">Loading…</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  );
}

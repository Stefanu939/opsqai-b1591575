import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID, DEMO_COMPANY_NAME } from "@/lib/demo/session";
import { Sparkles, MessageSquare, BookOpen, HelpCircle, GraduationCap, BarChart3, Activity, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/demo/app/")({
  component: DemoOverview,
});

type Kpis = { docs: number; faqs: number; audits: number; people: number; avgConfidence: number };

function DemoOverview() {
  const [k, setK] = useState<Kpis>({ docs: 0, faqs: 0, audits: 0, people: 0, avgConfidence: 0.94 });

  useEffect(() => {
    (async () => {
      const [d, f, a, p, msgs] = await Promise.all([
        supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("company_id", DEMO_COMPANY_ID).eq("is_active", true),
        supabase.from("faqs").select("id", { count: "exact", head: true }).eq("company_id", DEMO_COMPANY_ID),
        supabase.from("audit_log").select("id", { count: "exact", head: true }).eq("company_id", DEMO_COMPANY_ID),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", DEMO_COMPANY_ID),
        supabase.from("messages").select("confidence").eq("company_id", DEMO_COMPANY_ID).eq("role", "assistant").not("confidence", "is", null),
      ]);
      const confs = (msgs.data ?? []).map((m: { confidence: number | null }) => Number(m.confidence)).filter((n) => Number.isFinite(n));
      const avg = confs.length ? confs.reduce((s, n) => s + n, 0) / confs.length : 0.94;
      setK({
        docs: d.count ?? 0,
        faqs: f.count ?? 0,
        audits: a.count ?? 0,
        people: p.count ?? 0,
        avgConfidence: Math.round(avg * 100) / 100,
      });
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Operations Overview
        </div>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">{DEMO_COMPANY_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Enterprise AI Platform · Knowledge Governance · Onboarding · Audit & Compliance — all on one governed platform.
        </p>
      </header>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Kpi label="Documents"      value={k.docs} sub="SOPs / policies / WI" />
        <Kpi label="FAQ entries"    value={k.faqs} sub="EN / DE bilingual" />
        <Kpi label="Audit events"   value={k.audits} sub="last 60 days" />
        <Kpi label="People"         value={k.people} sub="across 4 departments" />
        <Kpi label="AI confidence"  value={`${Math.round(k.avgConfidence * 100)}%`} sub="assistant avg." />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Suggested exploration</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tour to="/demo/app/chat"      icon={MessageSquare}  step={1} title="Ask the AI"           desc='Try: "What do I do with a damaged pallet on arrival?"' />
          <Tour to="/demo/app/knowledge" icon={BookOpen}       step={2} title="Browse the Knowledge Base" desc="See how SOPs, policies, and work instructions are governed." />
          <Tour to="/demo/app/analytics" icon={BarChart3}      step={3} title="Open Analytics"       desc="AI health, confidence, gaps, and top questions." />
          <Tour to="/demo/app/audit"     icon={Activity}       step={4} title="Review the audit log" desc="60 days of realistic operational activity." />
          <Tour to="/demo/app/academy"   icon={GraduationCap}  step={5} title="Browse the Academy"   desc="A published onboarding path with 3 chapters." />
          <Tour to="/demo/app/faq"       icon={HelpCircle}     step={6} title="Read the FAQ"         desc="Bilingual quick answers tied to SOPs." />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold">Recent AI Audit</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-3xl font-bold tracking-tight">87</div>
            <div className="text-xs text-muted-foreground">/ 100 · <span className="text-primary font-medium">Mature</span></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Critical SOPs reviewed within 90 days. Damage-handling coverage is comprehensive. Academy completion above target.
          </p>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold">Read-only demo</div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Everything is viewable. Any create / edit / delete / invite / upload / export attempt will show you what that action does in your own OPSQAI workspace — with full RBAC and audit trail.
          </p>
          <Link to="/contact" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Book a demo for your organization <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  );
}
function Tour({ to, icon: Icon, step, title, desc }: { to: string; icon: React.ElementType; step: number; title: string; desc: string }) {
  return (
    <Link to={to} className="group">
      <Card className="p-4 h-full hover:border-primary/40 transition">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-semibold">{step}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon className="h-3.5 w-3.5 text-primary" /> {title}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

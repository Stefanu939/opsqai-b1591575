import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Sparkles,
  ShieldCheck,
  Clock,
  BookOpen,
  GraduationCap,
  Activity,
  Users,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { startDemoSession, useDemoSession } from "@/lib/demo/session";

export const Route = createFileRoute("/demo/")({
  head: () => ({
    meta: [
      { title: "OPSQAI Interactive Demo — Explore a live enterprise workspace" },
      {
        name: "description",
        content:
          "Step into a fully-configured enterprise OPSQAI workspace. Explore AI chat, knowledge governance, onboarding, analytics and audit — for 15 minutes, no signup required.",
      },
      { property: "og:title", content: "OPSQAI Interactive Demo" },
      {
        property: "og:description",
        content:
          "Explore a live, read-only enterprise OPSQAI workspace populated with real logistics operations data.",
      },
      { property: "og:url", content: "https://opsqai.de/demo" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/demo" }],
  }),
  component: DemoWelcomePage,
});

const MODULES = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Ask any operational question — answered from Atlas Logistics' own SOPs.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    desc: "8 governed SOPs, policies and work instructions.",
  },
  {
    icon: GraduationCap,
    title: "Academy",
    desc: "A published onboarding path with chapters and lessons.",
  },
  {
    icon: Activity,
    title: "Analytics & Audit",
    desc: "60 days of operational activity and an AI Audit at 87/100.",
  },
  { icon: Users, title: "People & Roles", desc: "5 roles across 4 warehouse departments." },
  {
    icon: ShieldCheck,
    title: "Governance",
    desc: "See how enterprise permissions and audit trails work.",
  },
];

function DemoWelcomePage() {
  const navigate = useNavigate();
  const { active } = useDemoSession();

  useEffect(() => {
    if (active) navigate({ to: "/demo/app", replace: true });
  }, [active, navigate]);

  const launch = () => {
    startDemoSession();
    navigate({ to: "/demo/app" });
  };

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Interactive Demo
        </div>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
          Welcome to the OPSQAI Interactive Demo
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
          This demo contains a fictional logistics company populated with realistic operational
          data. Everything you see is fully functional but read-only. Explore how AI, knowledge
          management, onboarding, governance and audit readiness work together inside a modern
          enterprise platform.
        </p>

        <Card className="mt-6 p-5 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">Atlas Logistics GmbH</div>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                A mid-sized European logistics operator running Inbound, Outbound, Safety & QC, and
                Fleet operations. Nine months of documented SOPs, 60 days of audit history, and an
                AI Audit at score 87/100.
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Card key={m.title} className="p-4">
              <m.icon className="h-4 w-4 text-primary mb-2" />
              <div className="text-sm font-semibold">{m.title}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</div>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={launch} className="gap-2">
            Launch Demo Workspace <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Estimated tour: 12–15 minutes
          </span>
        </div>

        <p className="mt-6 text-xs text-muted-foreground max-w-2xl leading-relaxed">
          The Interactive Demo is a public preview — no signup required. Every action that would
          modify data is blocked; you'll see a short explanation of what that action would do in
          your own workspace.
        </p>
      </section>
    </MarketingLayout>
  );
}

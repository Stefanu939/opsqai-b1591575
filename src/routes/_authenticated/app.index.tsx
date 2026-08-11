import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BookOpen,
  Users,
  Building2,
  MessageSquare,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getDashboardOverview } from "@/lib/dashboard-overview.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — OPSQAI" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  loader: async ({ context }) => {
    // Peek at the overview server-side; if non-empty send the user to chat.
    try {
      const overview = await getDashboardOverview();
      if (!overview.isEmpty) {
        throw redirect({ to: "/app/chat" });
      }
      // Prime the query cache for instant render.
      (context as { queryClient: { setQueryData: (k: unknown, v: unknown) => void } })
        .queryClient?.setQueryData(["dashboard-overview"], overview);
      return overview;
    } catch (e) {
      if ((e as { isRedirect?: boolean }).isRedirect) throw e;
      // If the probe fails (misconfig), fall through to chat.
      throw redirect({ to: "/app/chat" });
    }
  },
  component: Dashboard,
});

type CardId = "upload" | "sops" | "invite" | "departments" | "chat";

const DISMISS_KEY = "opsqai.dashboard.dismissed.v1";

function readDismissed(): Set<CardId> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as CardId[]);
  } catch {
    return new Set();
  }
}

function Dashboard() {
  const call = useServerFn(getDashboardOverview);
  const { data } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => call(),
  });

  const [dismissed, setDismissed] = useState<Set<CardId>>(new Set());
  useEffect(() => setDismissed(readDismissed()), []);

  const dismiss = (id: CardId) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const name =
    (data?.displayName || "").trim().split(/\s+/)[0] || "there";
  const company = (data?.companyName || "").trim();

  const cards: {
    id: CardId;
    icon: typeof FileText;
    title: string;
    body: string;
    cta: string;
    to: string;
  }[] = [
    {
      id: "upload",
      icon: FileText,
      title: "Upload your first document",
      body: "Add a PDF, Word doc, or spreadsheet to your Knowledge Base and OPSQAI will ground answers on it.",
      cta: "Upload",
      to: "/app/knowledge",
    },
    {
      id: "sops",
      icon: BookOpen,
      title: "Import your SOPs",
      body: "Bring standard operating procedures in one place, versioned and searchable.",
      cta: "Import",
      to: "/app/knowledge",
    },
    {
      id: "invite",
      icon: Users,
      title: "Invite your team",
      body: "Give supervisors, managers and workers access with role-based permissions.",
      cta: "Invite",
      to: "/app/users",
    },
    {
      id: "departments",
      icon: Building2,
      title: "Set up departments",
      body: "Group people and documents by department for cleaner routing and reporting.",
      cta: "Configure",
      to: "/app/organization",
    },
    {
      id: "chat",
      icon: MessageSquare,
      title: "Chat with AI",
      body: "Ask a question — even before you upload docs — to see how grounded answers look.",
      cta: "Open chat",
      to: "/app/chat",
    },
  ];

  const visible = cards.filter((c) => !dismissed.has(c.id));

  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-line bg-gold-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold">
          <Sparkles className="h-3 w-3" />
          Get started
        </div>
        <PageHeader
          title={`Welcome to OPSQAI, ${name}`}
          description={
            (company ? `Your ${company} workspace is ready. ` : "Your workspace is ready. ") +
            "Complete the steps below to get the most out of your platform."
          }
          className="mt-4"
        />
      </div>

      {/* Onboarding cards */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {!data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5 border-border/60 space-y-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="You're all set"
            description="Nothing left to do here — head over to chat to start working."
            action={
              <Button asChild>
                <Link to="/app/chat">
                  Open chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <Card
                key={c.id}
                className="relative p-5 border-border/60 flex flex-col group hover:border-gold-line/60 transition-colors"
              >
                <button
                  type="button"
                  aria-label={`Dismiss ${c.title}`}
                  onClick={() => dismiss(c.id)}
                  className="absolute right-2 top-2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="h-9 w-9 rounded-md bg-gold-soft border border-gold-line flex items-center justify-center">
                  <c.icon className="h-4 w-4 text-gold" />

                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed flex-1">
                  {c.body}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                  <Link to={c.to}>{c.cta}</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

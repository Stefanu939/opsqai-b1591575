import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { LayoutDashboard, LineChart, ClipboardCheck, Sparkles } from "lucide-react";
import { ExecutiveDashboard } from "@/components/admin/executive-dashboard";
import { KnowledgeAnalyticsPage } from "@/components/admin/knowledge-analytics";
import { AiAuditPage } from "@/components/admin/ai-audit";

const searchSchema = z.object({
  view: z.enum(["overview", "analytics", "audit"]).catch("overview"),
});

export const Route = createFileRoute("/_authenticated/app/admin/command-center")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Command Center · OPSQAI" },
      {
        name: "description",
        content:
          "Unified enterprise cockpit: executive overview, knowledge analytics, and AI maturity audit for your workspace.",
      },
    ],
  }),
  component: CommandCenterPage,
});

type ViewKey = "overview" | "analytics" | "audit";

const VIEWS: {
  key: ViewKey;
  label: string;
  tagline: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    key: "overview",
    label: "Executive Overview",
    tagline: "Operational KPIs, activity and executive insights",
    icon: LayoutDashboard,
  },
  {
    key: "analytics",
    label: "Knowledge Analytics",
    tagline: "Content usage, confidence, gaps and outdated SOPs",
    icon: LineChart,
  },
  {
    key: "audit",
    label: "AI Maturity Audit",
    tagline: "Operational maturity scoring & compliance readiness",
    icon: ClipboardCheck,
  },
];

function CommandCenterPage() {
  const { view } = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.fullPath });
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {/* Enterprise header band */}
      <div className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-0">
          <div className="flex items-start gap-4">
            <div className="hidden md:flex h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-primary/80">
                OPSQAI · Command Center
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">
                {active.label}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {active.tagline}
              </p>
            </div>
          </div>

          {/* Segmented tab bar */}
          <div
            role="tablist"
            aria-label="Command Center views"
            className="mt-6 flex flex-wrap gap-1 border-b border-border -mb-px"
          >
            {VIEWS.map((v) => {
              const Icon = v.icon;
              const isActive = v.key === active.key;
              return (
                <button
                  key={v.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() =>
                    navigate({ search: { view: v.key }, replace: true })
                  }
                  className={[
                    "group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
                    "border-b-2 -mb-px transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    ].join(" ")}
                  />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active view — original components are re-used as-is */}
      <div>
        {active.key === "overview" && <ExecutiveDashboard />}
        {active.key === "analytics" && <KnowledgeAnalyticsPage />}
        {active.key === "audit" && <AiAuditPage />}
      </div>
    </div>
  );
}

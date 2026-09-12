import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, Plus } from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { listValueModels } from "@/lib/value-engine.functions";
import { formatMoney } from "@/lib/value-engine";

export const Route = createFileRoute("/_authenticated/management/value/")({
  head: () => ({
    meta: [
      { title: "Value Engine — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Operational value calculator for OPSQAI: turn a customer's current operational loss into potential value, expected value, ROI and a downloadable value report.",
      },
      { property: "og:title", content: "Value Engine — OPSQAI Management Center" },
      {
        property: "og:description",
        content: "Operational value calculations and value reports for the OPSQAI sales team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValueListPage,
});

function ValueListPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listValueModels);

  const { data, isLoading } = useQuery({
    queryKey: ["value-models", session?.user?.id ?? null],
    queryFn: () => list({ data: {} } as never),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  return (
    <ModulePage
      eyebrow="Value Engine"
      title="Operational value calculator"
      description="Turn a customer's current operational loss into potential value, expected value and ROI — then hand them the report."
      actions={
        <Button onClick={() => navigate({ to: "/management/value/$id", params: { id: "new" } })}>
          <Plus className="mr-2 h-4 w-4" />
          New calculation
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (data?.models ?? []).length === 0 ? (
        <Panel title="No calculations yet" icon={Calculator}>
          <p className="text-sm text-muted-foreground">
            Start a calculation during a customer conversation: employees affected, cost per hour,
            minutes lost per day. Everything else follows from those numbers.
          </p>
        </Panel>
      ) : (
        <Panel title="Saved calculations" icon={Calculator}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Level</th>
                  <th className="py-2">Current loss</th>
                  <th className="py-2">Expected value</th>
                  <th className="py-2">Multiple</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.models ?? []).map((m) => {
                  const c = (m.computed ?? {}) as Record<string, number>;
                  return (
                    <tr key={m.id} className="border-t border-border/60">
                      <td className="py-2">
                        <Link
                          to="/management/value/$id"
                          params={{ id: m.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {m.company_name}
                        </Link>
                      </td>
                      <td className="py-2">{m.level}</td>
                      <td className="py-2">
                        {formatMoney(Number(c['currentTotal'] ?? 0), m.currency)}
                      </td>
                      <td className="py-2">
                        {formatMoney(Number(c['expectedValue'] ?? 0), m.currency)}
                      </td>
                      <td className="py-2">{Number(c['valueMultiple'] ?? 0).toFixed(2)}×</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(m.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </ModulePage>
  );
}

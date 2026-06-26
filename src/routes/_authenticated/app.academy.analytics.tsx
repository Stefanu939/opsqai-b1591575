import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BarChart3, ArrowRight } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";

export const Route = createFileRoute("/_authenticated/app/academy/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Academy Analytics" }] }),
});

function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-3xl mx-auto w-full">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 font-medium"><BarChart3 className="h-5 w-5 text-primary" /> Academy Analytics</div>
          <p className="text-sm text-muted-foreground">
            Department performance, knowledge heatmap, completion rates and AI-suggested SOP updates live in the Manager Console.
          </p>
          <Link to="/app/admin/academy" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            Open Manager Console <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

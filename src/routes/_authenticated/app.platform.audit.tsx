import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { ComingSoonPanel } from "@/components/platform/ComingSoonPanel";

export const Route = createFileRoute("/_authenticated/app/platform/audit")({
  head: () => ({ meta: [{ title: "Audit AI — Mission Control" }] }),
  component: () => (
    <ComingSoonPanel
      eyebrow="Intelligence · Audit AI"
      title="Audit AI · Health scoring firme"
      description="Audit generat AI, la nivel de director de audit — health score, plăți, heartbeat și sugestii concrete per firmă."
      icon={<Brain className="h-4 w-4" />}
      bullets={[
        "Grid firme cu health score 0-100 (donut per rând)",
        "Detaliu firmă: chart heartbeat + pie plăți paid/late/unpaid",
        "Sugestii AI: retention offers, upsell, alerte churn",
        "Filter: at-risk / healthy / churned",
        "Export raport PDF per firmă",
        "Alerte auto pe deteriorare score",
      ]}
    />
  ),
});

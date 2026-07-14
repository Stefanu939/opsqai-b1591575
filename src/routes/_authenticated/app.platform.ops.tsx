import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { ComingSoonPanel } from "@/components/platform/ComingSoonPanel";

export const Route = createFileRoute("/_authenticated/app/platform/ops")({
  head: () => ({ meta: [{ title: "Recovery & Maintenance — Mission Control" }] }),
  component: () => (
    <ComingSoonPanel
      eyebrow="Operations"
      title="Recovery & Maintenance"
      description="Cele două module combinate într-un singur ecran enterprise — ferestre mentenanță și disaster recovery."
      icon={<Wrench className="h-4 w-4" />}
      bullets={[
        "Tab Maintenance: ferestre programate + expirări licențe",
        "Tab Recovery: bootstrap tokens + DR keys",
        "Restore packages tracker",
        "Renewal calendar + alerte auto",
        "Log audit per operațiune",
        "Export CSV pentru compliance",
      ]}
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ComingSoonPanel } from "@/components/platform/ComingSoonPanel";

export const Route = createFileRoute("/_authenticated/app/platform/administration")({
  head: () => ({ meta: [{ title: "Platform Administration — Mission Control" }] }),
  component: () => (
    <ComingSoonPanel
      eyebrow="System · Governance"
      title="Platform Administration"
      description="Organigrama echipei OPSQAI, cu ierarhie vizuală și governance — de la owner până la agent de vânzări."
      icon={<ShieldCheck className="h-4 w-4" />}
      bullets={[
        "Organigramă tree de sus în jos (owner → sales agent)",
        "Card nod: avatar + nume + rol, click → detail panel",
        "Buton Add Person cu role picker",
        "Matrice permisiuni per rol × modul",
        "Audit trail pentru schimbări de rol",
        "Doar echipa OPSQAI — invisible pentru self-hosted",
      ]}
    />
  ),
});

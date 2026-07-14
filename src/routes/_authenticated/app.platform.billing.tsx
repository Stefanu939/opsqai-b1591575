import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { ComingSoonPanel } from "@/components/platform/ComingSoonPanel";

export const Route = createFileRoute("/_authenticated/app/platform/billing")({
  head: () => ({ meta: [{ title: "Billing — Mission Control" }] }),
  component: () => (
    <ComingSoonPanel
      eyebrow="Commercial · Billing"
      title="Billing wizard"
      description="Emitere abonamente și pachete pentru orice firmă. Disponibil pentru toți utilizatorii OPSQAI Cloud (owner → agent de vânzări)."
      icon={<CreditCard className="h-4 w-4" />}
      bullets={[
        "Pas 1 — Selectează firma (autocomplete)",
        "Pas 2 — Base package: €15.000 one-time (toggle)",
        "Pas 3 — Slider mentenanță: 0 → €500 / lună",
        "Pas 4 — Grid module cu sliders 500 → 2000 €/lună",
        "Pas 5 — Rezumat 12 luni + emit contract",
        "Persistență în tabelă nouă platform_billing_quotes",
      ]}
    />
  ),
});

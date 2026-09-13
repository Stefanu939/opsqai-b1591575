import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useDiscoveryCopy } from "@/i18n/pages/discovery";

/**
 * Small contextual band on pilot/pricing that ties those pages back to
 * Discovery: pricing and pilot scope both follow the diagnosis.
 */
export function DiscoveryNote({ variant }: { variant: "pilot" | "pricing" }) {
  const t = useDiscoveryCopy()[variant === "pilot" ? "pilotNote" : "pricingNote"];
  return (
    <div className="mx-auto max-w-7xl px-6 md:px-10">
      <div className="flex flex-col items-start gap-4 rounded-xl border border-[var(--oix-gold-line)]/40 bg-[var(--oix-surface)] p-6 sm:flex-row sm:items-center">
        <Compass className="h-6 w-6 shrink-0 text-[var(--oix-gold)]" strokeWidth={1.5} />
        <div className="flex-1">
          <div className="font-display text-lg font-semibold text-[var(--oix-cream)]">
            {t.title}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
        </div>
        <Link
          to="/discovery"
          className="inline-flex min-h-10 shrink-0 items-center rounded-sm border border-[var(--oix-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--oix-cream)] transition-colors hover:bg-[var(--oix-bg-deep)]"
        >
          {t.cta}
        </Link>
      </div>
    </div>
  );
}

import { ArrowRight, Quote } from "lucide-react";
import { SectionShell } from "./section-shell";
import { useDiscoveryCopy } from "@/i18n/pages/discovery";

/**
 * Pain-to-solution band: each row starts from a sentence the customer
 * actually says ("we keep losing…") and lands on the OPSQAI answer.
 */
export function PainToSolution() {
  const t = useDiscoveryCopy().painToSolution;

  return (
    <SectionShell className="oix-hairline-top">
      <div className="max-w-3xl">
        <p className="oix-eyebrow">{t.eyebrow}</p>
        <h2 className="oix-display mt-3 text-4xl md:text-5xl">{t.title}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t.intro}</p>
      </div>

      <div className="mt-12 space-y-4">
        {t.pains.map((p) => (
          <div
            key={p.pain}
            className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-[1fr_auto_1fr] md:items-center"
          >
            <div className="flex items-start gap-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--oix-gold)]" strokeWidth={1.6} />
              <p className="font-display text-lg italic leading-snug text-foreground">{p.pain}</p>
            </div>
            <ArrowRight
              className="hidden h-5 w-5 text-primary md:block"
              strokeWidth={1.6}
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-muted-foreground">{p.solution}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

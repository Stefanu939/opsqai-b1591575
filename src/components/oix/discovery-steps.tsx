import { SectionShell } from "./section-shell";
import { useDiscoveryCopy } from "@/i18n/pages/discovery";

/**
 * The four-step OPSQAI model rendered as a numbered editorial rail:
 * Problem → Diagnosis → Solution design → Workspace.
 */
export function DiscoverySteps() {
  const t = useDiscoveryCopy().steps;

  return (
    <SectionShell className="oix-hairline-top">
      <div className="max-w-3xl">
        <p className="oix-eyebrow">{t.eyebrow}</p>
        <h2 className="oix-display mt-3 text-4xl md:text-5xl">{t.title}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t.intro}</p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {t.items.map((s) => (
          <div key={s.step} className="bg-card p-6">
            <div className="font-mono text-sm text-primary">{s.step}</div>
            <div className="mt-3 font-display text-xl font-semibold text-foreground">
              {s.name}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

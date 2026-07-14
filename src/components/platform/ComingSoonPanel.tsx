import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function ComingSoonPanel({
  eyebrow,
  title,
  description,
  bullets,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon?: ReactNode;
}) {
  return (
    <div className="mc-enter mx-auto max-w-4xl p-4 md:p-8">
      <div className="mc-eyebrow mb-2 flex items-center gap-2 text-[var(--mc-gold-glow)]">
        <Sparkles className="h-3 w-3" /> {eyebrow}
      </div>
      <h1 className="mc-heading mb-3 text-3xl font-semibold tracking-tight text-[var(--mc-fg)]">
        {title}
      </h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[var(--mc-fg-muted)]">
        {description}
      </p>

      <div className="mc-surface mc-shadow-premium relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[var(--mc-gold)] opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[var(--mc-cyan)] opacity-[0.06] blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mc-gold-line-strong)] bg-gradient-to-br from-[#2a2060] to-[#12122a] text-[var(--mc-gold-glow)] mc-glow-violet">
              {icon ?? <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <div className="mc-eyebrow text-[var(--mc-fg-dim)]">Turn 2 · Implementation</div>
              <div className="text-sm font-semibold text-[var(--mc-fg)]">Livrare imediat următoare</div>
            </div>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]/60 p-3 text-[13px] text-[var(--mc-fg)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mc-gold)] shadow-[0_0_8px_var(--mc-gold)]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

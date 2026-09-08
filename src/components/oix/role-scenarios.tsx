import { SectionShell } from "./section-shell";
import { usePainCopy } from "@/i18n/pages/pain";
import { cn } from "@/lib/utils";

/** Role-specific pain → what the product does about it. */
export function RoleScenarios({ className }: { className?: string }) {
  const t = usePainCopy().roles;
  return (
    <SectionShell className={cn("border-t border-border", className)}>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {t.items.map((item) => (
          <article
            key={item.role}
            className="flex flex-col rounded-xl border border-border bg-card p-6 md:p-7"
          >
            <h3 className="font-display text-xl font-semibold text-foreground">{item.role}</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.pain}</p>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm leading-relaxed text-foreground/90">{item.fix}</p>
            </div>
            <span className="mt-6 inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              {item.product}
            </span>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

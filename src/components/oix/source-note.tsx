import type { SourceRef } from "@/i18n/pages/pain";
import { cn } from "@/lib/utils";

/**
 * Small, verifiable attribution line. Marketing claims that come from
 * outside OPSQAI always carry one of these — no orphan statistics.
 */
export function SourceNote({
  label,
  sources,
  className,
}: {
  label: string;
  sources: SourceRef[];
  className?: string;
}) {
  if (!sources.length) return null;
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      {label}:{" "}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? " · " : null}
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {s.label}
          </a>
        </span>
      ))}
    </p>
  );
}

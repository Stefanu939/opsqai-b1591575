import { cn } from "@/lib/utils";

interface MottoBandProps {
  className?: string;
  size?: "md" | "lg" | "xl";
  compact?: boolean;
}

/**
 * The OPSQAI signature motto. Repeated across the marketing site as a
 * recurring visual anchor. Two stacked lines, gold hairline under.
 */
export function MottoBand({ className, size = "xl", compact = false }: MottoBandProps) {
  const cls =
    size === "xl"
      ? "text-[clamp(3rem,14vw,14rem)]"
      : size === "lg"
        ? "text-[clamp(2.5rem,10vw,10rem)]"
        : "text-[clamp(2rem,6vw,5rem)]";

  return (
    <div
      className={cn(
        "oix-hairline-top oix-hairline-bottom relative w-full",
        compact ? "py-10 md:py-16" : "py-20 md:py-32",
        className,
      )}
      aria-label="For people. Not without them."
    >
      <div className="mx-auto max-w-[100rem] px-6 md:px-10">
        <p
          className={cn(
            "oix-display leading-[0.82] tracking-[-0.04em] text-[var(--oix-cream)]",
            cls,
          )}
        >
          <span className="block">For People.</span>
          <span className="block text-[var(--oix-gold)]">Not Without Them.</span>
        </p>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--oix-gold) 50%, transparent 100%)",
          opacity: 0.35,
        }}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";
import { useHomeCopy } from "@/i18n/pages/home";

interface MottoBandProps {
  className?: string;
  size?: "md" | "lg" | "xl";
  compact?: boolean;
}

/**
 * The OPSQAI signature motto. Repeated across the marketing site as a
 * recurring editorial pull-quote.
 */
export function MottoBand({ className, size = "xl", compact = false }: MottoBandProps) {
  const t = useHomeCopy().mottoBand;
  const cls =
    size === "xl"
      ? "text-[clamp(3.5rem,10vw,9rem)]"
      : size === "lg"
        ? "text-[clamp(3rem,7vw,6.5rem)]"
        : "text-[clamp(2.25rem,5vw,4.5rem)]";

  return (
    <div
      className={cn(
        "oix-hairline-top oix-hairline-bottom relative w-full",
        compact ? "py-10 md:py-16" : "py-20 md:py-32",
        className,
      )}
      aria-label={t.ariaLabel}
    >
      <div className="mx-auto max-w-[100rem] px-6 md:px-10">
        <p
          className={cn(
            "oix-display max-w-5xl leading-[0.95] text-[var(--oix-cream)]",
            cls,
          )}
        >
          <span className="block">{t.lineOne}</span>
          <span className="block italic text-[var(--oix-gold)]">{t.lineTwo}</span>
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

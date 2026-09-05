import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconTileTone = "gold" | "neutral" | "primary" | "success" | "warning" | "danger";

const tones: Record<IconTileTone, string> = {
  gold: "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[color:var(--gold)]",
  neutral: "bg-secondary/70 border-border text-muted-foreground",
  primary: "bg-primary/12 border-primary/25 text-primary",
  success: "bg-emerald-500/12 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/12 border-amber-500/25 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/12 border-destructive/25 text-destructive",
};

const sizes = {
  sm: "h-8 w-8 rounded-sm [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 rounded-md [&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "h-12 w-12 rounded-md [&>svg]:h-5 [&>svg]:w-5",
};

/**
 * IconTile — the platform pictogram container: a soft rounded square (or circle)
 * with a hairline border and a thin-stroke lucide glyph inside. Used in
 * navigation, cards, list rows and status blocks so every icon reads the same.
 */
export function IconTile({
  icon: Icon,
  tone = "gold",
  size = "md",
  round = false,
  className,
}: {
  icon: LucideIcon;
  tone?: IconTileTone;
  size?: keyof typeof sizes;
  round?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center border transition-colors duration-150",
        sizes[size],
        round && "rounded-full",
        tones[tone],
        className,
      )}
    >
      <Icon strokeWidth={1.8} />
    </span>
  );
}

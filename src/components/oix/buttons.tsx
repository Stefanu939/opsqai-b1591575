import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "gold" | "ghost" | "emerald";

interface OixButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  to?: string;
  external?: boolean;
  withArrow?: boolean;
}

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--oix-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--oix-bg-deep)] relative group";

const variants: Record<Variant, string> = {
  gold:
    "bg-[var(--oix-emerald)] text-[var(--oix-primary-ink)] hover:bg-[var(--oix-emerald-strong)]",
  ghost:
    "border border-[var(--oix-border-strong)] bg-transparent text-[var(--oix-cream)] hover:bg-[var(--oix-surface)]",
  emerald:
    "bg-[var(--oix-gold)] text-[var(--oix-primary-ink)] hover:bg-[var(--oix-gold-strong)]",
};

export const OixButton = forwardRef<HTMLButtonElement, OixButtonProps>(
  ({ className, variant = "gold", to, external, withArrow, children, ...rest }, ref) => {
    const content = (
      <>
        <span>{children}</span>
        {withArrow ? (
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        ) : null}
      </>
    );

    const cls = cn(base, variants[variant], className);

    if (to && external) {
      return (
        <a href={to} target="_blank" rel="noreferrer" className={cls}>
          {content}
        </a>
      );
    }
    if (to) {
      return (
        <Link to={to} className={cls}>
          {content}
        </Link>
      );
    }
    return (
      <button ref={ref} className={cls} {...rest}>
        {content}
      </button>
    );
  },
);
OixButton.displayName = "OixButton";

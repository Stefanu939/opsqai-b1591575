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
  "inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-medium uppercase tracking-[0.18em] transition-all duration-300 relative group";

const variants: Record<Variant, string> = {
  gold:
    "bg-[var(--oix-gold)] text-[#0a0b14] shadow-[var(--oix-shadow-gold-glow)]",
  ghost:
    "border border-[var(--oix-gold-line)] text-[var(--oix-cream)]",
  emerald:
    "bg-[var(--oix-emerald)] text-[var(--oix-cream)]",
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

    const cls = cn(base, variants[variant], "oix-brackets", className);

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

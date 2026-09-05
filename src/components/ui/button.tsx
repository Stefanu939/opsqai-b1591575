import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] active:duration-75 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
           "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
           "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-ring/40",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
        violet:
           "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        glass:
           "border border-border bg-card text-foreground shadow-xs hover:border-ring/40 hover:bg-accent",
        subtle: "bg-muted/60 text-foreground hover:bg-muted",

      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Async in flight — shows a spinner and blocks repeat submits. */
  loading?: boolean;
  /** Momentary success confirmation after an async action resolves. */
  success?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, success, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        data-loading={loading ? "true" : undefined}
        data-success={success ? "true" : undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : success ? (
          <Check className="oq-enter" aria-hidden />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

/**
 * useActionFeedback — one hook for the "command received" language:
 * loading while the promise is in flight, then a short success confirmation.
 */
export function useActionFeedback(successMs = 1600) {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const run = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setSuccess(false);
      try {
        const result = await fn();
        setSuccess(true);
        window.setTimeout(() => setSuccess(false), successMs);
        return result;
      } finally {
        setLoading(false);
      }
    },
    [successMs],
  );

  return { loading, success, run };
}

export { Button, buttonVariants };

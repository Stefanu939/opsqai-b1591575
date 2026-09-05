import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EditorialHeadlineProps {
  eyebrow?: ReactNode;
  children: ReactNode;
  serifAccent?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  size?: "md" | "lg" | "xl";
  align?: "left" | "center";
}

/**
 * Public editorial headline with an optional italic emphasis.
 */
export function EditorialHeadline({
  eyebrow,
  children,
  serifAccent,
  className,
  as: Tag = "h2",
  size = "lg",
  align = "left",
}: EditorialHeadlineProps) {
  const sizeCls =
    size === "xl"
      ? "text-[clamp(3.25rem,6.6vw,6.4rem)]"
      : size === "lg"
        ? "text-[clamp(2.5rem,4.8vw,4.5rem)]"
        : "text-[clamp(2rem,3.3vw,3.25rem)]";

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? <div className="oix-eyebrow mb-6">{eyebrow}</div> : null}
      <Tag className={cn("oix-display", sizeCls, "text-[var(--oix-cream)]")}>
        {children}
        {serifAccent ? (
          <>
            {" "}
            <span className="oix-serif-italic normal-case tracking-normal">{serifAccent}</span>
          </>
        ) : null}
      </Tag>
    </div>
  );
}

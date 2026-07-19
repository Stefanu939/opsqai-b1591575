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
 * OIX headline. Uppercase Space Grotesk with optional Instrument Serif italic
 * accent for a keyword. Ships with a gold eyebrow above and adjustable size.
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
      ? "text-[clamp(3rem,7vw,6.5rem)]"
      : size === "lg"
        ? "text-[clamp(2.25rem,5vw,4.5rem)]"
        : "text-[clamp(1.75rem,3.5vw,3rem)]";

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

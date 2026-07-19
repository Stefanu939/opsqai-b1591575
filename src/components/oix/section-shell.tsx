import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  children: ReactNode;
  className?: string;
  container?: boolean;
  as?: "section" | "div" | "header" | "footer";
  id?: string;
  fullHeight?: boolean;
  bracketed?: boolean;
}

/**
 * OIX section frame. Consistent vertical rhythm, optional gold corner
 * brackets, optional container width. Renders semantic <section> by default.
 */
export function SectionShell({
  children,
  className,
  container = true,
  as: Tag = "section",
  id,
  fullHeight = false,
  bracketed = false,
}: SectionShellProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "relative w-full py-24 md:py-32",
        fullHeight && "min-h-screen flex items-center",
        bracketed && "oix-brackets",
        className,
      )}
    >
      <div className={cn(container && "mx-auto w-full max-w-7xl px-6 md:px-10", "relative")}>
        {children}
      </div>
    </Tag>
  );
}

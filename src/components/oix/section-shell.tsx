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
 * Public section frame with consistent editorial rhythm.
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
        "relative w-full py-20 md:py-28",
        fullHeight && "min-h-dvh flex items-center",
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

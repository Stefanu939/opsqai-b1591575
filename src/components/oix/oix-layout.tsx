import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { NavShell } from "./nav-shell";
import { FooterOix } from "./footer-oix";

/**
 * Root wrapper for the OIX marketing site. Provides the .oix-shell scope,
 * fixed nav, and premium footer.
 */
export function OixLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");

  return (
    <div className={cn("oix-shell", isBlog ? "oix-blog" : "oix-static")}>
      <NavShell />
      <main className="pt-16">{children}</main>
      <FooterOix />
    </div>
  );
}

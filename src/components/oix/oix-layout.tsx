import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { NavShell } from "./nav-shell";
import { FooterOix } from "./footer-oix";
import { StickyMobileCta } from "./sticky-mobile-cta";

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
      <main className="pt-[4.5rem]">{children}</main>
      <div className="pb-16 md:pb-0">
        <FooterOix />
      </div>
      <StickyMobileCta />
    </div>
  );
}

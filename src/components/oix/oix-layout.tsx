import type { ReactNode } from "react";
import { NavShell } from "./nav-shell";
import { FooterOix } from "./footer-oix";

/**
 * Root wrapper for the OIX marketing site. Provides the .oix-shell scope,
 * fixed nav, and premium footer.
 */
export function OixLayout({ children }: { children: ReactNode }) {
  return (
    <div className="oix-shell">
      <NavShell />
      <main className="pt-16">{children}</main>
      <FooterOix />
    </div>
  );
}

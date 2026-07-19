import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OixButton } from "./buttons";

const links: Array<{ to: string; label: string }> = [
  { to: "/product", label: "Product" },
  { to: "/modules", label: "Modules" },
  { to: "/self-hosted", label: "Self-Hosted" },
  { to: "/pricing", label: "Pricing" },
  { to: "/company", label: "Company" },
];

export function NavShell() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "backdrop-blur-xl bg-[rgba(4,33,26,0.75)] oix-hairline-bottom"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link to="/" className="flex items-center gap-2 group">
          <span
            className="inline-block h-2 w-2 rounded-full bg-[var(--oix-gold)]"
            style={{ boxShadow: "0 0 12px var(--oix-gold)" }}
            aria-hidden
          />
          <span
            className="oix-display text-lg tracking-[0.24em] text-[var(--oix-cream)] group-hover:text-[var(--oix-gold-soft)] transition-colors"
          >
            OPSQAI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[12px] uppercase tracking-[0.22em] text-[var(--oix-cream-dim)] hover:text-[var(--oix-gold-soft)] transition-colors"
              activeProps={{ className: "text-[var(--oix-gold)]" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <OixButton variant="gold" to="/contact" withArrow>
            Request Proposal
          </OixButton>
        </div>
      </div>
    </header>
  );
}

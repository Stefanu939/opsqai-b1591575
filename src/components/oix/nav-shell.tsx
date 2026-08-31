import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { OixButton } from "./buttons";
import { LogoMark } from "@/components/brand/logo";
import { useT } from "@/i18n";
import { useMarketing } from "@/i18n/marketing";

export function NavShell() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(true);
  const { lang, setLang } = useT();
  const m = useMarketing();

  const links = [
    { to: "/product", label: m.nav.product },
    { to: "/product-overview", label: m.nav.overview },
    { to: "/modules", label: m.nav.modules },
    { to: "/self-hosted", label: m.nav.selfHosted },
    { to: "/security", label: m.nav.security },
    { to: "/pricing", label: m.nav.pricing },
    { to: "/company", label: m.nav.company },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("opsqai-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "backdrop-blur-xl bg-[color-mix(in_srgb,var(--oix-bg-deep)_78%,transparent)] oix-hairline-bottom"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-6">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <LogoMark
            size={26}
            accent="var(--oix-gold-soft)"
            className="text-[var(--oix-gold)]"
          />
          <span className="oix-display text-lg tracking-[0.24em] text-[var(--oix-cream)] group-hover:text-[var(--oix-gold-soft)] transition-colors">
            OPSQAI
          </span>
        </Link>


        <nav className="hidden items-center gap-5 lg:flex">
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Language — always visible */}
          <div
            className="flex items-center overflow-hidden border border-[var(--oix-gold-line)]"
            role="group"
            aria-label={m.a11y.language}
          >
            {(["en", "de"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                  lang === code
                    ? "bg-[var(--oix-gold)] text-[#0a0b14]"
                    : "text-[var(--oix-cream-dim)] hover:text-[var(--oix-gold-soft)]",
                )}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Theme — always visible */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={m.a11y.theme}
            title={m.a11y.theme}
            className="inline-flex h-8 w-8 items-center justify-center border border-[var(--oix-gold-line)] text-[var(--oix-cream-dim)] hover:text-[var(--oix-gold-soft)] hover:border-[var(--oix-gold)] transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <OixButton
            variant="ghost"
            to="/auth"
            className="hidden px-4 py-2 sm:inline-flex"
          >
            {m.cta.signIn}
          </OixButton>

          <OixButton variant="gold" to="/contact" withArrow className="hidden px-4 py-2 xl:inline-flex">
            {m.cta.proposal}
          </OixButton>
        </div>
      </div>
    </header>
  );
}

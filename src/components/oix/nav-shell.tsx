import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { OixButton } from "./buttons";
import { LogoMark } from "@/components/brand/logo";
import { useT } from "@/i18n";
import { useMarketing } from "@/i18n/marketing";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-[var(--oix-gold-line)] bg-[color-mix(in_srgb,var(--oix-bg-deep)_94%,transparent)] backdrop-blur-xl"
          : "border-transparent bg-[color-mix(in_srgb,var(--oix-bg-deep)_86%,transparent)] backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0 transition-opacity duration-200 hover:opacity-80">
          <LogoMark
            size={26}
            accent="var(--oix-gold-soft)"
            className="text-[var(--oix-gold)]"
          />
          <span className="text-lg font-semibold text-[var(--oix-cream)]">
            OPSQAI
          </span>
        </Link>


        <nav className="hidden items-center gap-5 lg:flex xl:gap-6" aria-label="Primary navigation">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="border-b-2 border-transparent py-2 text-sm font-medium text-[var(--oix-cream-dim)] transition-colors duration-200 hover:text-[var(--oix-cream)]"
              activeProps={{ className: "border-[var(--oix-emerald)] text-[var(--oix-cream)]" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language — always visible */}
          <div
            className="hidden items-center overflow-hidden rounded-sm border border-[var(--oix-gold-line)] sm:flex"
            role="group"
            aria-label={m.a11y.language}
          >
            {(["en", "de", "ro"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-semibold uppercase transition-colors",
                  lang === code
                    ? "bg-[var(--oix-cream)] text-[var(--oix-bg-deep)]"
                    : "text-[var(--oix-cream-dim)] hover:bg-[var(--oix-gold)]/10 hover:text-[var(--oix-cream)]",
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
            className="hidden h-9 w-9 items-center justify-center rounded-sm border border-[var(--oix-gold-line)] text-[var(--oix-cream-dim)] transition-colors duration-200 hover:border-[var(--oix-gold)] hover:text-[var(--oix-gold)] sm:inline-flex"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <OixButton
            variant="ghost"
            to="/auth"
            className="hidden px-4 py-2 xl:inline-flex"
          >
            {m.cta.signIn}
          </OixButton>

          <OixButton variant="gold" to="/contact" withArrow className="hidden px-4 py-2 2xl:inline-flex">
            {m.cta.proposal}
          </OixButton>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-[var(--oix-gold-line)] bg-transparent text-[var(--oix-cream)] lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="oix-shell border-[var(--oix-gold-line)] bg-[var(--oix-bg-deep)] p-0 text-[var(--oix-cream)]">
              <SheetHeader className="border-b border-[var(--oix-gold-line)] px-6 py-5 text-left">
                <SheetTitle className="font-[family-name:var(--font-body-oix)] text-[var(--oix-cream)]">OPSQAI</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-6 py-6" aria-label="Mobile navigation">
                {links.map((link) => (
                  <SheetClose asChild key={link.to}>
                    <Link to={link.to} className="border-b border-[var(--oix-gold-line)] py-4 text-base font-medium text-[var(--oix-cream)]">{link.label}</Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link to="/documentation" className="border-b border-[var(--oix-gold-line)] py-4 text-base font-medium text-[var(--oix-cream)]">{m.nav.documentation}</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/blog" className="border-b border-[var(--oix-gold-line)] py-4 text-base font-medium text-[var(--oix-cream)]">{m.nav.blog}</Link>
                </SheetClose>
              </nav>
              <div className="space-y-4 px-6 pb-6">
                <div className="flex items-center gap-2" role="group" aria-label={m.a11y.language}>
                  {(["en", "de", "ro"] as const).map((code) => (
                    <button key={code} type="button" onClick={() => setLang(code)} aria-pressed={lang === code} className={cn("h-10 flex-1 rounded-sm border border-[var(--oix-gold-line)] text-xs font-semibold uppercase", lang === code && "bg-[var(--oix-cream)] text-[var(--oix-bg-deep)]")}>{code}</button>
                  ))}
                  <button type="button" onClick={toggleTheme} aria-label={m.a11y.theme} className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[var(--oix-gold-line)]">
                    {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </div>
                <OixButton variant="gold" to="/contact" withArrow className="w-full">{m.cta.proposal}</OixButton>
                <OixButton variant="ghost" to="/auth" className="w-full">{m.cta.signIn}</OixButton>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

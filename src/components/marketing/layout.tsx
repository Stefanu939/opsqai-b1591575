import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Linkedin, Mail, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/opsqai-mark.png";

const NAV = [
  { to: "/product", label: "Product" },
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/industries", label: "Industries" },
  { to: "/pricing", label: "Pricing" },
  { to: "/trust", label: "Trust" },
  { to: "/demo", label: "Demo" },
  { to: "/contact", label: "Contact" },
] as const;

const FOOTER_COLS: Array<{ title: string; links: Array<{ to: string; label: string; external?: boolean }> }> = [
  {
    title: "Product",
    links: [
      { to: "/product", label: "Overview" },
      { to: "/features", label: "Features" },
      { to: "/pricing", label: "Pricing" },
      { to: "/demo", label: "Live demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { to: "/solutions", label: "Warehousing" },
      { to: "/solutions", label: "Transport" },
      { to: "/solutions", label: "3PL & Logistics" },
      { to: "/industries", label: "Manufacturing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/trust", label: "Trust Center" },
      { to: "/trust/responsible-ai", label: "Responsible AI" },
      { to: "/trust/security-architecture", label: "Security" },
      { to: "/contact", label: "Help Center" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/contact", label: "Contact" },
      { to: "/contact", label: "Careers" },
      { to: "/contact", label: "Partners" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/legal/privacy", label: "Privacy" },
      { to: "/legal/terms", label: "Terms" },
      { to: "/legal/dpa", label: "DPA" },
      { to: "/legal/cookies", label: "Cookies" },
      { to: "/legal/impressum", label: "Impressum" },
    ],
  },
];

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logo} alt="" width={30} height={30} className="drop-shadow-[0_0_14px_oklch(0.82_0.14_200/0.55)]" />
            <span className="font-semibold tracking-tight text-[15px]">OPSQAI</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
            {NAV.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-foreground data-[status=active]:font-medium"
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle className="h-9 w-9" />
            <div className="hidden sm:flex items-center gap-2">
              {signedIn ? (
                <Button asChild size="sm"><Link to="/app">Open app</Link></Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="text-foreground/85"><Link to="/auth">Sign in</Link></Button>
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_oklch(0.82_0.14_200/0.40),0_8px_24px_-8px_oklch(0.82_0.14_200/0.5)]">
                    <Link to="/contact">Book a demo</Link>
                  </Button>
                </>
              )}
            </div>
            <button className="lg:hidden p-2 -mr-1 text-foreground" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col">
              {NAV.map((i) => (
                <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="py-2.5 text-sm text-foreground/90">
                  {i.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-border/50 flex gap-2 sm:hidden">
                {signedIn ? (
                  <Button asChild size="sm" className="flex-1"><Link to="/app">Open app</Link></Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/auth">Sign in</Link></Button>
                    <Button asChild size="sm" className="flex-1"><Link to="/contact">Book a demo</Link></Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/50 bg-[oklch(0.13_0.03_240)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="" width={28} height={28} />
                <span className="font-semibold tracking-tight">OPSQAI</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-xs">
                Enterprise AI knowledge management, operational intelligence and compliance for logistics &amp; supply chain.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="h-9 w-9 grid place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="mailto:notify@opsqai.de" aria-label="Email" className="h-9 w-9 grid place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Mail className="h-4 w-4" />
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="h-9 w-9 grid place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
              {FOOTER_COLS.map((col) => (
                <div key={col.title}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-foreground/90 mb-3">{col.title}</div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {col.links.map((l, i) => (
                      <li key={`${col.title}-${i}`}>
                        <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} OPSQAI. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="chip border-primary/30 !bg-primary/5 !text-primary">ISO 27001 Roadmap</span>
              <span className="chip border-primary/30 !bg-primary/5 !text-primary">GDPR Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

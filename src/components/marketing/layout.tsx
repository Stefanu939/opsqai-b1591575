import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/opsqai-mark.png";

const NAV = [
  { to: "/product", label: "Product" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/trust", label: "Trust" },
  { to: "/demo", label: "Demo" },
  { to: "/contact", label: "Contact" },
] as const;

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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="" width={28} height={28} className="drop-shadow-[0_0_10px_rgba(139,124,246,0.45)]" />
            <span className="font-semibold tracking-tight">OPSQAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-foreground data-[status=active]:font-medium"
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {signedIn ? (
              <Button asChild size="sm"><Link to="/dashboard">Open app</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
                <Button asChild size="sm"><Link to="/contact">Book a demo</Link></Button>
              </>
            )}
          </div>
          <button className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-border/60 bg-background">
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
              {NAV.map((i) => (
                <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="py-2 text-sm">
                  {i.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-border/60 flex gap-2">
                {signedIn ? (
                  <Button asChild size="sm" className="flex-1"><Link to="/dashboard">Open app</Link></Button>
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

      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" width={24} height={24} />
              <span className="font-semibold">OPSQAI</span>
            </div>
            <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
              Enterprise AI knowledge management, operational intelligence and compliance for logistics & supply chain.
            </p>
          </div>
          <div>
            <div className="font-medium mb-2">Product</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link to="/product" className="hover:text-foreground">Overview</Link></li>
              <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/demo" className="hover:text-foreground">Live demo</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Company</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link to="/trust" className="hover:text-foreground">Trust Center</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Legal</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-foreground">Cookies</Link></li>
              <li><Link to="/legal/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link to="/legal/dpa" className="hover:text-foreground">DPA</Link></li>
              <li><Link to="/legal/responsible-ai" className="hover:text-foreground">Responsible AI</Link></li>
              <li><Link to="/legal/impressum" className="hover:text-foreground">Impressum</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 justify-between">
            <div>© {new Date().getFullYear()} OPSQAI. All rights reserved.</div>
            <div>opsqai.eu · marketing site · operated separately from the secure application.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

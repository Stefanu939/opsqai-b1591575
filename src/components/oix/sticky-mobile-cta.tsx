import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { useT } from "@/i18n";

const HIDDEN_PREFIXES = ["/diagnostic", "/contact", "/kai"];

const COPY = {
  ro: { line: "Află unde pierde firma ta bani", cta: "Cere diagnostic", calc: "Calculator" },
  en: { line: "Find where your company loses money", cta: "Get a diagnostic", calc: "Calculator" },
  de: { line: "Finden Sie Ihre Kostenlecks", cta: "Diagnose anfordern", calc: "Rechner" },
} as const;

/** Mobile-only bottom bar pointing visitors to the free diagnostic. */
export function StickyMobileCta() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { lang } = useT();
  const t = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : "ro"];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 150);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{t.line}</p>
        {!pathname.startsWith("/calculator") && (
          <Link
            to="/calculator"
            aria-label={t.calc}
            tabIndex={visible ? 0 : -1}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground"
          >
            <Calculator className="h-4 w-4" />
          </Link>
        )}
        <Link
          to="/diagnostic"
          tabIndex={visible ? 0 : -1}
          className="flex h-10 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {t.cta}
        </Link>
      </div>
    </div>
  );
}

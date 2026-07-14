import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";

// Only allow same-origin relative paths as post-login redirect targets.
function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const out: { next?: string } = {};
    if (typeof s.next === "string") out.next = s.next;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — OPSQAI" },
      {
        name: "description",
        content:
          "Sign in to OPSQAI to access your company's logistics AI assistant, SOPs and knowledge base.",
      },
      { property: "og:title", content: "Sign in — OPSQAI" },
      {
        property: "og:description",
        content:
          "Sign in to OPSQAI to access your company's logistics AI assistant, SOPs and knowledge base.",
      },
      { property: "og:url", content: "https://opsqai.de/auth" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/auth" }],
  }),
  beforeLoad: async ({ search }) => {
    // Fresh Self-Hosted install with no admin yet → send visitor to the
    // first-run wizard instead of a sign-in form nobody can complete.
    try {
      const { getFirstRunGate } = await import("@/lib/first-run.functions");
      const gate = await getFirstRunGate();
      if (gate.open) throw redirect({ to: "/first-run" });
    } catch (err) {
      // A redirect() throw must propagate; anything else (e.g. server fn
      // unreachable during preview) is best-effort and non-fatal.
      if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) throw err;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const target = safeNext(search.next);
      throw redirect({ href: target });
    }
  },

  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) {
        const target = safeNext(next);
        if (target === "/app") {
          navigate({ to: "/app" });
        } else {
          window.location.href = target;
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const contactAdmin =
    lang === "de"
      ? "Wenden Sie sich an Ihren Unternehmensadministrator für den Zugang."
      
        : "Contact your company administrator for access.";

  const forgotLabel =
    lang === "de" ? "Passwort vergessen?"  : "Forgot password?";

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Top bar — compact on mobile, unchanged on desktop */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 md:p-4">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark size={28} className="text-foreground md:h-8 md:w-8" />
          <span className="font-semibold tracking-tight text-base md:text-lg">OPSQAI</span>
        </Link>
        <button
          onClick={() => setLang(lang === "de" ? "en" : lang === "en" ? "ro" : "de")}
          aria-label="Change language"
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-border/60 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {lang.toUpperCase()}
        </button>
      </div>

      {/*
        Mobile (<md): full-viewport native-app layout — flush edges, no card
        chrome, generous touch targets, full-width primary action.
        Desktop (>=md): the original centered card is preserved verbatim
        via md:* overrides.
      */}
      <main className="flex-1 flex flex-col md:items-center md:justify-center px-5 md:px-4 pt-4 md:py-8">
        <Card
          className={
            // Reset all card chrome on mobile so it looks like a native screen,
            // and restore the desktop card via md: overrides.
            "w-full flex-1 md:flex-none max-w-md " +
            "border-0 bg-transparent shadow-none p-0 " +
            "md:border md:bg-card md:shadow-sm md:p-8 flex flex-col"
          }
        >
          {/* Brand header — bigger logo & type on mobile */}
          <div className="text-center mt-6 md:mt-0 mb-8 md:mb-6">
            <LogoMark
              size={72}
              className="mx-auto mb-5 h-20 w-20 md:h-16 md:w-16 text-foreground"
            />
            <h1 className="text-3xl md:text-2xl font-semibold tracking-tight">OPSQAI</h1>
            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-muted-foreground/70 mt-1.5">
              Operational Knowledge Intelligence
            </p>
            <p className="text-[15px] md:text-sm text-muted-foreground mt-3 md:mt-2">
              {t("tagline")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm md:text-sm">
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-md px-4"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">
                  {t("password")}
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm md:text-xs text-muted-foreground hover:text-foreground min-h-11 md:min-h-0 inline-flex items-center"
                >
                  {forgotLabel}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
                className="h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-md px-4"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 md:h-10 text-base md:text-sm font-semibold rounded-xl md:rounded-md mt-2 md:mt-0"
            >
              {t("signIn")}
            </Button>
          </form>

          {/* Secondary blocks — tighter on mobile, tucked to bottom of viewport */}
          <div className="mt-auto md:mt-6 pt-6 md:pt-0 space-y-3 md:space-y-0">
            <div className="rounded-xl md:rounded-md border border-border bg-muted/40 px-4 py-3 text-center text-[13px] md:text-xs text-muted-foreground md:mt-6">
              {contactAdmin}
            </div>
            <div className="rounded-xl md:rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-center text-[13px] md:text-xs md:mt-4">
              <p className="text-muted-foreground">
                {lang === "de" ? "Kein Konto?"  : "No account yet?"}
              </p>
              <Link
                to="/demo"
                className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {lang === "de"
                  ? "Interaktive Demo starten"
                  
                    : "Launch Interactive Demo"}{" "}
                →
              </Link>
            </div>
            <p className="text-center text-sm md:text-xs text-muted-foreground pt-2 md:pt-0 md:mt-4">
              <Link to="/" className="inline-flex min-h-11 md:min-h-0 items-center hover:underline">
                ← {lang === "de" ? "Zurück"  : "Back"}
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

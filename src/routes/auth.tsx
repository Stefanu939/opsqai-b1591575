import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { Building2, ShieldCheck, HardDrive, ExternalLink } from "lucide-react";

type Audience = "portal" | "mc" | "company";

function parseAudience(raw: unknown): Audience {
  if (raw === "mc" || raw === "portal" || raw === "company") return raw;
  return "portal";
}

// Resolve the landing page after sign-in based on the picked audience
// AND the user's actual roles. On the Windows Self-Hosted install this
// screen never gates by audience — everyone lands in /app.
async function resolvePostLoginTarget(
  userId: string,
  audience: Audience,
): Promise<{ target: string; deny?: string }> {
  if (getClientDeploymentMode() === "selfhost") return { target: "/app" };
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isPlatform = (roles ?? []).some(
    (r) => r.role === "platform_admin" || r.role === "platform_owner",
  );
  if (audience === "mc") {
    if (!isPlatform) return { target: "/portal", deny: "mcAccessDenied" };
    return { target: "/management" };
  }
  // Portal (and any accidental "company" pick — company users have no cloud
  // account and never reach a successful sign-in here anyway).
  return { target: isPlatform ? "/management" : "/portal" };
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string; audience?: Audience } => {
    const out: { next?: string; audience?: Audience } = {};
    if (typeof s.next === "string") out.next = s.next;
    if (s.audience === "mc" || s.audience === "portal" || s.audience === "company") {
      out.audience = s.audience;
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — OPSQAI" },
      {
        name: "description",
        content:
          "Sign in to the OPSQAI Customer Portal or Management Center. Company end users sign in only inside their local Windows installation.",
      },
      { property: "og:title", content: "Sign in — OPSQAI" },
      {
        property: "og:description",
        content:
          "Sign in to the OPSQAI Customer Portal or Management Center. Company end users sign in only inside their local Windows installation.",
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
      if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) throw err;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const explicit =
        search.next && search.next.startsWith("/") && !search.next.startsWith("//")
          ? search.next
          : null;
      const { target } = await resolvePostLoginTarget(
        data.session.user.id,
        parseAudience(search.audience),
      );
      throw redirect({ href: explicit ?? target });
    }
  },

  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const nextParam = search.next;
  const [audience, setAudience] = useState<Audience>(parseAudience(search.audience));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep the URL and local state in sync so /auth?audience=mc is deep-linkable.
  useEffect(() => {
    const current = parseAudience(search.audience);
    if (current !== audience) {
      navigate({
        to: "/auth",
        search: (prev) => ({ ...prev, audience }),
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!s) return;
      const explicit =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
      const { target, deny } = await resolvePostLoginTarget(s.user.id, audience);
      if (deny) {
        toast.error(t(deny as "mcAccessDenied"));
        await supabase.auth.signOut();
        return;
      }
      const dest = explicit ?? target;
      if (dest.startsWith("/app")) {
        navigate({ to: "/app" });
      } else {
        window.location.href = dest;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, nextParam, audience, t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audience === "company") {
      // Company users never authenticate on the cloud.
      navigate({ to: "/windows-only" });
      return;
    }
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

  const forgotLabel = lang === "de" ? "Passwort vergessen?" : "Forgot password?";

  const submitLabel = useMemo(() => {
    if (audience === "mc") return t("signInToMc");
    if (audience === "company") return t("audienceCompanyUserCta");
    return t("signInToPortal");
  }, [audience, t]);

  const isCompany = audience === "company";

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
      <div className="flex items-center justify-between px-5 pt-4 pb-2 md:p-4">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark size={28} className="text-foreground md:h-8 md:w-8" />
          <span className="font-semibold tracking-tight text-base md:text-lg">OPSQAI</span>
        </Link>
        <button
          onClick={() => setLang(lang === "de" ? "en" : "de")}
          aria-label="Change language"
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-border/60 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {lang.toUpperCase()}
        </button>
      </div>

      <main className="flex-1 flex flex-col md:items-center md:justify-center px-5 md:px-4 pt-4 md:py-8">
        <Card
          className={
            "w-full flex-1 md:flex-none max-w-md " +
            "border-0 bg-transparent shadow-none p-0 " +
            "md:border md:bg-card md:shadow-sm md:p-8 flex flex-col"
          }
        >
          <div className="text-center mt-6 md:mt-0 mb-6 md:mb-6">
            <LogoMark
              size={72}
              className="mx-auto mb-5 h-20 w-20 md:h-16 md:w-16 text-foreground"
            />
            <h1 className="text-3xl md:text-2xl font-semibold tracking-tight">OPSQAI</h1>
            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-muted-foreground/70 mt-1.5">
              Operational Knowledge Intelligence
            </p>
          </div>

          {/* Audience picker */}
          <div className="space-y-2 mb-5">
            <Label className="text-sm">{t("audienceLabel")}</Label>
            <Select value={audience} onValueChange={(v) => setAudience(parseAudience(v))}>
              <SelectTrigger className="h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portal">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{t("audiencePortal")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="mc">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{t("audienceMc")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <span>{t("audienceCompanyUser")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {audience === "portal" && t("audiencePortalHint")}
              {audience === "mc" && t("audienceMcHint")}
              {audience === "company" && t("audienceCompanyUserHint")}
            </p>
          </div>

          {isCompany ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                {t("cloudArchitectureNote")}
              </p>
              <Button asChild className="w-full h-12 md:h-10 rounded-xl md:rounded-md">
                <Link to="/windows-only">
                  {submitLabel}
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
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
                {submitLabel}
              </Button>
            </form>
          )}

          <div className="mt-auto md:mt-6 pt-6 md:pt-0 space-y-3 md:space-y-0">
            <div className="rounded-xl md:rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-center text-[13px] md:text-xs md:mt-4">
              <p className="text-muted-foreground">
                {lang === "de" ? "Kein Konto?" : "No account yet?"}
              </p>
              <Link
                to="/contact"
                className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {lang === "de" ? "Vertrieb kontaktieren" : "Contact sales"} →
              </Link>
            </div>
            <p className="text-center text-sm md:text-xs text-muted-foreground pt-2 md:pt-0 md:mt-4">
              <Link to="/" className="inline-flex min-h-11 md:min-h-0 items-center hover:underline">
                ← {lang === "de" ? "Zurück" : "Back"}
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — LogiAssist" },
      { name: "description", content: "Sign in to LogiAssist to access your company's logistics AI assistant, SOPs and knowledge base." },
      { property: "og:title", content: "Sign in — LogiAssist" },
      { property: "og:description", content: "Sign in to LogiAssist to access your company's logistics AI assistant, SOPs and knowledge base." },
      { property: "og:url", content: "https://logiassist.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://logiassist.lovable.app/auth" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success(lang === "de" ? "Konto erstellt. Du kannst dich jetzt anmelden." : "Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="LogiAssist" width={32} height={32} />
          <span className="font-semibold tracking-tight">LogiAssist</span>
        </div>
        <button onClick={() => setLang(lang === "de" ? "en" : "de")} className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          {lang.toUpperCase()} / {lang === "de" ? "EN" : "DE"}
        </button>
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">LogiAssist — Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">{t("fullName")}</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {mode === "signin" ? t("signIn") : t("signUp")}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("or")}</span>
            </div>
          </div>

          <Button variant="outline" onClick={onGoogle} disabled={busy} className="w-full">
            {t("continueWithGoogle")}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? (
              <>
                {lang === "de" ? "Noch kein Konto?" : "Don't have an account?"}{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">{t("signUp")}</button>
              </>
            ) : (
              <>
                {lang === "de" ? "Schon registriert?" : "Already registered?"}{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">{t("signIn")}</button>
              </>
            )}
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">← {lang === "de" ? "Zurück" : "Back"}</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

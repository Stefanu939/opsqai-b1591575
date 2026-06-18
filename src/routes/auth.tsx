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
import logo from "@/assets/opsqai-mark.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — OPSQAI" },
      { name: "description", content: "Sign in to OPSQAI to access your company's logistics AI assistant, SOPs and knowledge base." },
      { property: "og:title", content: "Sign in — OPSQAI" },
      { property: "og:description", content: "Sign in to OPSQAI to access your company's logistics AI assistant, SOPs and knowledge base." },
      { property: "og:url", content: "https://opsqai.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.lovable.app/auth" }],
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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

  const contactAdmin = lang === "de"
    ? "Wenden Sie sich an Ihren Unternehmensadministrator für den Zugang."
    : "Contact your company administrator for access.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="OPSQAI" width={32} height={32} />
          <span className="font-semibold tracking-tight text-lg">OPSQAI</span>
        </div>
        <button onClick={() => setLang(lang === "de" ? "en" : "de")} className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          {lang.toUpperCase()} / {lang === "de" ? "EN" : "DE"}
        </button>
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <img src={logo} alt="" width={64} height={64} className="mx-auto mb-4 drop-shadow-[0_0_20px_rgba(139,124,246,0.4)]" />
            <h1 className="text-2xl font-semibold tracking-tight">OPSQAI</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mt-1">Operational Knowledge Intelligence</p>
            <p className="text-sm text-muted-foreground mt-2">{t("tagline")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {t("signIn")}
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

          <div className="mt-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
            {contactAdmin}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">← {lang === "de" ? "Zurück" : "Back"}</Link>
          </p>
        </Card>
      </main>

    </div>
  );
}

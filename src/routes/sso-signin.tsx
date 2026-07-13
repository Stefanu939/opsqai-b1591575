import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/sso-signin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SSO sign-in — OPSQAI" },
      {
        name: "description",
        content: "Sign in with your company's single sign-on identity provider.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SsoSignInPage,
});

function SsoSignInPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotConfigured(null);
    setErrorMsg(null);
    const trimmed = email.trim().toLowerCase();
    const at = trimmed.indexOf("@");
    if (at < 1 || at === trimmed.length - 1) {
      setErrorMsg("Please enter a valid work email address.");
      return;
    }
    const domain = trimmed.slice(at + 1);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (
          msg.includes("no sso") ||
          msg.includes("not found") ||
          msg.includes("no provider") ||
          msg.includes("unsupported") ||
          msg.includes("domain")
        ) {
          setNotConfigured(domain);
        } else {
          setErrorMsg(error.message);
        }
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg("Unexpected response from identity provider.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not start SSO sign-in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <LogoMark size={28} className="text-foreground" />
          <span className="font-semibold tracking-tight">OPSQAI</span>
        </Link>
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border grid place-items-center text-sky-500 bg-sky-500/10 border-sky-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Sign in with SSO</h1>
              <p className="text-xs text-muted-foreground">Use your company identity provider</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNotConfigured(null);
                  setErrorMsg(null);
                }}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                We'll route you to your organisation's identity provider based on your email domain.
              </p>
            </div>

            {notConfigured && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">
                    SSO is not configured for <span className="font-mono">{notConfigured}</span>{" "}
                    yet.
                  </p>
                  <p className="text-xs">
                    If you're the company administrator, submit your SAML metadata from the SSO
                    configuration page. Otherwise, sign in with email &amp; password or contact your
                    admin.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Continue with SSO
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/auth" className="hover:underline">
              ← Use email &amp; password
            </Link>
            <Link to="/forgot-password" className="hover:underline">
              Forgot password?
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}

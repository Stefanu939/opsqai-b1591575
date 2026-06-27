import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/accept-invite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accept invitation — OPSQAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-parses the access_token from the URL hash on load
    // and emits SIGNED_IN. We confirm we actually have a session before
    // showing the password form.
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        // Give Supabase a brief moment to process the hash, then re-check.
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (cancelled) return;
          if (!d2.session) {
            setInvalid(true);
          } else {
            setEmail(d2.session.user.email ?? null);
            await loadCompany(d2.session.user.id);
            setReady(true);
          }
        }, 400);
        return;
      }
      setEmail(data.session.user.email ?? null);
      await loadCompany(data.session.user.id);
      setReady(true);
    };
    const loadCompany = async (uid: string) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_id, companies:company_id(name)")
        .eq("id", uid)
        .maybeSingle();
      const joined = (prof as { companies?: { name?: string } | null } | null)?.companies;
      setCompany(joined?.name ?? null);
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password set. Welcome to OPSQAI.");
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={48} className="text-foreground" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Accept your invitation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set a password to activate your OPSQAI account.
            </p>
          </div>
        </div>

        {invalid && (
          <div className="text-center text-sm text-destructive">
            This invitation link is invalid or has expired. Please ask your administrator to resend the invite.
          </div>
        )}

        {!invalid && !ready && (
          <div className="text-center text-sm text-muted-foreground">Loading your invitation…</div>
        )}

        {ready && !invalid && (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              {email && <div><span className="text-muted-foreground">Account:</span> <span className="font-medium">{email}</span></div>}
              {company && <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{company}</span></div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Activate account"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

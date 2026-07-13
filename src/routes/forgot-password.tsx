import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — OPSQAI" },
      { name: "description", content: "Request a password reset link for your OPSQAI account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
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
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we'll send you a link to set a new password.
          </p>
          {sent ? (
            <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is
              on its way.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                Send reset link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

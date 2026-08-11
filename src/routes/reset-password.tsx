import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  // `forced=true` is used by the Self-Hosted app shell when the signed-in
  // account still carries `must_change_password` (installer-generated or
  // admin-issued temporary password).
  validateSearch: (search: Record<string, unknown>) => ({
    forced: search["forced"] === true || search["forced"] === "true" || search["forced"] === "1",
  }),
  head: () => ({ meta: [{ title: "Set a new password — OPSQAI" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { forced } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getBrowserAuthProvider();
    // Cloud parses the recovery session from the URL hash automatically.
    // Self-Hosted signals `password_recovery` via a ?reset_token= query param.
    const unsubscribe = auth.onSessionChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    if (forced) setReady(true);
    auth.setSessionFromUrl().then((r) => {
      if (r.session || r.kind === "password_recovery") setReady(true);
    });
    return () => unsubscribe();
  }, [forced]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await getBrowserAuthProvider().updatePassword(password);
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <LogoMark size={28} className="text-foreground" />
          <span className="font-semibold tracking-tight">OPSQAI</span>
        </Link>
      </div>
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {forced ? "Change your temporary password" : "Choose a new password"}
          </h1>
          {forced && (
            <p className="text-sm text-muted-foreground mt-3">
              This account was created with a one-time password. Choose a new one to continue
              into OPSQAI.
            </p>
          )}
          {!ready ? (
            <p className="text-sm text-muted-foreground mt-3">
              Open this page from the link in your reset email. If you got here directly,{" "}
              <Link to="/forgot-password" className="underline">
                request a new link
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                Update password
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}

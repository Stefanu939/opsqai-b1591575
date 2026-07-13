import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getRecoveryState,
  generateBreakGlass,
  redeemBreakGlass,
  redeemBootstrapToken,
  exitRecoveryMode,
  listDrScenarios,
} from "@/lib/dr.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LifeBuoy, KeyRound, ShieldAlert, Copy, RotateCw, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/platform/recovery")({
  component: RecoveryPage,
});

function RecoveryPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const qc = useQueryClient();

  const getState = useServerFn(getRecoveryState);
  const genBg = useServerFn(generateBreakGlass);
  const redeemBg = useServerFn(redeemBreakGlass);
  const redeemBt = useServerFn(redeemBootstrapToken);
  const exitRec = useServerFn(exitRecoveryMode);
  const listSc = useServerFn(listDrScenarios);

  const { data: state } = useQuery({
    queryKey: ["dr-state"],
    queryFn: () => getState({ data: {} } as never),
  });
  const { data: scenarios } = useQuery({
    queryKey: ["dr-scenarios"],
    queryFn: () => listSc({ data: {} } as never),
  });

  const [revealed, setRevealed] = useState<string | null>(null);
  const [bgInput, setBgInput] = useState("");
  const [btInput, setBtInput] = useState("");
  const [reason, setReason] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dr-state"] });

  const genMut = useMutation({
    mutationFn: (replace: boolean) => genBg({ data: { replace_existing: replace } }),
    onSuccess: (r) => {
      setRevealed(r.plaintext);
      toast.success(r.rotated ? "Break-glass secret rotated" : "Break-glass secret generated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeemBgMut = useMutation({
    mutationFn: () => redeemBg({ data: { secret: bgInput, reason: reason || undefined } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("Recovery mode entered");
        setBgInput("");
        invalidate();
      } else {
        toast.error(`Invalid break-glass secret (${r.reason})`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeemBtMut = useMutation({
    mutationFn: () => redeemBt({ data: { token: btInput.trim(), reason: reason || undefined } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("Recovery mode entered via bootstrap token");
        setBtInput("");
        invalidate();
      } else {
        toast.error(`Bootstrap token rejected: ${r.reason}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exitMut = useMutation({
    mutationFn: () => exitRec({ data: {} } as never),
    onSuccess: () => {
      toast.success("Recovery mode cleared");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-7 w-7" /> Disaster Recovery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Break-glass secrets and Bootstrap Recovery Tokens let you re-enter this install after
          catastrophic loss. Anchor: <code className="font-mono">install_id</code>.
        </p>
      </header>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground">install_id</div>
            <div className="font-mono text-sm">{state?.install_id ?? "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {state?.recovery_mode ? (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" /> RECOVERY MODE
              </Badge>
            ) : (
              <Badge variant="secondary">Normal operation</Badge>
            )}
          </div>
        </div>
        {state?.recovery_mode ? (
          <div className="rounded-md border bg-destructive/5 p-3 text-sm">
            <div>
              Since <span className="font-mono">{state.recovery_mode_since ?? "—"}</span>
              {state.recovery_mode_reason ? ` · reason: ${state.recovery_mode_reason}` : ""}
            </div>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => exitMut.mutate()}
              disabled={exitMut.isPending}
            >
              Exit recovery mode
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Break-glass secret
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              A local one-shot secret. Generated here, revealed exactly once. Only its scrypt hash
              persists. Present the plaintext later to enter recovery mode without contacting the
              Management Center.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {state?.break_glass_generated ? (
              <>
                <div>
                  Generated{" "}
                  {state.break_glass_created_at
                    ? new Date(state.break_glass_created_at).toLocaleString()
                    : "—"}
                </div>
                {state.break_glass_used_at ? (
                  <div>Used {new Date(state.break_glass_used_at).toLocaleString()}</div>
                ) : null}
              </>
            ) : (
              <div>Not generated yet</div>
            )}
          </div>
        </div>

        {revealed ? (
          <div className="rounded-md border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Info className="h-4 w-4" /> Store this NOW. It will never be shown again.
            </div>
            <div className="font-mono text-lg break-all select-all">{revealed}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(revealed);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>
                I saved it, dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => genMut.mutate(false)}
              disabled={genMut.isPending || state?.break_glass_generated}
            >
              Generate break-glass secret
            </Button>
            {state?.break_glass_generated ? (
              <Button
                variant="outline"
                onClick={() => genMut.mutate(true)}
                disabled={genMut.isPending}
              >
                <RotateCw className="h-4 w-4 mr-1" /> Rotate (invalidates current)
              </Button>
            ) : null}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <Label htmlFor="bg-input">Redeem break-glass secret</Label>
          <Input
            id="bg-input"
            value={bgInput}
            onChange={(e) => setBgInput(e.target.value)}
            placeholder="Paste the plaintext secret"
            autoComplete="off"
          />
          <Button
            onClick={() => redeemBgMut.mutate()}
            disabled={!bgInput || redeemBgMut.isPending}
            variant="destructive"
          >
            Enter recovery mode
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-medium">Redeem Bootstrap Recovery Token</h2>
        <p className="text-sm text-muted-foreground">
          If the break-glass secret is lost, contact OPSQAI. The Management Center will issue a
          signed token bound to this <code className="font-mono">install_id</code> with a short
          expiry.
        </p>
        <Textarea
          value={btInput}
          onChange={(e) => setBtInput(e.target.value)}
          placeholder="opsqai-dr.v1.…"
          rows={4}
          className="font-mono text-xs"
        />
        <Button
          onClick={() => redeemBtMut.mutate()}
          disabled={!btInput.trim() || redeemBtMut.isPending}
          variant="destructive"
        >
          Redeem bootstrap token
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <Label htmlFor="reason">Recovery reason (optional, audit-only)</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. DB restored on new host, admin account locked out"
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-medium">Disaster Recovery scenarios</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {scenarios?.map((s) => (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{s.title}</div>
              <div className="text-muted-foreground text-xs mt-1">{s.summary}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.paths.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px]">
                    {p}
                  </Badge>
                ))}
                {s.offline_capable ? (
                  <Badge variant="secondary" className="text-[10px]">
                    offline-capable
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    needs MC
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

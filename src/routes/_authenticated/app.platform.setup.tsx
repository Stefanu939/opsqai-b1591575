import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getSetupState, markSetupStep, runDoctor } from "@/lib/setup.functions";
import { SETUP_STEPS, isRequiredStep, computeSetupComplete, type SetupStepId } from "@/lib/setup-steps";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, RefreshCw, Stethoscope, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/platform/setup")({
  component: SetupPage,
});

function SetupPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const qc = useQueryClient();

  const getState = useServerFn(getSetupState);
  const markStep = useServerFn(markSetupStep);
  const doctor = useServerFn(runDoctor);

  const { data: state, isLoading } = useQuery({
    queryKey: ["setup-state"],
    queryFn: () => getState({ data: {} } as never),
  });
  const { data: report, refetch: refetchDoctor, isFetching: doctorRunning } = useQuery({
    queryKey: ["doctor-report"],
    queryFn: () => doctor({ data: {} } as never),
  });

  const markMut = useMutation({
    mutationFn: (v: { step_id: SetupStepId; done: boolean }) => markStep({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setup-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mode: "cloud" | "selfhost" = report?.mode ?? "cloud";
  const done = new Set<string>(
    Array.isArray(state?.setup_progress) ? (state!.setup_progress as string[]) : [],
  );
  const completed = computeSetupComplete(Array.from(done), mode);

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Wrench className="h-7 w-7" /> Setup Wizard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumable install checklist. Only step identifiers are stored — never secrets, keys, or credentials.
          Configuration values live in the installer's environment (docker <code>.env</code>, secret manager)
          and are checked by the wizard, not stored by the app.
        </p>
      </header>

      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Mode</div>
          <div className="font-mono text-sm">{mode}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">install_id</div>
          <div className="font-mono text-sm">{state?.install_id ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">installer_version</div>
          <div className="font-mono text-sm">{state?.installer_version ?? "—"}</div>
        </div>
        <div className="ml-auto">
          {completed ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Setup complete
            </Badge>
          ) : (
            <Badge variant="outline">In progress</Badge>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Latest Doctor snapshot
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchDoctor()}
            disabled={doctorRunning}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${doctorRunning ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </div>
        {report ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.checks.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 rounded border p-2 text-xs">
                <div>
                  <div className="font-medium">{c.label}</div>
                  {c.detail && <div className="text-muted-foreground">{c.detail}</div>}
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Running…</div>
        )}
      </Card>

      <div className="space-y-2">
        {SETUP_STEPS.map((s) => {
          const isDone = done.has(s.id);
          const required = isRequiredStep(s, mode);
          const skipped = s.selfHostedOnly && mode !== "selfhost";
          return (
            <Card key={s.id} className={`p-4 flex items-start gap-3 ${skipped ? "opacity-50" : ""}`}>
              <Checkbox
                checked={isDone}
                disabled={skipped || markMut.isPending}
                onCheckedChange={(v) => markMut.mutate({ step_id: s.id, done: v === true })}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{s.label}</span>
                  {!required && <Badge variant="outline" className="text-[10px]">optional</Badge>}
                  {s.selfHostedOnly && (
                    <Badge variant="outline" className="text-[10px]">self-hosted</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading setup state…</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: "ok" | "warn" | "fail" | "skip" }) {
  if (status === "ok") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">ok</Badge>;
  if (status === "warn") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">warn</Badge>;
  if (status === "fail") return <Badge variant="destructive">fail</Badge>;
  return <Badge variant="outline">skip</Badge>;
}

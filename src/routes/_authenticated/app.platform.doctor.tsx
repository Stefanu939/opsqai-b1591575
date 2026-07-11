import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { runDoctor } from "@/lib/setup.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/platform/doctor")({
  component: DoctorPage,
});

function DoctorPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const doctor = useServerFn(runDoctor);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["doctor-report-page"],
    queryFn: () => doctor({ data: {} } as never),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-7 w-7" /> Doctor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only health probes. Same catalog is exposed by the <code>opsqai doctor</code> CLI so
            green here means green on the box.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Re-run
        </Button>
      </header>

      {data && (
        <>
          <Card className="p-4 flex flex-wrap items-center gap-6 text-sm">
            <Field label="Mode" value={data.mode} />
            <Field label="install_id" value={data.install_id ?? "—"} mono />
            <Field label="installer_version" value={data.installer_version ?? "—"} mono />
            <Field label="Ran at" value={new Date(data.ran_at).toLocaleString()} />
            <div className="ml-auto">
              <StatusBadge status={data.overall} big />
            </div>
          </Card>

          <div className="space-y-2">
            {data.checks.map((c) => (
              <Card key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{c.label}</div>
                  {c.detail && <div className="text-sm text-muted-foreground mt-1 font-mono">{c.detail}</div>}
                </div>
                <StatusBadge status={c.status} />
              </Card>
            ))}
          </div>
        </>
      )}
      {!data && <div className="text-sm text-muted-foreground">Running…</div>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}

function StatusBadge({ status, big }: { status: "ok" | "warn" | "fail" | "skip"; big?: boolean }) {
  const cls = big ? "text-sm px-3 py-1" : "";
  if (status === "ok") return <Badge className={`bg-emerald-500/15 text-emerald-600 border-emerald-500/30 ${cls}`}>ok</Badge>;
  if (status === "warn") return <Badge className={`bg-amber-500/15 text-amber-600 border-amber-500/30 ${cls}`}>warn</Badge>;
  if (status === "fail") return <Badge variant="destructive" className={cls}>fail</Badge>;
  return <Badge variant="outline" className={cls}>skip</Badge>;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, ShieldCheck, Building2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmAction } from "@/components/ui/confirm";
import {
  getInstallationHygiene,
  demoteInstallationOwner,
} from "@/lib/installation-identity.functions";

/**
 * Installation hygiene: which company this installation's data belongs to,
 * whether the active licence still matches, and how many protected owner
 * accounts exist. Self-Hosted only.
 */
export function InstallationHygienePanel() {
  const fetchReport = useServerFn(getInstallationHygiene);
  const demote = useServerFn(demoteInstallationOwner);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["installation-hygiene"],
    queryFn: () => fetchReport(),
  });

  const demoteMutation = useMutation({
    mutationFn: (userId: string) => demote({ data: { userId } }),
    onSuccess: () => {
      toast.success("Account changed to administrator");
      queryClient.invalidateQueries({ queryKey: ["installation-hygiene"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message.replace(/^Error:\s*/, "")),
  });

  if (!data?.selfHosted) return null;

  const extraOwners = data.ownerCount > 1;

  return (
    <Panel
      title="Installation identity"
      description="This installation's data belongs to one company only."
      icon={data.mismatch || extraOwners ? ShieldAlert : ShieldCheck}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Owning company" value={data.ownerCompany ?? "Not recorded yet"} />
        <Field label="Active licence" value={data.licenseCompany ?? "None installed"} />
        <Field label="Installation ID" value={data.installId ?? "—"} mono />
      </div>

      {data.mismatch && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          The installed licence belongs to a different company than the data on this server.
          The platform stays restricted until a licence for{" "}
          <strong>{data.ownerCompany ?? "the owning company"}</strong> is activated. For a new
          company, run a clean installation instead.
        </p>
      )}

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Protected owner accounts
          <Badge variant={extraOwners ? "destructive" : "secondary"}>{data.ownerCount}</Badge>
        </div>
        {extraOwners && (
          <p className="mb-3 text-sm text-muted-foreground">
            An installation should have exactly one owner. Extra owners usually come from a
            reinstall on this machine — change them to administrators.
          </p>
        )}
        <ul className="divide-y rounded-lg border">
          {data.owners.map((owner, index) => (
            <li key={owner.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="truncate">
                {owner.email}
                {index === 0 && (
                  <Badge variant="secondary" className="ml-2">
                    First owner
                  </Badge>
                )}
              </span>
              {extraOwners && index > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={demoteMutation.isPending}
                  onClick={async () => {
                    const ok = await confirmAction({
                      title: "Change to administrator?",
                      description: `${owner.email} loses owner rights but keeps administrator access.`,
                      confirmLabel: "Change role",
                    });
                    if (ok) demoteMutation.mutate(owner.id);
                  }}
                >
                  <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                  Make administrator
                </Button>
              )}
            </li>
          ))}
          {data.owners.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No owner account found.</li>
          )}
        </ul>
      </div>
    </Panel>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

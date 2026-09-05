import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { listCompanyCollaborators, setCompanyCollaborator } from "@/lib/mc-ownership.functions";
import { useOwnershipCards } from "@/components/mc/owner-cards";

/**
 * Shared access ("holiday cover"): colleagues who are not the owner but may
 * still work on this customer. Ownership itself is changed on the Customers
 * table by a SuperAdmin.
 */
export function SharedAccessPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { session, loading } = useAuth();
  const listFn = useServerFn(listCompanyCollaborators);
  const setFn = useServerFn(setCompanyCollaborator);
  const ownership = useOwnershipCards();

  const { data: collaborators = [] } = useQuery({
    queryKey: ["mc-collaborators", companyId],
    queryFn: () => listFn({ data: { company_id: companyId } }),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: (v: { user_id: string; shared: boolean }) =>
      setFn({ data: { company_id: companyId, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mc-collaborators", companyId] });
      qc.invalidateQueries({ queryKey: ["mc-ownership-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const staff = (ownership.data?.cards ?? []).filter((c) => c.user_id);
  if (!staff.length) return null;
  const sharedWith = new Set(collaborators.map((c) => c.user_id));

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Shared access</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Colleagues ticked here can also see and manage this customer — useful while the owner is on
        holiday.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {staff.map((c) => {
          const id = c.user_id as string;
          return (
            <label key={id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={sharedWith.has(id)}
                onCheckedChange={(v) => mut.mutate({ user_id: id, shared: Boolean(v) })}
              />
              <span className="truncate">
                {c.name}
                {c.email ? (
                  <span className="ml-1 text-xs text-muted-foreground">{c.email}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

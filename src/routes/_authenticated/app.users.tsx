import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listUsers,
  inviteUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from "@/lib/users.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/users")({
  head: () => ({ meta: [{ title: "Users — OPSQAI" }] }),
  component: UsersPage,
});

type Role = "workspace_owner" | "admin" | "manager" | "supervisor" | "worker" | "viewer";
const ROLES: Role[] = ["workspace_owner", "admin", "manager", "supervisor", "worker", "viewer"];

function UsersPage() {
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteUser);
  const updateFn = useServerFn(updateUser);
  const deleteFn = useServerFn(deleteUser);
  const resetFn = useServerFn(resetUserPassword);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["app-users"],
    queryFn: () => listFn({ data: {} }),
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("worker");

  const invite = useMutation({
    mutationFn: () =>
      inviteFn({
        data: { email, first_name: firstName, last_name: lastName, role },
      }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("worker");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onToggleActive(id: string, isActive: boolean) {
    try {
      await updateFn({ data: { id, is_active: !isActive } });
      toast.success(!isActive ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onReset(id: string) {
    if (!confirm("Send password reset email to this user?")) return;
    try {
      await resetFn({ data: { id } });
      toast.success("Reset email sent");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const rows = list.data ?? [];

  return (
    <div className="p-6 md:p-10 max-w-6xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="Users"
        description="Directory of workspace members. Invite new users, assign roles, or deactivate access."
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-1" /> Invite user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite user</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>First name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
                  Send invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {rows.length === 0 && !list.isLoading ? (
        <EmptyState icon={Users} title="No users yet" description="Invite the first workspace member to get started." />
      ) : (
        <DataTable
          rows={rows}
          keyField="id"
          empty={{ icon: Users, title: "No users" }}
          columns={[
            {
              key: "email",
              header: "User",
              cell: (r) => (
                <div>
                  <div className="font-medium text-sm">
                    {r.first_name || r.last_name ? `${r.first_name ?? ""} ${r.last_name ?? ""}` : r.email}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </div>
              ),
            },
            {
              key: "roles",
              header: "Roles",
              cell: (r) => (
                <div className="flex flex-wrap gap-1">
                  {(r.roles ?? []).map((role) => (
                    <Badge key={role} variant="outline" className="text-[10px]">
                      {role}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: "department_name",
              header: "Department",
              cell: (r) => r.department_name ?? "—",
            },
            {
              key: "last_sign_in_at",
              header: "Last sign-in",
              cell: (r) =>
                r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString() : "—",
            },
            {
              key: "is_active",
              header: "Status",
              cell: (r) => (
                <Badge variant={r.is_active ? "default" : "outline"}>
                  {r.is_active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              cell: (r) => (
                <div className="flex gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleActive(r.id, r.is_active)}
                  >
                    {r.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onReset(r.id)}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onDelete(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

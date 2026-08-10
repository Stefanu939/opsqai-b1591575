import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listUsers,
  inviteUser,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/users.functions";
import { listAssignableRoles } from "@/lib/rbac.functions";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import emptyTeamIllustration from "@/assets/empty-team.png";
import { DataTable, type Column } from "@/components/ui/data-table";
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
import { Users, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmAction } from "@/components/ui/confirm";

export const Route = createFileRoute("/_authenticated/app/users")({
  head: () => ({ meta: [{ title: "Users — OPSQAI" }] }),
  component: UsersPage,
});

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  department_name: string | null;
  last_sign_in_at: string | null;
  is_active: boolean;
  roles: string[];
}

function UsersPage() {
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteUser);
  const createFn = useServerFn(createUser);
  const roleFn = useServerFn(listAssignableRoles);
  const updateFn = useServerFn(updateUser);
  const deleteFn = useServerFn(deleteUser);
  const qc = useQueryClient();
  const selfHosted = getClientDeploymentMode() === "selfhost";

  const list = useQuery({
    queryKey: ["app-users"],
    queryFn: () => listFn({ data: {} }),
  });
  const roleList = useQuery({ queryKey: ["assignable-roles"], queryFn: () => roleFn() });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("employee");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const invite = useMutation({
    mutationFn: () =>
      selfHosted
        ? createFn({ data: { email, password: temporaryPassword, first_name: firstName, last_name: lastName, role, must_change_password: true } })
        : inviteFn({ data: { email, first_name: firstName, last_name: lastName, role } }),
    onSuccess: () => {
      toast.success(selfHosted ? "User created with a temporary password" : "Invitation sent");
      setInviteOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("employee");
      setTemporaryPassword("");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onToggleActive(id: string, isActive: boolean) {
    try {
      await updateFn({ data: { user_id: id, is_active: !isActive } });
      toast.success(!isActive ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete(id: string) {
    if (
      !(await confirmAction({
        title: "Permanently delete this user?",
        description: "This cannot be undone.",
        confirmLabel: "Delete user",
      }))
    )
      return;
    try {
      await deleteFn({ data: { user_id: id } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const rows = (list.data ?? []) as UserRow[];

  const columns: Column<UserRow>[] = [
    {
      key: "email",
      header: "User",
      render: (r) => (
        <div>
          <div className="font-medium text-sm">
            {r.first_name || r.last_name
              ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
              : r.email}
          </div>
          <div className="text-xs text-muted-foreground">{r.email}</div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (r) => (
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
      render: (r) => r.department_name ?? "—",
    },
    {
      key: "last_sign_in_at",
      header: "Last sign-in",
      render: (r) =>
        r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString() : "—",
    },
    {
      key: "is_active",
      header: "Status",
      render: (r) => (
        <Badge variant={r.is_active ? "default" : "outline"}>
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleActive(r.id, r.is_active)}
          >
            {r.is_active ? "Deactivate" : "Activate"}
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
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="Users"
        description={selfHosted ? "Create local users, assign roles, and control access to this installation." : "Directory of workspace members. Invite new users, assign roles, or deactivate access."}
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-1" /> {selfHosted ? "Create user" : "Invite user"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selfHosted ? "Create local user" : "Invite user"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {selfHosted ? <div><Label>Temporary password</Label><Input type="password" autoComplete="new-password" value={temporaryPassword} onChange={(e)=>setTemporaryPassword(e.target.value)} placeholder="Minimum 8 characters" /></div> : null}
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
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(roleList.data ?? []).map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.name}
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
                <Button onClick={() => invite.mutate()} disabled={!email || (selfHosted && temporaryPassword.length < 8) || invite.isPending}>
                  {selfHosted ? "Create user" : "Send invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {rows.length === 0 && !list.isLoading ? (
        <EmptyState
          illustration={emptyTeamIllustration}
          title="No users yet"
          description="Invite the first workspace member to get started."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          loading={list.isLoading}
          columns={columns}
          empty={{ icon: Users, title: "No users" }}
        />
      )}
    </div>
  );
}

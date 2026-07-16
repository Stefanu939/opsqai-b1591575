import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listTeamMembers,
  listTeamDepartments,
  createTeamDepartment,
  deleteTeamDepartment,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  promoteToPlatformAdmin,
  demoteFromPlatformAdmin,
  resetTeamMemberPassword,
} from "@/lib/team.functions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  Crown,
  KeyRound,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/team")({
  head: () => ({ meta: [{ title: "Team — Management Center" }] }),
  component: TeamPage,
});

type Member = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  position: string | null;
  phone: string | null;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean | null;
  last_sign_in_at: string | null;
  created_at: string;
  roles: string[];
  is_platform_owner: boolean;
  is_platform_admin: boolean;
};

type Dept = { id: string; name: string };

const INTERNAL_ROLES = ["admin", "manager", "team_leader", "employee"] as const;
type InternalRole = (typeof INTERNAL_ROLES)[number];

function initials(m: Member): string {
  const s =
    m.full_name ||
    [m.first_name, m.last_name].filter(Boolean).join(" ") ||
    m.email;
  return s
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function TeamPage() {
  const listFn = useServerFn(listTeamMembers);
  const listDeptFn = useServerFn(listTeamDepartments);
  const createDeptFn = useServerFn(createTeamDepartment);
  const deleteDeptFn = useServerFn(deleteTeamDepartment);
  const createFn = useServerFn(createTeamMember);
  const updateFn = useServerFn(updateTeamMember);
  const deleteFn = useServerFn(deleteTeamMember);
  const promoteFn = useServerFn(promoteToPlatformAdmin);
  const demoteFn = useServerFn(demoteFromPlatformAdmin);
  const resetPwFn = useServerFn(resetTeamMemberPassword);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [openEdit, setOpenEdit] = useState<Member | null>(null);
  const [openReset, setOpenReset] = useState<Member | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);

  const membersQ = useQuery({
    queryKey: ["mc-team"],
    queryFn: () => listFn() as Promise<Member[]>,
  });
  const deptsQ = useQuery({
    queryKey: ["mc-team-depts"],
    queryFn: () => listDeptFn() as Promise<Dept[]>,
  });

  const members = membersQ.data ?? [];
  const depts = deptsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.full_name || `${m.first_name ?? ""} ${m.last_name ?? ""}`).toLowerCase();
      return (
        name.includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.position ?? "").toLowerCase().includes(q) ||
        (m.department_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mc-team"] });
    qc.invalidateQueries({ queryKey: ["mc-team-depts"] });
  };

  const promote = useMutation({
    mutationFn: (id: string) => promoteFn({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Promoted to Super Admin");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const demote = useMutation({
    mutationFn: (id: string) => demoteFn({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Demoted from Super Admin");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Team member deleted");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleActive = useMutation({
    mutationFn: (m: Member) =>
      updateFn({ data: { user_id: m.id, is_active: !m.is_active } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        eyebrow="OPSQAI"
        title="Team"
        description="Manage OPSQAI employees, departments, and Super Admin permissions."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDept(true)}>
              <Building2 className="h-4 w-4 mr-1.5" /> Departments
            </Button>
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Add member
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat icon={Users} label="Employees" value={members.length} />
        <Stat
          icon={ShieldCheck}
          label="Super Admins"
          value={members.filter((m) => m.is_platform_admin).length}
        />
        <Stat icon={Building2} label="Departments" value={depts.length} />
      </div>

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, position…"
          className="h-9 max-w-md"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Member</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-left px-4 py-2.5">Department</th>
                <th className="text-left px-4 py-2.5">Position</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Last sign-in</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {membersQ.isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No team members yet. Click <b>Add member</b> to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isSelf = false; // server prevents dangerous self-actions
                  const primaryRole =
                    m.roles.find((r) => r !== "platform_admin" && r !== "platform_owner") ??
                    "employee";
                  return (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                            {initials(m)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {m.full_name ||
                                `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() ||
                                m.email}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.is_platform_owner && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                              <Crown className="h-3 w-3 mr-1" /> Owner
                            </Badge>
                          )}
                          {m.is_platform_admin && !m.is_platform_owner && (
                            <Badge variant="default">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Super Admin
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {primaryRole.replace("_", " ")}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.department_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.position ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!m.is_active}
                            disabled={m.is_platform_owner || toggleActive.isPending}
                            onCheckedChange={() => toggleActive.mutate(m)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {m.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {m.last_sign_in_at
                          ? new Date(m.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => setOpenEdit(m)}>
                              Edit
                            </DropdownMenuItem>
                            {!m.is_platform_owner && (
                              m.is_platform_admin ? (
                                <DropdownMenuItem
                                  onClick={() => demote.mutate(m.id)}
                                  disabled={isSelf}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" /> Demote from Super Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => promote.mutate(m.id)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" /> Promote to Super Admin
                                </DropdownMenuItem>
                              )
                            )}
                            <DropdownMenuItem onClick={() => setOpenReset(m)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset password
                            </DropdownMenuItem>
                            {!m.is_platform_owner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setConfirmDelete(m)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateMemberDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        depts={depts}
        onSubmit={async (payload) => {
          try {
            await createFn({ data: payload });
            toast.success("Team member created");
            setOpenCreate(false);
            invalidate();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <EditMemberDialog
        member={openEdit}
        onOpenChange={(o) => !o && setOpenEdit(null)}
        depts={depts}
        onSubmit={async (payload) => {
          try {
            await updateFn({ data: payload });
            toast.success("Saved");
            setOpenEdit(null);
            invalidate();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <ResetPasswordDialog
        member={openReset}
        onOpenChange={(o) => !o && setOpenReset(null)}
        onSubmit={async (user_id, new_password) => {
          try {
            await resetPwFn({ data: { user_id, new_password } });
            toast.success("Password updated");
            setOpenReset(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <DepartmentsDialog
        open={openDept}
        onOpenChange={setOpenDept}
        depts={depts}
        onCreate={async (name) => {
          try {
            await createDeptFn({ data: { name } });
            invalidate();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteDeptFn({ data: { id } });
            invalidate();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <b>{confirmDelete?.email}</b> and removes their access
              to OPSQAI. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </Card>
  );
}

function CreateMemberDialog({
  open,
  onOpenChange,
  depts,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  depts: Dept[];
  onSubmit: (payload: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    phone?: string;
    department_id?: string | null;
    role: InternalRole;
    make_platform_admin: boolean;
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [role, setRole] = useState<InternalRole>("employee");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPosition("");
    setPhone("");
    setDeptId("");
    setRole("employee");
    setSuperAdmin(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add OPSQAI team member</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@opsqai.de"
            />
          </div>
          <div className="col-span-2">
            <Label>Temporary password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <Label>First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>Position</Label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Support Engineer"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="— none —" />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InternalRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Grant Super Admin</div>
              <div className="text-xs text-muted-foreground">
                Full platform access across every workspace.
              </div>
            </div>
            <Switch checked={superAdmin} onCheckedChange={setSuperAdmin} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !email.trim() || password.length < 8}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  email: email.trim(),
                  password,
                  first_name: firstName.trim() || undefined,
                  last_name: lastName.trim() || undefined,
                  position: position.trim() || undefined,
                  phone: phone.trim() || undefined,
                  department_id: deptId || null,
                  role,
                  make_platform_admin: superAdmin,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Creating…" : "Create member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({
  member,
  onOpenChange,
  depts,
  onSubmit,
}: {
  member: Member | null;
  onOpenChange: (o: boolean) => void;
  depts: Dept[];
  onSubmit: (payload: {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
    phone?: string | null;
    department_id?: string | null;
    role?: InternalRole;
  }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [role, setRole] = useState<InternalRole>("employee");
  const [busy, setBusy] = useState(false);

  const open = !!member;

  // Initialize when opening.
  useMemo(() => {
    if (member) {
      setFirstName(member.first_name ?? "");
      setLastName(member.last_name ?? "");
      setPosition(member.position ?? "");
      setPhone(member.phone ?? "");
      setDeptId(member.department_id ?? "");
      const r =
        (member.roles.find(
          (x) => x !== "platform_admin" && x !== "platform_owner",
        ) as InternalRole | undefined) ?? "employee";
      setRole(INTERNAL_ROLES.includes(r as InternalRole) ? r : "employee");
    }
  }, [member?.id]);

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {member.email}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>Position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="— none —" />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InternalRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  user_id: member.id,
                  first_name: firstName || null,
                  last_name: lastName || null,
                  position: position || null,
                  phone: phone || null,
                  department_id: deptId || null,
                  role,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  member,
  onOpenChange,
  onSubmit,
}: {
  member: Member | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (user_id: string, new_password: string) => Promise<void>;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const open = !!member;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPw("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New password for {member?.email}</Label>
          <Input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || pw.length < 8}
            onClick={async () => {
              if (!member) return;
              setBusy(true);
              try {
                await onSubmit(member.id, pw);
                setPw("");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsDialog({
  open,
  onOpenChange,
  depts,
  onCreate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  depts: Dept[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OPSQAI departments</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New department name"
          />
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate(name.trim());
                setName("");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {depts.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No departments yet.
            </div>
          ) : (
            depts.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm">{d.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onDelete(d.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  resetUserPassword,
  updateUserEmail,
  updateUserAvatar,
  clearUserAvatar,
  listDepartments,
} from "@/lib/users.functions";
import { listAssignableRoles } from "@/lib/rbac.functions";
import {
  listLicensedModules,
  getUserModuleAccess,
  setUserModuleAccess,
} from "@/lib/module-access.functions";
import { ModuleAccessPicker, presetModulesFor } from "@/components/users/module-access-picker";
import { AreaRightsPicker } from "@/components/users/area-rights-picker";
import { getUserAreaRights, setUserAreaRights } from "@/lib/area-rights.functions";
import type { AreaRightChoice, AreaAction } from "@/lib/area-rights";
import { normalizeAppRole } from "@/lib/module-access";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useAvatarUrl, initialsOf } from "@/lib/avatar";
import { ModulePage } from "@/components/app/module-page";
import { EmptyState } from "@/components/ui/empty-state";
import emptyTeamIllustration from "@/assets/empty-team.png";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, KeyRound, Mail, Camera } from "lucide-react";
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
  avatar_url: string | null;
  position: string | null;
  department_id: string | null;
  department_name: string | null;
  last_sign_in_at: string | null;
  is_active: boolean;
  roles: string[];
  email_confirmed: boolean;
  account_disabled: boolean;
  invited: boolean;
}

function accountStatus(r: UserRow): { label: string; variant: "default" | "outline" | "secondary" } {
  if (r.account_disabled || !r.is_active) return { label: "Disabled", variant: "outline" };
  if (r.invited) return { label: "Invited", variant: "secondary" };
  return { label: "Active", variant: "default" };
}

function fullNameOf(r: UserRow) {
  return r.first_name || r.last_name ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() : r.email;
}

function UserAvatar({ r, size = "h-10 w-10" }: { r: UserRow; size?: string }) {
  const url = useAvatarUrl(r.avatar_url);
  return (
    <Avatar className={size}>
      {url ? <AvatarImage src={url} alt={fullNameOf(r)} /> : null}
      <AvatarFallback>{initialsOf({ fullName: fullNameOf(r), email: r.email })}</AvatarFallback>
    </Avatar>
  );
}

function UsersPage() {
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteUser);
  const createFn = useServerFn(createUser);
  const roleFn = useServerFn(listAssignableRoles);
  const deptFn = useServerFn(listDepartments);
  const updateFn = useServerFn(updateUser);
  const deleteFn = useServerFn(deleteUser);
  const resetPasswordFn = useServerFn(resetUserPassword);
  const updateEmailFn = useServerFn(updateUserEmail);
  const updateAvatarFn = useServerFn(updateUserAvatar);
  const clearAvatarFn = useServerFn(clearUserAvatar);
  const licensedFn = useServerFn(listLicensedModules);
  const setModulesFn = useServerFn(setUserModuleAccess);
  const getModulesFn = useServerFn(getUserModuleAccess);
  const getRightsFn = useServerFn(getUserAreaRights);
  const setRightsFn = useServerFn(setUserAreaRights);
  const qc = useQueryClient();
  const selfHosted = getClientDeploymentMode() === "selfhost";

  const list = useQuery({
    queryKey: ["app-users"],
    queryFn: () => listFn({ data: {} }),
  });
  const roleList = useQuery({ queryKey: ["assignable-roles"], queryFn: () => roleFn() });
  const deptList = useQuery({ queryKey: ["app-departments"], queryFn: () => deptFn() });
  const licensedList = useQuery({
    queryKey: ["licensed-modules"],
    queryFn: () => licensedFn() as Promise<string[]>,
    staleTime: 5 * 60 * 1000,
  });
  const licensed = licensedList.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["app-users"] });

  // ---- Invite / create dialog ----
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("employee");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newModules, setNewModules] = useState<string[] | null>(null);
  const createModules = newModules ?? presetModulesFor(role, licensed);

  const onRoleChange = (next: string) => {
    setRole(next);
    setNewModules(null);
  };

  const invite = useMutation({
    mutationFn: async () => {
      if (selfHosted) {
        return createFn({
          data: {
            email,
            password: temporaryPassword,
            first_name: firstName,
            last_name: lastName,
            role,
            must_change_password: true,
            ...(normalizeAppRole(role) === "superadmin" ? {} : { modules: createModules }),
          },
        });
      }
      const res = await inviteFn({
        data: { email, first_name: firstName, last_name: lastName, role },
      });
      const invitedId = (res as { user_id?: string } | null)?.user_id;
      if (invitedId && normalizeAppRole(role) !== "superadmin") {
        await setModulesFn({ data: { user_id: invitedId, modules: createModules } }).catch(() => {});
      }
      return res;
    },
    onSuccess: () => {
      toast.success(selfHosted ? "User created with a temporary password" : "Invitation sent");
      setInviteOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("employee");
      setTemporaryPassword("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Detail sheet ----
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editDepartment, setEditDepartment] = useState<string>("none");
  const [editRole, setEditRole] = useState("employee");
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editRights, setEditRights] = useState<AreaRightChoice[]>([]);

  const detailAccess = useQuery({
    queryKey: ["user-module-access", detailUser?.id],
    enabled: !!detailUser,
    queryFn: async () => {
      const res = (await getModulesFn({ data: { user_id: detailUser!.id } })) as {
        role: string;
        superadmin: boolean;
        modules: string[];
      };
      setEditModules(res.modules);
      return res;
    },
  });

  const saveModules = useMutation({
    mutationFn: () => setModulesFn({ data: { user_id: detailUser!.id, modules: editModules } }),
    onSuccess: () => {
      toast.success("Module access updated");
      qc.invalidateQueries({ queryKey: ["user-module-access", detailUser?.id] });
      qc.invalidateQueries({ queryKey: ["my-module-access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailRights = useQuery({
    queryKey: ["user-area-rights", detailUser?.id],
    enabled: selfHosted && !!detailUser,
    queryFn: async () => {
      const result = await getRightsFn({ data: { user_id: detailUser!.id } }) as {
        unrestricted: boolean;
        catalog: Array<{ areaKey: string; action: AreaAction; permissionKey: string }>;
        rights: Array<{ areaKey: string; action: AreaAction; granted: boolean }>;
      };
      setEditRights(result.rights.map((right) => ({ area: right.areaKey, action: right.action, granted: right.granted })));
      return result;
    },
  });

  const saveRights = useMutation({
    mutationFn: () => setRightsFn({ data: { user_id: detailUser!.id, rights: editRights } }),
    onSuccess: () => {
      toast.success("Functional rights updated");
      qc.invalidateQueries({ queryKey: ["user-area-rights", detailUser?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = (r: UserRow) => {
    setDetailUser(r);
    setEditFirst(r.first_name ?? "");
    setEditLast(r.last_name ?? "");
    setEditPosition(r.position ?? "");
    setEditDepartment(r.department_id ?? "none");
    setEditRole(r.roles?.[0] ?? "employee");
    setNewEmail(r.email);
    setEditModules([]);
    setEditRights([]);
  };

  const saveEdit = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          user_id: detailUser!.id,
          first_name: editFirst || null,
          last_name: editLast || null,
          position: editPosition || null,
          department_id: editDepartment === "none" ? null : editDepartment,
        },
      }),
    onSuccess: () => {
      toast.success("User updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRole = useMutation({
    mutationFn: async () => {
      if (
        !(await confirmAction({
          title: "Change this user's role?",
          description: `Their permissions will change immediately to "${editRole}".`,
          confirmLabel: "Change role",
        }))
      )
        throw new Error("__cancelled");
      return updateFn({ data: { user_id: detailUser!.id, roles: [editRole] } });
    },
    onSuccess: () => {
      toast.success("Role updated");
      invalidate();
    },
    onError: (e: Error) => {
      if (e.message !== "__cancelled") toast.error(e.message);
    },
  });

  const changeEmail = useMutation({
    mutationFn: async () => {
      if (
        !(await confirmAction({
          title: "Change this user's email address?",
          description: `Sign-in email will change to "${newEmail}". They must use the new address next time.`,
          confirmLabel: "Change email",
        }))
      )
        throw new Error("__cancelled");
      return updateEmailFn({ data: { user_id: detailUser!.id, new_email: newEmail } });
    },
    onSuccess: () => {
      toast.success("Email updated");
      setEmailOpen(false);
      invalidate();
    },
    onError: (e: Error) => {
      if (e.message !== "__cancelled") toast.error(e.message);
    },
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (
        !(await confirmAction({
          title: "Reset this user's password?",
          description: "This sets a new temporary password and signs the user out everywhere.",
          confirmLabel: "Reset password",
        }))
      )
        throw new Error("__cancelled");
      return resetPasswordFn({
        data: { user_id: detailUser!.id, new_password: newPassword, must_change_password: true },
      });
    },
    onSuccess: () => {
      toast.success("Password reset. Share the temporary password with the user.");
      setPwOpen(false);
      setNewPassword("");
    },
    onError: (e: Error) => {
      if (e.message !== "__cancelled") toast.error(e.message);
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const data_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return updateAvatarFn({
        data: {
          user_id: detailUser!.id,
          filename: file.name,
          content_type: file.type as "image/jpeg" | "image/png" | "image/webp",
          data_base64,
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Profile picture updated");
      setDetailUser((u) => (u ? { ...u, avatar_url: res.path } : u));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAvatar = useMutation({
    mutationFn: () => clearAvatarFn({ data: { user_id: detailUser!.id } }),
    onSuccess: () => {
      toast.success("Profile picture removed");
      setDetailUser((u) => (u ? { ...u, avatar_url: null } : u));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onToggleActive(id: string, isActive: boolean) {
    try {
      await updateFn({ data: { user_id: id, is_active: !isActive } });
      toast.success(!isActive ? "User activated" : "User deactivated");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete(id: string, close?: boolean) {
    if (
      !(await confirmAction({
        title: "Are you sure you want to delete this user?",
        description: "This permanently removes their account and cannot be undone.",
        confirmLabel: "Delete user",
      }))
    )
      return;
    try {
      await deleteFn({ data: { user_id: id } });
      toast.success("User deleted");
      if (close) setDetailUser(null);
      invalidate();
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
        <div className="flex items-center gap-2">
          <UserAvatar r={r} size="h-8 w-8" />
          <div>
            <div className="font-medium text-sm">{fullNameOf(r)}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
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
      render: (r) => (r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString() : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const s = accountStatus(r);
        return (
          <div className="flex items-center gap-1">
            <Badge variant={s.variant}>{s.label}</Badge>
            {!r.email_confirmed ? (
              <Badge variant="outline" className="text-[10px]">
                Email unverified
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>
            Manage
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onToggleActive(r.id, r.is_active)}>
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
    <ModulePage
      eyebrow="Access"
      title="Users"
      description={
        selfHosted
          ? "Create local users, assign roles, and control access to this installation."
          : "Directory of workspace members. Invite new users, assign roles, or deactivate access."
      }
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
              {selfHosted ? (
                <div>
                  <Label>Temporary password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              ) : null}
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
                <Select value={role} onValueChange={onRoleChange}>
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
              <div>
                <Label>Accessible modules</Label>
                <div className="mt-1">
                  <ModuleAccessPicker
                    role={role}
                    licensed={licensed}
                    value={createModules}
                    onChange={setNewModules}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => invite.mutate()}
                disabled={
                  !email || (selfHosted && temporaryPassword.length < 8) || invite.isPending
                }
              >
                {invite.isPending ? "Working…" : selfHosted ? "Create user" : "Send invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
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

      <Sheet open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailUser ? (
            <>
              <SheetHeader>
                <SheetTitle>Manage user</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div className="flex items-center gap-4">
                  <UserAvatar r={detailUser} size="h-16 w-16" />
                  <div className="flex-1">
                    <div className="font-medium">{fullNameOf(detailUser)}</div>
                    <div className="text-sm text-muted-foreground">{detailUser.email}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant={accountStatus(detailUser).variant}>
                        {accountStatus(detailUser).label}
                      </Badge>
                      {!detailUser.email_confirmed ? (
                        <Badge variant="outline" className="text-[10px]">
                          Email unverified
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last sign-in:{" "}
                      {detailUser.last_sign_in_at
                        ? new Date(detailUser.last_sign_in_at).toLocaleString()
                        : "Never"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button asChild size="sm" variant="outline" disabled={uploadAvatar.isPending}>
                      <span>
                        <Camera className="h-3.5 w-3.5 mr-1" />
                        {uploadAvatar.isPending ? "Uploading…" : "Change picture"}
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar.mutate(file);
                      e.target.value = "";
                    }}
                  />
                  {detailUser.avatar_url ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearAvatar.mutate()}
                      disabled={clearAvatar.isPending}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>First name</Label>
                    <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Job title / position</Label>
                  <Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={editDepartment} onValueChange={setEditDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {(deptList.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>
                  {saveEdit.isPending ? "Saving…" : "Save profile"}
                </Button>

                <div className="border-t pt-4">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Select value={editRole} onValueChange={setEditRole}>
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
                    <Button
                      size="sm"
                      onClick={() => saveRole.mutate()}
                      disabled={saveRole.isPending || editRole === (detailUser.roles?.[0] ?? "employee")}
                    >
                      {saveRole.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                {selfHosted ? (
                  <div className="border-t pt-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Label>Functional rights</Label>
                      {detailRights.data?.unrestricted ? null : (
                        <Button size="sm" onClick={() => saveRights.mutate()} disabled={saveRights.isPending || detailRights.isLoading}>
                          {saveRights.isPending ? "Saving…" : "Save rights"}
                        </Button>
                      )}
                    </div>
                    {detailRights.isLoading ? <div className="text-sm text-muted-foreground">Loading rights…</div> : (
                      <AreaRightsPicker
                        catalog={detailRights.data?.catalog ?? []}
                        value={editRights}
                        onChange={setEditRights}
                        unrestricted={detailRights.data?.unrestricted}
                        disabled={saveRights.isPending}
                      />
                    )}
                  </div>
                ) : null}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Accessible modules</Label>
                    {detailAccess.data?.superadmin ? null : (
                      <Button
                        size="sm"
                        onClick={() => saveModules.mutate()}
                        disabled={saveModules.isPending || detailAccess.isLoading}
                      >
                        {saveModules.isPending ? "Saving…" : "Save modules"}
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    {detailAccess.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading module access…</div>
                    ) : (
                      <ModuleAccessPicker
                        role={detailAccess.data?.role ?? editRole}
                        licensed={licensed}
                        value={editModules}
                        onChange={setEditModules}
                        disabled={saveModules.isPending}
                      />
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-wrap gap-2">
                  <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Mail className="h-3.5 w-3.5 mr-1" /> Change email
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change email address</DialogTitle>
                      </DialogHeader>
                      <div>
                        <Label>New email</Label>
                        <Input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => changeEmail.mutate()}
                          disabled={changeEmail.isPending || !newEmail}
                        >
                          {changeEmail.isPending ? "Saving…" : "Change email"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset password</DialogTitle>
                      </DialogHeader>
                      <div>
                        <Label>New temporary password</Label>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPwOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => resetPassword.mutate()}
                          disabled={resetPassword.isPending || newPassword.length < 8}
                        >
                          {resetPassword.isPending ? "Resetting…" : "Reset password"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(detailUser.id, true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete user
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </ModulePage>
  );
}

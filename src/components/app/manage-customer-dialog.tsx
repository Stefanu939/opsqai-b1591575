import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listUsers,
  updateUser,
  updateUserEmail,
  resetUserPassword,
} from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Loader2, Mail, Settings2, UserCog } from "lucide-react";
import { SharedAccessPanel } from "@/components/mc/shared-access";

type CustomerUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  roles: string[];
  is_active: boolean;
  account_disabled: boolean;
  last_sign_in_at: string | null;
};

/**
 * Platform-admin surface for managing a single customer's user accounts:
 * email address, password, display name and account activation. All writes go
 * through the existing user server functions — no new entitlement or auth path.
 */
export function ManageCustomerDialog({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
        Manage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage {companyName}</DialogTitle>
            <DialogDescription>
              User accounts for this customer — email address, password and account access.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <div className="space-y-4">
              <SharedAccessPanel companyId={companyId} />
              <ManageBody companyId={companyId} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ManageBody({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const patch = useServerFn(updateUser);
  const patchEmail = useServerFn(updateUserEmail);
  const setPassword = useServerFn(resetUserPassword);

  const usersQuery = useQuery({
    queryKey: ["mc-customer-users", companyId],
    queryFn: () =>
      list({ data: { company_id: companyId } } as never) as Promise<CustomerUser[]>,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["mc-customer-users", companyId] });
  };

  const emailMut = useMutation({
    mutationFn: (v: { user_id: string; new_email: string }) =>
      patchEmail({ data: v } as never),
    onSuccess: () => {
      toast.success("Email updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMut = useMutation({
    mutationFn: (v: { user_id: string; new_password: string; must_change_password: boolean }) =>
      setPassword({ data: v } as never),
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const profileMut = useMutation({
    mutationFn: (v: {
      user_id: string;
      first_name?: string | null;
      last_name?: string | null;
      is_active?: boolean;
    }) => patch({ data: v } as never),
    onSuccess: () => {
      toast.success("Account updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (usersQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
      </div>
    );
  }

  if (usersQuery.error) {
    return (
      <p className="py-6 text-sm text-destructive">
        {(usersQuery.error as Error).message}
      </p>
    );
  }

  const users = usersQuery.data ?? [];
  if (users.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        This customer has no user accounts yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          busy={emailMut.isPending || passwordMut.isPending || profileMut.isPending}
          onSaveProfile={(v) => profileMut.mutate({ user_id: u.id, ...v })}
          onSaveEmail={(email) => emailMut.mutate({ user_id: u.id, new_email: email })}
          onSetPassword={(pw, mustChange) =>
            passwordMut.mutate({
              user_id: u.id,
              new_password: pw,
              must_change_password: mustChange,
            })
          }
        />
      ))}
    </div>
  );
}

function UserCard({
  user,
  busy,
  onSaveProfile,
  onSaveEmail,
  onSetPassword,
}: {
  user: CustomerUser;
  busy: boolean;
  onSaveProfile: (v: { first_name?: string | null; last_name?: string | null; is_active?: boolean }) => void;
  onSaveEmail: (email: string) => void;
  onSetPassword: (password: string, mustChange: boolean) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [mustChange, setMustChange] = useState(true);

  const disabled = user.account_disabled || !user.is_active;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <UserCog className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">
          {user.full_name || user.email}
        </span>
        {user.roles.map((r) => (
          <Badge key={r} variant="outline" className="text-[10px]">
            {r}
          </Badge>
        ))}
        {disabled ? <Badge variant="destructive">disabled</Badge> : null}
        <span className="ml-auto text-xs text-muted-foreground">
          Last sign-in:{" "}
          {user.last_sign_in_at
            ? new Date(user.last_sign_in_at).toLocaleString()
            : "never"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First name</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Last name</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Email address</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={busy || !email.trim() || email.trim() === user.email}
              onClick={() => onSaveEmail(email.trim().toLowerCase())}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Update
            </Button>
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Set new password</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={busy || password.length < 8}
              onClick={() => {
                onSetPassword(password, mustChange);
                setPassword("");
              }}
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Set
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={mustChange}
              onChange={(e) => setMustChange(e.target.checked)}
            />
            Require a password change at next sign-in
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => onSaveProfile({ is_active: disabled })}
        >
          {disabled ? "Enable account" : "Disable account"}
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            onSaveProfile({
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
            })
          }
        >
          Save details
        </Button>
      </div>
    </div>
  );
}

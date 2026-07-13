import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listPlatformAdmins,
  promotePlatformAdmin,
  demotePlatformAdmin,
} from "@/lib/companies.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, UserMinus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/platform-admins")({
  component: PlatformAdminsPage,
});

function PlatformAdminsPage() {
  const { isPlatformAdmin, user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listPlatformAdmins);
  const promote = useServerFn(promotePlatformAdmin);
  const demote = useServerFn(demotePlatformAdmin);
  const [email, setEmail] = useState("");

  if (!isPlatformAdmin) throw redirect({ to: "/app" });

  const { data: admins } = useQuery({
    queryKey: ["platform-admins"],
    queryFn: () => list({ data: {} } as never),
  });

  const promoteMut = useMutation({
    mutationFn: (e: string) => promote({ data: { email: e } }),
    onSuccess: () => {
      toast.success("Promoted to Platform Super Admin");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["platform-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const demoteMut = useMutation({
    mutationFn: (id: string) => demote({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Demoted");
      qc.invalidateQueries({ queryKey: ["platform-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7" /> Platform Super Admins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform Super Admins have unrestricted access to every company and workspace.
        </p>
      </header>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Promote a user</div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            onClick={() => promoteMut.mutate(email)}
            disabled={!email || promoteMut.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Promote
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The user must already have an account. Ask them to sign up first if needed.
        </p>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(admins ?? []).map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.email}</td>
                <td className="px-4 py-3">{a.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={a.id === user?.id || demoteMut.isPending}
                    onClick={() => {
                      if (confirm(`Demote ${a.email}?`)) demoteMut.mutate(a.id);
                    }}
                  >
                    <UserMinus className="h-4 w-4 mr-1" /> Demote
                  </Button>
                </td>
              </tr>
            ))}
            {!admins?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No platform admins.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

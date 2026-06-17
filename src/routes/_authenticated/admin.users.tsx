import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserRole } from "@/lib/users.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

interface U { id: string; email: string; full_name: string | null; department: string | null; created_at: string; roles: string[] }

function AdminUsers() {
  const { t } = useT();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchUsers = useServerFn(listUsers);
  const setRole = useServerFn(setUserRole);

  const load = async () => {
    try {
      const r = await fetchUsers();
      setUsers(r as U[]);
    } catch (e) { toast.error(String(e)); } finally { setLoading(false); }
  };
  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  if (!isAdmin) {
    return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;
  }

  const toggleAdmin = async (u: U) => {
    const isUserAdmin = u.roles.includes("admin");
    try {
      await setRole({ data: { userId: u.id, role: "admin", grant: !isUserAdmin } });
      load();
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">{t("users")}</h1>
      {loading ? <p className="text-sm text-muted-foreground">…</p> : (
        <Card className="divide-y divide-border">
          {users.map((u) => {
            const userIsAdmin = u.roles.includes("admin");
            const isSelf = u.id === user?.id;
            return (
              <div key={u.id} className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {u.full_name || u.email} {isSelf && <span className="text-xs text-muted-foreground">{t("thisIsYou")}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{u.email}</div>
                  {u.department && <div className="text-xs text-muted-foreground">{u.department}</div>}
                </div>
                <Badge variant={userIsAdmin ? "default" : "secondary"}>
                  {userIsAdmin ? "admin" : "employee"}
                </Badge>
                <Button size="sm" variant="outline" disabled={isSelf} onClick={() => toggleAdmin(u)}>
                  {userIsAdmin ? t("demoteEmployee") : t("promoteAdmin")}
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// Suppress unused redirect import warning - kept for future use
void redirect;

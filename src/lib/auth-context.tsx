import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "@/lib/permissions";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: string[];
  permissions: Set<string>;
  companyId: string | null;
  companyName: string | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  isAdmin: boolean;
  isManager: boolean;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  isOperator: boolean;
  isViewer: boolean;
  isWorkspaceOwner: boolean;
  isChampion: boolean;
  isPlatformAdmin: boolean;
  isPlatformOwner: boolean;
  hasPermission: (p: Permission | string) => boolean;
  hasAnyPermission: (...p: Array<Permission | string>) => boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const ACTIVE_KEY = "opsqai.active_company";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null,
  );
  const [loading, setLoading] = useState(true);

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const loadProfile = (uid: string) => {
    supabase.from("user_roles").select("role").eq("user_id", uid).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role));
    });
    supabase.rpc("my_permissions").then(({ data }) => {
      setPermissions(new Set(((data ?? []) as Array<{ permission: string }>).map((r) => r.permission)));
    });
    supabase.from("profiles").select("company_id").eq("id", uid).maybeSingle().then(({ data }) => {
      const cid = data?.company_id ?? null;
      setCompanyId(cid);
      if (cid) {
        supabase.from("companies").select("name").eq("id", cid).maybeSingle().then(({ data: c }) => {
          setCompanyName(c?.name ?? null);
        });
      } else {
        setCompanyName(null);
      }
    });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else {
        setRoles([]); setPermissions(new Set());
        setCompanyId(null); setCompanyName(null); setActiveCompanyId(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) loadProfile(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  const isPlatformOwner = roles.includes("platform_owner");
  const isPlatformAdmin = roles.includes("platform_admin") || isPlatformOwner;
  // Platform Owner implicitly has '*' permission via the DB; mirror in UI.
  const hasPermission = (p: Permission | string) =>
    isPlatformOwner || permissions.has("*") || permissions.has(p);
  const hasAnyPermission = (...p: Array<Permission | string>) => p.some(hasPermission);

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, roles, permissions,
      companyId, companyName,
      activeCompanyId, setActiveCompanyId,
      // Capability shortcuts. Platform Owner / Platform Admin bypass tenant gates.
      isAdmin: roles.includes("admin") || roles.includes("workspace_owner") || isPlatformAdmin,
      isManager: roles.includes("manager") || roles.includes("workspace_owner") || roles.includes("champion") || isPlatformAdmin,
      isSupervisor: roles.includes("supervisor") || roles.includes("team_leader") || isPlatformAdmin,
      isTeamLeader: roles.includes("supervisor") || roles.includes("team_leader") || isPlatformAdmin,
      isOperator: roles.includes("operator") || roles.includes("employee"),
      isViewer: roles.includes("viewer"),
      isWorkspaceOwner: roles.includes("workspace_owner") || isPlatformAdmin,
      isChampion: roles.includes("champion"),
      isPlatformAdmin,
      isPlatformOwner,
      hasPermission,
      hasAnyPermission,
      loading, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}

/** Render children only when the current user has the given permission. */
export function Can({
  permission, any, children, fallback = null,
}: {
  permission?: Permission | string;
  any?: Array<Permission | string>;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const ok = permission ? hasPermission(permission) : any ? hasAnyPermission(...any) : false;
  return <>{ok ? children : fallback}</>;
}

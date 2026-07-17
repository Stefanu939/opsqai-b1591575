import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import type { OpsqaiSession, OpsqaiUser } from "@/lib/providers/interfaces";
import type { Permission } from "@/lib/permissions";
import { bootstrapSession } from "@/lib/session.functions";

interface AuthState {
  session: OpsqaiSession | null;
  user: OpsqaiUser | null;
  roles: string[];
  permissions: Set<string>;
  companyId: string | null;
  companyName: string | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  /**
   * Effective workspace scope for filtering tenant-scoped data.
   * - Platform admins: activeCompanyId (null = Global mode = no filter applied).
   * - Everyone else: their profile companyId.
   * Use for `.eq('company_id', scopeCompanyId)` on client-side queries.
   */
  scopeCompanyId: string | null;
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
const UUID_LIKE_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeCompanyId(id: string | null | undefined) {
  if (!id) return null;
  const trimmed = id.trim();
  return UUID_LIKE_RE.test(trimmed) ? trimmed : null;
}

function readStoredActiveCompanyId() {
  if (typeof window === "undefined") return null;
  const normalized = normalizeCompanyId(localStorage.getItem(ACTIVE_KEY));
  if (!normalized) localStorage.removeItem(ACTIVE_KEY);
  return normalized;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpsqaiSession | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    readStoredActiveCompanyId,
  );
  const [loading, setLoading] = useState(true);

  const setActiveCompanyId = (id: string | null) => {
    const next = normalizeCompanyId(id);
    const previous = activeCompanyId;
    setActiveCompanyIdState(next);
    if (typeof window !== "undefined") {
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
    }
    // Best-effort audit. RPC is a no-op for non-platform users.
    if (previous !== next) {
      supabase
        .rpc("log_workspace_switch", { p_previous: previous as never, p_next: next as never })
        .then(
          () => {},
          () => {},
        );
    }
  };

  const loadProfile = (_uid: string) => {
    bootstrapSession()
      .then((boot) => {
        setRoles(boot.roles);
        setPermissions(new Set(boot.permissions));
        const cid = boot.companyId;
        setCompanyId(cid);
        if (cid) {
          // companies table not yet abstracted (Wave C.2a.2); read via
          // browser client for now. Cloud only — Self-Hosted is
          // single-tenant and has no companies table.
          supabase
            .from("companies")
            .select("name")
            .eq("id", cid)
            .maybeSingle()
            .then(({ data: c }) => {
              setCompanyName(c?.name ?? null);
            });
        } else {
          setCompanyName(null);
        }
      })
      .catch(() => {
        setRoles([]);
        setPermissions(new Set());
        setCompanyId(null);
        setCompanyName(null);
      });
  };

  useEffect(() => {
    const auth = getBrowserAuthProvider();
    const unsubscribe = auth.onSessionChange((_event, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else {
        setRoles([]);
        setPermissions(new Set());
        setCompanyId(null);
        setCompanyName(null);
        setActiveCompanyId(null);
      }
    });
    auth.getSession().then((s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) loadProfile(s.user.id);
    });
    return () => unsubscribe();
  }, []);

  // Keep companyName in sync with the active workspace (platform admins can switch).
  useEffect(() => {
    if (!session?.user) return;
    const target = normalizeCompanyId(activeCompanyId) ?? normalizeCompanyId(companyId);
    if (!target) {
      setCompanyName(null);
      return;
    }
    supabase
      .from("companies")
      .select("name")
      .eq("id", target)
      .maybeSingle()
      .then(({ data }) => {
        setCompanyName(data?.name ?? null);
      });
  }, [activeCompanyId, companyId, session?.user?.id]);

  const signOut = async () => {
    await getBrowserAuthProvider().signOut();
  };

  const isPlatformOwner = roles.includes("platform_owner");
  const isPlatformAdmin = roles.includes("platform_admin") || isPlatformOwner;
  // Platform Owner implicitly has '*' permission via the DB; mirror in UI.
  const hasPermission = (p: Permission | string) =>
    isPlatformOwner || permissions.has("*") || permissions.has(p);
  const hasAnyPermission = (...p: Array<Permission | string>) => p.some(hasPermission);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        permissions,
        companyId,
        companyName,
        activeCompanyId,
        setActiveCompanyId,
        scopeCompanyId: isPlatformAdmin ? activeCompanyId : companyId,
        // Capability shortcuts. Platform Owner / Platform Admin bypass tenant gates.
        isAdmin: roles.includes("admin") || roles.includes("workspace_owner") || isPlatformAdmin,
        isManager:
          roles.includes("manager") ||
          roles.includes("workspace_owner") ||
          roles.includes("champion") ||
          isPlatformAdmin,
        isSupervisor:
          roles.includes("supervisor") || roles.includes("team_leader") || isPlatformAdmin,
        isTeamLeader:
          roles.includes("supervisor") || roles.includes("team_leader") || isPlatformAdmin,
        isOperator: roles.includes("operator") || roles.includes("employee"),
        isViewer: roles.includes("viewer"),
        isWorkspaceOwner: roles.includes("workspace_owner") || isPlatformAdmin,
        isChampion: roles.includes("champion"),
        isPlatformAdmin,
        isPlatformOwner,
        hasPermission,
        hasAnyPermission,
        loading,
        signOut,
      }}
    >
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
  permission,
  any,
  children,
  fallback = null,
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

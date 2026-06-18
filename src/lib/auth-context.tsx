import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: string[];
  companyId: string | null;
  companyName: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isTeamLeader: boolean;
  isPlatformAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = (uid: string) => {
    supabase.from("user_roles").select("role").eq("user_id", uid).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role));
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
      else { setRoles([]); setCompanyId(null); setCompanyName(null); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) loadProfile(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, roles,
      companyId, companyName,
      isAdmin: roles.includes("admin"),
      isManager: roles.includes("manager"),
      isTeamLeader: roles.includes("team_leader"),
      isPlatformAdmin: roles.includes("platform_admin"),
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

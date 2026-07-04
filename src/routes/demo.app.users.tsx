import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import { useDemoReadOnly } from "@/components/demo/read-only-dialog";
import { Users, UserPlus } from "lucide-react";
import { personaFor, DEMO_PERSONA_LIST } from "@/lib/demo/personas";

export const Route = createFileRoute("/demo/app/users")({
  component: DemoUsersPage,
});

type Profile = { id: string; full_name: string | null; first_name: string | null; last_name: string | null; position: string | null; language_pref: string; is_active: boolean; created_at: string };

const ROLE_LABEL: Record<string, { label: string; tone: string }> = {
  admin:       { label: "Admin",        tone: "!border-primary/30 !bg-primary/5 !text-primary" },
  manager:     { label: "Manager",      tone: "" },
  team_leader: { label: "Team Leader",  tone: "" },
  employee:    { label: "Employee",     tone: "" },
};

function DemoUsersPage() {
  const { show } = useDemoReadOnly();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,first_name,last_name,position,language_pref,is_active,created_at").eq("company_id", DEMO_COMPANY_ID);
      setProfiles((data ?? []) as Profile[]);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
            <Users className="h-3.5 w-3.5" /> People & roles
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">Team & permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Roles are stored separately from profiles — a security best practice enforced by RLS.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => show("Invite a user")}>
          <UserPlus className="h-4 w-4" /> Invite user
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {(profiles.length ? profiles : DEMO_PERSONA_LIST.map((p) => ({ id: p.id, full_name: p.name, first_name: null, last_name: null, position: p.position, language_pref: "en", is_active: true, created_at: new Date().toISOString() }) as Profile)).map((p) => {
          const persona = personaFor(p.id);
          const role = persona?.role ?? "employee";
          const meta = ROLE_LABEL[role];
          return (
            <Card key={p.id} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold shrink-0">
                {persona?.initials ?? (p.full_name?.[0] ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{p.full_name ?? persona?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{persona?.position ?? p.position} · {persona?.department}</div>
              </div>
              <span className={`chip ${meta.tone}`}>{meta.label}</span>
              <Button variant="ghost" size="sm" onClick={() => show("Change role or permissions")}>Manage</Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

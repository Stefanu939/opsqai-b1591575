import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listUsers, createUser, inviteUser, updateUser, deleteUser, resetUserPassword, listDepartments,
} from "@/lib/users.functions";
import { listCompanies } from "@/lib/companies.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { UserPlus, Mail, Trash2, KeyRound, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/users")({
  component: AdminUsers,
});

type Role = "admin" | "manager" | "team_leader" | "employee";
const ROLES: Role[] = ["admin", "manager", "team_leader", "employee"];
const ROLE_LABEL: Record<Role, string> = {
  admin: "Company Admin", manager: "Manager", team_leader: "Team Leader", employee: "Employee",
};

interface U {
  id: string; email: string; full_name: string | null;
  first_name: string | null; last_name: string | null;
  position: string | null; phone: string | null;
  department_id: string | null; department_name: string | null;
  company_id: string | null; company_name: string | null;
  language_pref: string | null; is_active: boolean;
  last_sign_in_at: string | null; created_at: string;
  roles: string[];
}
interface Dept { id: string; name: string }
interface Company { id: string; name: string }

function AdminUsers() {
  const { t } = useT();
  const { user, isAdmin, isPlatformAdmin, activeCompanyId } = useAuth();
  const canManage = isAdmin || isPlatformAdmin;
  const [users, setUsers] = useState<U[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fetchUsers = useServerFn(listUsers);
  const fetchDepts = useServerFn(listDepartments);
  const fetchCompanies = useServerFn(listCompanies);
  const create = useServerFn(createUser);
  const invite = useServerFn(inviteUser);
  const update = useServerFn(updateUser);
  const del = useServerFn(deleteUser);
  const resetPw = useServerFn(resetUserPassword);

  const load = async () => {
    setLoading(true);
    try {
      const payload = isPlatformAdmin && activeCompanyId ? { company_id: activeCompanyId } : {};
      const tasks: Promise<unknown>[] = [fetchUsers({ data: payload } as never), fetchDepts()];
      if (isPlatformAdmin) tasks.push(fetchCompanies());
      const results = await Promise.all(tasks);
      setUsers(results[0] as U[]);
      setDepts(results[1] as Dept[]);
      if (isPlatformAdmin) setCompanies((results[2] as Company[]) ?? []);
    } catch (e) { toast.error(String(e)); } finally { setLoading(false); }
  };
  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage, activeCompanyId]);

  if (!canManage) return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return !s || u.email.toLowerCase().includes(s)
      || (u.full_name ?? "").toLowerCase().includes(s)
      || (u.department_name ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("users")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("usersDesc")}</p>
        </div>
        <div className="flex gap-2">
          <InviteDialog depts={depts} companies={companies} isPlatformAdmin={isPlatformAdmin} onDone={load} invite={invite} />
          <CreateDialog depts={depts} companies={companies} isPlatformAdmin={isPlatformAdmin} onDone={load} create={create} />
        </div>
      </div>

      <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />

      {loading ? <p className="text-sm text-muted-foreground">…</p> : (
        <Card className="divide-y divide-border">
          {filtered.map((u) => {
            const isSelf = u.id === user?.id;
            return (
              <div key={u.id} className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium truncate">{u.full_name || u.email}</div>
                    {isSelf && <span className="text-xs text-muted-foreground">{t("thisIsYou")}</span>}
                    {!u.is_active && <Badge variant="outline" className="text-destructive border-destructive">{t("inactive")}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                    {u.company_name && <span className="font-medium text-foreground/70">{u.company_name}</span>}
                    {u.position && <span>· {u.position}</span>}
                    {u.department_name && <span>· {u.department_name}</span>}
                    {u.phone && <span>· {u.phone}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap items-center">
                  {u.roles.map((r) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px] uppercase">{r.replace("_", " ")}</Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <EditDialog u={u} depts={depts} onDone={load} update={update} />
                  <ResetPwDialog u={u} onDone={load} reset={resetPw} />
                  <Button size="icon" variant="ghost" disabled={isSelf} onClick={async () => {
                    if (!confirm(`Delete ${u.email}?`)) return;
                    try { await del({ data: { user_id: u.id } }); toast.success("Deleted"); load(); }
                    catch (e) { toast.error(String(e)); }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function CreateDialog({ depts, companies, isPlatformAdmin, onDone, create }: { depts: Dept[]; companies: Company[]; isPlatformAdmin: boolean; onDone: () => void; create: (a: { data: any }) => Promise<any> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const empty = { email: "", password: "", first_name: "", last_name: "", position: "", phone: "", department_id: "", role: "employee" as Role, company_id: "" };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlatformAdmin && !form.company_id) { toast.error("Select a company"); return; }
    setBusy(true);
    try {
      await create({ data: {
        ...form,
        department_id: form.department_id || null,
        company_id: form.company_id || undefined,
      } });
      toast.success("User created"); setOpen(false); onDone();
      setForm(empty);
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />{t("createUser")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("createUser")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("firstName")} *`}><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label={`${t("lastName")} *`}><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
            <Field label={`${t("email")} *`}><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label={`${t("password")} *`}><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            {isPlatformAdmin && (
              <Field label="Company *">
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Role *">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t("position")}><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label={t("phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={t("department")}>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter><Button disabled={busy} type="submit">{t("create")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ depts, companies, isPlatformAdmin, onDone, invite }: { depts: Dept[]; companies: Company[]; isPlatformAdmin: boolean; onDone: () => void; invite: (a: { data: any }) => Promise<any> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [dept, setDept] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlatformAdmin && !companyId) { toast.error("Select a company"); return; }
    setBusy(true);
    try {
      await invite({ data: { email, role, department_id: dept || null, company_id: companyId || undefined, first_name: first || undefined, last_name: last || undefined } });
      toast.success(t("invitationSent")); setOpen(false); onDone();
      setEmail(""); setFirst(""); setLast(""); setCompanyId(""); setDept(""); setRole("employee");
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Mail className="h-4 w-4 mr-2" />{t("invite")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("inviteByEmail")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("firstName")}><Input value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
            <Field label={t("lastName")}><Input value={last} onChange={(e) => setLast(e.target.value)} /></Field>
          </div>
          <Field label={`${t("email")} *`}><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {isPlatformAdmin && (
            <Field label="Company *">
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Role *">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label={t("department")}>
            <Select value={dept} onValueChange={setDept}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          </Field>
          <DialogFooter><Button disabled={busy} type="submit">{t("sendInvite")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ u, depts, onDone, update }: { u: U; depts: Dept[]; onDone: () => void; update: (a: { data: any }) => Promise<any> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: u.first_name ?? "", last_name: u.last_name ?? "", position: u.position ?? "",
    phone: u.phone ?? "", department_id: u.department_id ?? "", is_active: u.is_active,
    roles: new Set(u.roles),
  });
  const [busy, setBusy] = useState(false);

  const toggleRole = (r: Role) => {
    const s = new Set(form.roles); if (s.has(r)) s.delete(r); else s.add(r);
    setForm({ ...form, roles: s });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await update({ data: { user_id: u.id, ...form, department_id: form.department_id || null, roles: [...form.roles] } });
      toast.success("Saved"); setOpen(false); onDone();
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("editUser")}: {u.email}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("firstName")}><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label={t("lastName")}><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
            <Field label={t("position")}><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label={t("phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={t("department")}>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <Label>{t("roles")}</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${form.roles.has(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">{t("active")}</div>
              <div className="text-xs text-muted-foreground">{t("activeDesc")}</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <DialogFooter><Button disabled={busy} type="submit">{t("save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPwDialog({ u, onDone, reset }: { u: U; onDone: () => void; reset: (a: { data: any }) => Promise<any> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await reset({ data: { user_id: u.id, new_password: pw } }); toast.success("Password reset"); setOpen(false); setPw(""); onDone(); }
    catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><KeyRound className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("resetPassword")} — {u.email}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label={t("newPassword")}><Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <DialogFooter><Button disabled={busy} type="submit">{t("resetPassword")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

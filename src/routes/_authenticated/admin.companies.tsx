import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCompanies, createCompany, updateCompany, deleteCompany, platformStats } from "@/lib/companies.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Users, FileText, MessageSquare, Power, Trash2, LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { isPlatformAdmin, setActiveCompanyId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listCompanies);
  const stats = useServerFn(platformStats);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => list({ data: {} } as never),
    enabled: isPlatformAdmin,
  });
  const { data: platStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => stats({ data: {} } as never),
    enabled: isPlatformAdmin,
  });

  const createMut = useMutation({
    mutationFn: (vars: any) => create({ data: vars }),
    onSuccess: () => { toast.success("Company created"); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["platform-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (vars: any) => update({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (vars: { id: string }) => remove({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isPlatformAdmin) {
    throw redirect({ to: "/" });
  }

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Platform — Companies</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage tenants, subscriptions and platform-wide statistics.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Companies" value={platStats?.total_companies ?? 0} icon={Building2} />
        <StatCard label="Active" value={platStats?.active_companies ?? 0} icon={Power} />
        <StatCard label="Total users" value={platStats?.total_users ?? 0} icon={Users} />
        <StatCard label="Documents" value={platStats?.total_documents ?? 0} icon={FileText} />
        <StatCard label="Questions asked" value={platStats?.total_questions ?? 0} icon={MessageSquare} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All companies</h2>
        <NewCompanyDialog onCreate={(v) => createMut.mutate(v)} pending={createMut.isPending} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Docs</th>
              <th className="px-4 py-3 font-medium">FAQs</th>
              <th className="px-4 py-3 font-medium">Max</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(companies ?? []).map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{c.subscription_plan}</Badge></td>
                <td className="px-4 py-3">
                  <Badge variant={c.active ? "default" : "secondary"}>{c.subscription_status}</Badge>
                </td>
                <td className="px-4 py-3">{c.user_count}</td>
                <td className="px-4 py-3">{c.document_count}</td>
                <td className="px-4 py-3">{c.faq_count}</td>
                <td className="px-4 py-3">{c.max_users}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setActiveCompanyId(c.id); toast.success(`Opened ${c.name} workspace`); navigate({ to: "/admin/users" }); }}>
                    <LogIn className="h-4 w-4 mr-1" />Open
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: c.id, name: c.name, active: !c.active, subscription_status: c.active ? "suspended" : "active" })}>
                    {c.active ? "Suspend" : "Activate"}
                  </Button>
                  <EditPlanDialog company={c} onSave={(plan, max) => updateMut.mutate({ id: c.id, name: c.name, subscription_plan: plan, max_users: max })} />
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(`Delete ${c.name}? This deletes all its data.`)) removeMut.mutate({ id: c.id });
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!companies?.length && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />{label}
        </CardTitle>
      </CardHeader>
      <CardContent><div className="text-2xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}

function NewCompanyDialog({ onCreate, pending }: { onCreate: (v: any) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", subscription_plan: "free", max_users: 10,
    admin_email: "", admin_password: "", admin_first_name: "", admin_last_name: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />New company</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create company</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Company name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plan</Label>
              <Select value={form.subscription_plan} onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max users</Label>
              <Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })} />
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Company Admin</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First name</Label><Input value={form.admin_first_name} onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })} /></div>
              <div><Label>Last name</Label><Input value={form.admin_last_name} onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })} /></div>
            </div>
            <div className="mt-3"><Label>Email</Label><Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} /></div>
            <div className="mt-3"><Label>Initial password</Label><Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={pending || !form.name || !form.admin_email || form.admin_password.length < 8} onClick={() => { onCreate(form); setOpen(false); }}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ company, onSave }: { company: any; onSave: (plan: string, max: number) => void }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(company.subscription_plan);
  const [max, setMax] = useState(company.max_users);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost">Edit</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {company.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Max users</Label><Input type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onSave(plan, max); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

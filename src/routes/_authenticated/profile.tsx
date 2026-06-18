import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateMyProfile, listDepartments } from "@/lib/users.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

interface Dept { id: string; name: string }

function ProfilePage() {
  const { t, setLang } = useT();
  const { user } = useAuth();
  const update = useServerFn(updateMyProfile);
  const fetchDepts = useServerFn(listDepartments);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [form, setForm] = useState({
    first_name: "", last_name: "", position: "", phone: "",
    department_id: "", language_pref: "en" as "de" | "en" | "ro",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchDepts().then((d) => setDepts(d as Dept[])).catch(() => {});
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        first_name: data.first_name ?? "", last_name: data.last_name ?? "",
        position: data.position ?? "", phone: data.phone ?? "",
        department_id: data.department_id ?? "", language_pref: (data.language_pref as "de" | "en" | "ro") ?? "en",
      });
    });
  }, [user, fetchDepts]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await update({ data: { ...form, department_id: form.department_id || null } });
      setLang(form.language_pref);
      toast.success(t("saved"));
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">{t("myProfile")}</h1>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">{t("email")}</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("firstName")}</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("lastName")}</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("position")}</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("department")}</Label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("language")}</Label>
              <Select value={form.language_pref} onValueChange={(v) => setForm({ ...form, language_pref: v as "de" | "en" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={busy}>{t("save")}</Button>
        </form>
      </Card>
    </div>
  );
}

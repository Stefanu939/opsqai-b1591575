/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAssignTargets, assignTraining } from "@/lib/academy-lms.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Building2, ShieldCheck, Sparkles, Search } from "lucide-react";

type Targets = {
  users: { id: string; name: string; department_id: string | null }[];
  departments: { id: string; name: string }[];
  roles: string[];
  paths: { id: string; title: string; mandatory: boolean }[];
};

export function AssignTrainingDialog({
  open,
  onOpenChange,
  defaultPathId,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultPathId?: string | null;
  onAssigned?: () => void;
}) {
  const loadTargets = useServerFn(listAssignTargets);
  const assign = useServerFn(assignTraining);

  const [targets, setTargets] = useState<Targets | null>(null);
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [entireCompany, setEntireCompany] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [dueAt, setDueAt] = useState<string>("");
  const [notify, setNotify] = useState(true);
  const [userQuery, setUserQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const t = (await loadTargets()) as Targets;
      setTargets(t);
      if (defaultPathId && !pathIds.length) setPathIds([defaultPathId]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalUsers = useMemo(() => {
    if (!targets) return 0;
    if (entireCompany) return targets.users.length;
    const ids = new Set(userIds);
    for (const d of deptIds) {
      for (const u of targets.users) if (u.department_id === d) ids.add(u.id);
    }
    // roles are opaque here; assume additive server-side
    return ids.size + (roles.length ? Math.min(roles.length * 3, targets.users.length) : 0);
  }, [targets, userIds, deptIds, roles, entireCompany]);

  const filteredUsers = useMemo(() => {
    if (!targets) return [];
    const q = userQuery.trim().toLowerCase();
    return q ? targets.users.filter((u) => u.name.toLowerCase().includes(q)) : targets.users;
  }, [targets, userQuery]);

  const toggle = (arr: string[], id: string, setter: (v: string[]) => void) =>
    setter(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const submit = async () => {
    if (!pathIds.length) {
      toast.error("Pick at least one course");
      return;
    }
    if (!entireCompany && !userIds.length && !deptIds.length && !roles.length) {
      toast.error("Pick at least one target (users, departments, roles or entire company)");
      return;
    }
    setBusy(true);
    try {
      const r = (await assign({
        data: {
          path_ids: pathIds,
          target_user_ids: userIds,
          target_department_ids: deptIds,
          target_roles: roles,
          entire_company: entireCompany,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          priority,
          mandatory,
          notify,
        },
      })) as { assigned: number; skipped: number; users: number; notified: number };
      toast.success(
        `Assigned ${r.assigned} enrollment${r.assigned === 1 ? "" : "s"} to ${r.users} user${r.users === 1 ? "" : "s"}${r.skipped ? ` · ${r.skipped} already enrolled` : ""}`,
      );
      onOpenChange(false);
      onAssigned?.();
      // reset
      setUserIds([]);
      setDeptIds([]);
      setRoles([]);
      setEntireCompany(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to assign training");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Assign training
          </DialogTitle>
          <DialogDescription>
            Push a course to specific people, whole departments, roles or the entire company.
          </DialogDescription>
        </DialogHeader>

        {!targets ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading targets…</div>
        ) : (
          <div className="space-y-4">
            {/* Courses */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Courses
              </Label>
              <ScrollArea className="h-32 rounded border p-2">
                {targets.paths.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic p-2">
                    No published courses yet.
                  </div>
                ) : (
                  targets.paths.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/60 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={pathIds.includes(p.id)}
                        onCheckedChange={() => toggle(pathIds, p.id, setPathIds)}
                      />
                      <span className="flex-1 truncate">{p.title}</span>
                      {p.mandatory && (
                        <Badge variant="outline" className="text-[10px]">
                          Mandatory
                        </Badge>
                      )}
                    </label>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Targets */}
            <Tabs defaultValue="users">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="users">
                  <Users className="h-3.5 w-3.5 mr-1" /> Users
                </TabsTrigger>
                <TabsTrigger value="departments">
                  <Building2 className="h-3.5 w-3.5 mr-1" /> Departments
                </TabsTrigger>
                <TabsTrigger value="roles">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Roles
                </TabsTrigger>
                <TabsTrigger value="company">All company</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search users"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="pl-7 h-9"
                  />
                </div>
                <ScrollArea className="h-40 rounded border p-2">
                  {filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/60 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={userIds.includes(u.id)}
                        onCheckedChange={() => toggle(userIds, u.id, setUserIds)}
                      />
                      <span className="flex-1 truncate">{u.name}</span>
                    </label>
                  ))}
                </ScrollArea>
                {userIds.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {userIds.length} user{userIds.length === 1 ? "" : "s"} selected
                  </div>
                )}
              </TabsContent>
              <TabsContent value="departments">
                <ScrollArea className="h-40 rounded border p-2">
                  {targets.departments.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/60 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={deptIds.includes(d.id)}
                        onCheckedChange={() => toggle(deptIds, d.id, setDeptIds)}
                      />
                      <span className="flex-1">{d.name}</span>
                    </label>
                  ))}
                  {targets.departments.length === 0 && (
                    <div className="text-xs text-muted-foreground italic p-2">
                      No departments yet.
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="roles">
                <ScrollArea className="h-40 rounded border p-2">
                  {targets.roles.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/60 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={roles.includes(r)}
                        onCheckedChange={() => toggle(roles, r, setRoles)}
                      />
                      <span className="flex-1 capitalize">{r.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="company" className="pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={entireCompany}
                    onCheckedChange={(v) => setEntireCompany(Boolean(v))}
                  />
                  Assign to <strong>every active member</strong> of the company (
                  {targets.users.length})
                </label>
              </TabsContent>
            </Tabs>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Due date</Label>
                <Input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={mandatory} onCheckedChange={(v) => setMandatory(Boolean(v))} />{" "}
                Mark as mandatory
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notify} onCheckedChange={(v) => setNotify(Boolean(v))} /> Notify
                learners
              </label>
            </div>

            <div className="text-xs text-muted-foreground rounded bg-muted/40 p-2">
              Estimated <strong>~{totalUsers}</strong> learner{totalUsers === 1 ? "" : "s"} ·{" "}
              {pathIds.length} course{pathIds.length === 1 ? "" : "s"}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !targets}>
            {busy ? "Assigning…" : "Assign training"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

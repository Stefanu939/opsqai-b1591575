/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listAcademyDepartments, upsertAcademyDepartment,
  listAcademyPaths, upsertAcademyPath, deleteAcademyPath, getAcademyPath,
  upsertAcademyChapter, deleteAcademyChapter,
  upsertAcademyLesson, deleteAcademyLesson,
  convertSopToLesson, generateAcademyCourse,
  academyDashboard, getAcademySettings, saveAcademySettings,
  assignEnrollment, listPathAssignments, listAssignablePathLearners, removeEnrollment,
} from "@/lib/academy.functions";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraduationCap, Plus, Trash2, BookOpen, Sparkles, Settings as SettingsIcon,
  BarChart3, Users, Wand2, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/admin/academy")({
  component: AcademyAdmin,
  head: () => ({ meta: [{ title: "Academy Manager · OPSQAI" }] }),
});

function AcademyAdmin() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Academy Manager</h1>
          <p className="text-sm text-muted-foreground">Design learning paths, monitor progress, and configure your Academy.</p>
        </div>
      </header>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="library"><BookOpen className="h-4 w-4 mr-1" />Library</TabsTrigger>
          <TabsTrigger value="ai"><Wand2 className="h-4 w-4 mr-1" />AI Generators</TabsTrigger>
          <TabsTrigger value="assign"><Users className="h-4 w-4 mr-1" />Assignments</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" />Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><DashboardTab /></TabsContent>
        <TabsContent value="library" className="mt-4"><LibraryTab /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AiTab /></TabsContent>
        <TabsContent value="assign" className="mt-4"><AssignTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Dashboard ----------------------------- */
function DashboardTab() {
  const dash = useServerFn(academyDashboard);
  const [data, setData] = useState<any>(null);
  useEffect(() => { void dash({ data: {} }).then(setData); }, []);
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const k = data.kpis ?? {};
  const kpis = [
    ["Enrolled", k.enrollments ?? 0],
    ["In progress", k.inProgress ?? 0],
    ["Completed", k.completed ?? 0],
    ["Overdue", k.overdue ?? 0],
    ["Avg score", `${k.avgScore ?? 0}%`],
    ["Completion rate", `${k.completionRate ?? 0}%`],
    ["Training hours", k.trainingHours ?? 0],
    ["Certificates", k.certificates ?? 0],
    ["Retraining", k.retrainingRequired ?? 0],
  ];
  const depts = (data.departments ?? []) as any[];
  const heat = (data.heatmap ?? []) as any[];
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {kpis.map(([l, v]) => (
          <Card key={l as string} className="p-3">
            <div className="text-[11px] uppercase text-muted-foreground">{l}</div>
            <div className="text-xl font-semibold">{v as any}</div>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Department performance</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={depts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip />
              <Bar dataKey="completion_rate" fill="#3b82f6" name="Completion %" />
              <Bar dataKey="avg_score" fill="#22c55e" name="Avg score" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Knowledge heatmap (worst lessons)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={heat.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" /><YAxis dataKey="lesson_title" type="category" width={180} />
              <Tooltip />
              <Bar dataKey="fail_rate" fill="#ef4444" name="Fail %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {heat.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Recommendations</div>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {heat.slice(0, 3).map((h: any) => (
              <li key={h.lesson_id}>Learners struggle with <b>{h.lesson_title}</b> (fail rate {Math.round(h.fail_rate ?? 0)}%). Consider revising the lesson or the source SOP.</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------ Library ------------------------------ */
function LibraryTab() {
  const listDept = useServerFn(listAcademyDepartments);
  const upDept = useServerFn(upsertAcademyDepartment);
  const listPaths = useServerFn(listAcademyPaths);
  const upPath = useServerFn(upsertAcademyPath);
  const delPath = useServerFn(deleteAcademyPath);
  const [depts, setDepts] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [newDept, setNewDept] = useState("");
  const [newPath, setNewPath] = useState({ title: "", department_id: "", target_role: "", language: "en", mandatory: false });
  const [editing, setEditing] = useState<any>(null);

  const refresh = async () => {
    const [d, p] = await Promise.all([listDept({ data: {} }), listPaths({ data: {} })]);
    setDepts((d as any[]) ?? []); setPaths((p as any[]) ?? []);
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm">Departments</div>
        <div className="space-y-1">
          {depts.map((d) => <div key={d.id} className="text-sm px-2 py-1 rounded bg-muted/50">{d.name}</div>)}
        </div>
        <div className="flex gap-2">
          <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="New department" />
          <Button size="sm" onClick={async () => { if (!newDept) return; await upDept({ data: { name: newDept } }); setNewDept(""); refresh(); }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">Learning paths</div>
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New path</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create learning path</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Input placeholder="Title" value={newPath.title} onChange={(e) => setNewPath({ ...newPath, title: e.target.value })} />
                <Select value={newPath.department_id} onValueChange={(v) => setNewPath({ ...newPath, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Target role (e.g. Operator)" value={newPath.target_role} onChange={(e) => setNewPath({ ...newPath, target_role: e.target.value })} />
                <Select value={newPath.language} onValueChange={(v) => setNewPath({ ...newPath, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="de">Deutsch</SelectItem><SelectItem value="ro">Română</SelectItem></SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={async () => {
                  if (!newPath.title) return;
                  await upPath({ data: { ...newPath, department_id: newPath.department_id || null, target_role: newPath.target_role || null } as any });
                  setNewPath({ title: "", department_id: "", target_role: "", language: "en", mandatory: false });
                  refresh();
                }}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-1.5">
          {paths.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <div className="text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <Badge variant="outline" className="text-[10px]">{p.publish_status}</Badge>
                  <span>{p.academy_departments?.name ?? "—"}</span>
                  {p.target_role && <span>· {p.target_role}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete path?")) { await delPath({ data: { id: p.id } }); refresh(); } }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {paths.length === 0 && <div className="text-xs text-muted-foreground italic">No paths yet.</div>}
        </div>
      </Card>

      {editing && <PathEditorDialog path={editing} onClose={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function PathEditorDialog({ path, onClose }: { path: any; onClose: () => void }) {
  const get = useServerFn(getAcademyPath);
  const upPath = useServerFn(upsertAcademyPath);
  const upChap = useServerFn(upsertAcademyChapter);
  const delChap = useServerFn(deleteAcademyChapter);
  const upLesson = useServerFn(upsertAcademyLesson);
  const delLesson = useServerFn(deleteAcademyLesson);
  const [d, setD] = useState<any>(null);
  const [chTitle, setChTitle] = useState("");
  const [lsTitle, setLsTitle] = useState<Record<string, string>>({});
  const reload = async () => setD(await get({ data: { id: path.id } }));
  useEffect(() => { void reload(); }, [path.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{path.title}</DialogTitle></DialogHeader>
        {d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Input defaultValue={d.path.title} onBlur={(e) => upPath({ data: { id: path.id, ...d.path, title: e.target.value } as any }).then(reload)} />
              <Select defaultValue={d.path.publish_status} onValueChange={(v) => upPath({ data: { id: path.id, ...d.path, publish_status: v as any } as any }).then(reload)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
              </Select>
            </div>
            <Textarea rows={2} defaultValue={d.path.description ?? ""} onBlur={(e) => upPath({ data: { id: path.id, ...d.path, description: e.target.value } as any }).then(reload)} />

            <div className="space-y-3">
              {d.chapters.map((c: any) => (
                <Card key={c.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input className="max-w-md" defaultValue={c.title} onBlur={(e) => upChap({ data: { id: c.id, path_id: path.id, title: e.target.value, summary: c.summary, order_index: c.order_index } }).then(reload)} />
                    <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete chapter?")) { await delChap({ data: { id: c.id } }); reload(); } }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="pl-3 space-y-1">
                    {d.lessons.filter((l: any) => l.chapter_id === c.id).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between text-sm">
                        <span>📘 {l.title} <Badge variant="outline" className="ml-1 text-[10px]">{l.publish_status}</Badge></span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => upLesson({ data: { id: l.id, chapter_id: c.id, title: l.title, publish_status: l.publish_status === "published" ? "draft" : "published" } as any }).then(reload)}>
                            {l.publish_status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete lesson?")) { await delLesson({ data: { id: l.id } }); reload(); } }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input placeholder="Add empty lesson…" value={lsTitle[c.id] ?? ""} onChange={(e) => setLsTitle({ ...lsTitle, [c.id]: e.target.value })} />
                      <Button size="sm" onClick={async () => {
                        const t = (lsTitle[c.id] ?? "").trim(); if (!t) return;
                        await upLesson({ data: { chapter_id: c.id, title: t, objectives: [], language: d.path.language } as any });
                        setLsTitle({ ...lsTitle, [c.id]: "" }); reload();
                      }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Add chapter…" value={chTitle} onChange={(e) => setChTitle(e.target.value)} />
                <Button onClick={async () => {
                  if (!chTitle.trim()) return;
                  await upChap({ data: { path_id: path.id, title: chTitle, order_index: d.chapters.length } });
                  setChTitle(""); reload();
                }}><Plus className="h-4 w-4 mr-1" />Chapter</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ AI Tab ------------------------------ */
function AiTab() {
  const conv = useServerFn(convertSopToLesson);
  const gen = useServerFn(generateAcademyCourse);
  const listPaths = useServerFn(listAcademyPaths);
  const getPath = useServerFn(getAcademyPath);
  const listDept = useServerFn(listAcademyDepartments);
  const [docs, setDocs] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [sel, setSel] = useState({ document_id: "", path_id: "", chapter_id: "", language: "en" });
  const [course, setCourse] = useState({ document_ids: [] as string[], department_id: "", target_role: "", language: "en" });
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("knowledge_documents").select("id, title").order("created_at", { ascending: false }).limit(100);
      setDocs(data ?? []);
      setPaths((await listPaths({ data: {} })) as any[]);
      setDepts((await listDept({ data: {} })) as any[]);
    })();
  }, []);
  useEffect(() => {
    if (!sel.path_id) return;
    void getPath({ data: { id: sel.path_id } }).then((d: any) => setChapters(d.chapters));
  }, [sel.path_id]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Convert SOP → Lesson</div>
        <Select value={sel.document_id} onValueChange={(v) => setSel({ ...sel, document_id: v })}>
          <SelectTrigger><SelectValue placeholder="Source SOP document" /></SelectTrigger>
          <SelectContent>{docs.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select value={sel.path_id} onValueChange={(v) => setSel({ ...sel, path_id: v })}>
            <SelectTrigger><SelectValue placeholder="Path" /></SelectTrigger>
            <SelectContent>{paths.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sel.chapter_id} onValueChange={(v) => setSel({ ...sel, chapter_id: v })}>
            <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
            <SelectContent>{chapters.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Select value={sel.language} onValueChange={(v) => setSel({ ...sel, language: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="de">Deutsch</SelectItem><SelectItem value="ro">Română</SelectItem></SelectContent>
        </Select>
        <Button disabled={!sel.document_id || !sel.chapter_id || busy === "conv"} onClick={async () => {
          setBusy("conv"); setOut(null);
          try { const r = (await conv({ data: { document_id: sel.document_id, chapter_id: sel.chapter_id, language: sel.language, auto_publish: false } })) as any; setOut(`Lesson created: ${r.lesson.title}`); }
          catch (e: any) { setOut(`Error: ${e.message}`); }
          finally { setBusy(null); }
        }}>
          <Sparkles className="h-4 w-4 mr-1" /> {busy === "conv" ? "Generating…" : "Convert to lesson"}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm flex items-center gap-2"><Wand2 className="h-4 w-4" /> Generate full course from SOPs</div>
        <div className="text-xs text-muted-foreground">Select up to 15 SOPs — AI will build a draft learning path with chapters & lessons.</div>
        <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
          {docs.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={course.document_ids.includes(d.id)} onChange={(e) => {
                setCourse((c) => ({ ...c, document_ids: e.target.checked ? [...c.document_ids, d.id] : c.document_ids.filter((x) => x !== d.id) }));
              }} />
              {d.title}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={course.department_id} onValueChange={(v) => setCourse({ ...course, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Target role" value={course.target_role} onChange={(e) => setCourse({ ...course, target_role: e.target.value })} />
        </div>
        <Button disabled={course.document_ids.length === 0 || busy === "gen"} onClick={async () => {
          setBusy("gen"); setOut(null);
          try { const r = (await gen({ data: { ...course, department_id: course.department_id || null, target_role: course.target_role || null } as any })) as any; setOut(`Draft course created: ${r.path_id}`); }
          catch (e: any) { setOut(`Error: ${e.message}`); }
          finally { setBusy(null); }
        }}>
          <Sparkles className="h-4 w-4 mr-1" /> {busy === "gen" ? "Generating…" : "Generate course"}
        </Button>
        {out && <div className="text-xs text-muted-foreground">{out}</div>}
      </Card>
    </div>
  );
}

/* ---------------------------- Assignments ---------------------------- */
function AssignTab() {
  const listPaths = useServerFn(listAcademyPaths);
  const assign = useServerFn(assignEnrollment);
  const [paths, setPaths] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pathId, setPathId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [due, setDue] = useState("");
  const [out, setOut] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      setPaths((await listPaths({ data: {} })) as any[]);
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name").limit(500);
      setUsers(data ?? []);
    })();
  }, []);
  return (
    <Card className="p-4 space-y-3 max-w-2xl">
      <div className="font-medium text-sm">Assign a learning path</div>
      <Select value={pathId} onValueChange={setPathId}>
        <SelectTrigger><SelectValue placeholder="Path" /></SelectTrigger>
        <SelectContent>{paths.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} placeholder="Due date" />
      <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
        {users.map((u) => (
          <label key={u.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(u.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id))} />
            <span>{u.full_name ?? u.email}</span>
          </label>
        ))}
      </div>
      <Button disabled={!pathId || selected.length === 0} onClick={async () => {
        try {
          const r = await assign({ data: { path_id: pathId, user_ids: selected, due_at: due ? new Date(due).toISOString() : null, mandatory: true } });
          setOut(`Assigned ${(r as any).count} learners`); setSelected([]);
        } catch (e: any) { setOut(`Error: ${e.message}`); }
      }}><Users className="h-4 w-4 mr-1" /> Assign</Button>
      {out && <div className="text-xs text-muted-foreground">{out}</div>}
    </Card>
  );
}

/* ------------------------------ Settings ----------------------------- */
function SettingsTab() {
  const get = useServerFn(getAcademySettings);
  const save = useServerFn(saveAcademySettings);
  const [s, setS] = useState<any>(null);
  useEffect(() => { void get({ data: {} }).then(setS); }, []);
  if (!s) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <Card className="p-4 max-w-xl space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">Passing score
          <Input type="number" value={s.passing_score} onChange={(e) => setS({ ...s, passing_score: Number(e.target.value) })} />
        </label>
        <label className="text-xs">Quiz min
          <Input type="number" value={s.quiz_min} onChange={(e) => setS({ ...s, quiz_min: Number(e.target.value) })} />
        </label>
        <label className="text-xs">Quiz max
          <Input type="number" value={s.quiz_max} onChange={(e) => setS({ ...s, quiz_max: Number(e.target.value) })} />
        </label>
      </div>
      <label className="text-xs block">Default difficulty
        <Select value={s.default_difficulty} onValueChange={(v) => setS({ ...s, default_difficulty: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
        </Select>
      </label>
      <label className="text-xs block">Languages (comma separated)
        <Input value={(s.languages ?? []).join(",")} onChange={(e) => setS({ ...s, languages: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} />
      </label>
      <Button onClick={async () => {
        await save({ data: { passing_score: s.passing_score, quiz_min: s.quiz_min, quiz_max: s.quiz_max, default_difficulty: s.default_difficulty, languages: s.languages } });
      }}>Save</Button>
    </Card>
  );
}

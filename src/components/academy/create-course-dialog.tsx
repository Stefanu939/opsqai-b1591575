/* eslint-disable @typescript-eslint/no-explicit-any */
// Academy — "Create course" dialog (Self-Hosted).
//
// Wraps the existing `upsertAcademyPath` server function so managers with
// `academy.manage` can create a learning path (course) directly from the
// Academy surface instead of only through the AI generator.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateAcademyCourse,
  listAcademyDepartments,
  upsertAcademyPath,
} from "@/lib/academy.functions";
import { listKnowledgeDocuments } from "@/lib/kb.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { notifyFailed, notifySaved } from "@/lib/feedback";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, BookOpen } from "lucide-react";

const NO_DEPARTMENT = "__none__";

export function CreateCourseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (pathId: string) => void;
}) {
  const listDepartments = useServerFn(listAcademyDepartments);
  const upsert = useServerFn(upsertAcademyPath);
  const listDocs = useServerFn(listKnowledgeDocuments);
  const generate = useServerFn(generateAcademyCourse);

  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>(NO_DEPARTMENT);
  const [targetRole, setTargetRole] = useState("");
  const [language, setLanguage] = useState("en");
  const [difficulty, setDifficulty] = useState("standard");
  const [passingScore, setPassingScore] = useState(70);
  const [mandatory, setMandatory] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("draft");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Knowledge-Base sourced generation — a course must be able to come straight
  // from the SOPs the company already trusts, not only from manual input.
  const [docs, setDocs] = useState<Array<{ id: string; title: string; code?: string | null }>>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [docFilter, setDocFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const rows = (await listDepartments({ data: {} })) as any[];
        setDepartments((rows ?? []).map((d) => ({ id: d.id, name: d.name })));
      } catch {
        /* departments are optional */
      }
      try {
        const rows = (await listDocs({ data: {} })) as any[];
        setDocs(
          (rows ?? []).map((d) => ({ id: d.id, title: d.title ?? "Untitled", code: d.code ?? null })),
        );
      } catch {
        /* Knowledge Base may be empty */
      }
    })();
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDepartmentId(NO_DEPARTMENT);
    setTargetRole("");
    setLanguage("en");
    setDifficulty("standard");
    setPassingScore(70);
    setMandatory(false);
    setPublishStatus("draft");
    setSelectedDocs([]);
    setDocFilter("");
  };

  const toggleDoc = (id: string) =>
    setSelectedDocs((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const visibleDocs = docs.filter((d) => {
    const q = docFilter.trim().toLowerCase();
    if (!q) return true;
    return `${d.code ?? ""} ${d.title}`.toLowerCase().includes(q);
  });

  /** Build the whole course (chapters + lessons) from the selected SOPs. */
  const generateFromKnowledge = async () => {
    if (selectedDocs.length === 0) {
      toast.error("Select at least one Knowledge Base document.");
      return;
    }
    setGenerating(true);
    try {
      const created = (await generate({
        data: {
          document_ids: selectedDocs.slice(0, 15),
          department_id: departmentId === NO_DEPARTMENT ? null : departmentId,
          language,
          target_role: targetRole.trim() || null,
        },
      })) as any;
      notifySaved("Course generated from Knowledge Base —");
      reset();
      onOpenChange(false);
      const id = created?.path_id ?? created?.id ?? created?.pathId;
      if (id) onCreated?.(id as string);
    } catch (err) {
      notifyFailed("generate the course from the Knowledge Base", err);
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Give the course a title.");
      return;
    }
    setBusy(true);
    try {
      const created = (await upsert({
        data: {
          title: title.trim(),
          description: description.trim() || null,
          department_id: departmentId === NO_DEPARTMENT ? null : departmentId,
          target_role: targetRole.trim() || null,
          language,
          difficulty,
          passing_score: passingScore,
          mandatory,
          publish_status: publishStatus,
        },
      })) as any;
      notifySaved("Course");
      reset();
      onOpenChange(false);
      if (created?.id) onCreated?.(created.id as string);
    } catch (err) {
      notifyFailed("create the course", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create course</DialogTitle>
          <DialogDescription>
            Create a learning path, then add chapters and lessons in the course editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-title">Title</Label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Warehouse safety essentials"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-desc">Description</Label>
            <Textarea
              id="course-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will learners be able to do after this course?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-role">Target role</Label>
              <Input
                id="course-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Operator"
              />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-score">Passing score (%)</Label>
              <Input
                id="course-score"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={publishStatus}
                onValueChange={(v) => setPublishStatus(v as "draft" | "published")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold" />
              <div className="text-sm font-medium">Build from Knowledge Base</div>
              {selectedDocs.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedDocs.length} selected
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pick the SOPs this course must teach. Chapters, lessons and examples are generated
              locally from that content — nothing is invented.
            </p>
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No Knowledge Base documents yet. Upload SOPs in Knowledge first.
              </p>
            ) : (
              <>
                <Input
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value)}
                  placeholder="Search documents…"
                  className="h-8 text-xs"
                />
                <ScrollArea className="h-40 rounded-md border border-border">
                  <ul className="p-2 space-y-1">
                    {visibleDocs.map((d) => (
                      <li key={d.id}>
                        <label className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors cursor-pointer">
                          <Checkbox
                            checked={selectedDocs.includes(d.id)}
                            onCheckedChange={() => toggleDoc(d.id)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0">
                            {d.code && (
                              <span className="font-mono text-[10px] text-muted-foreground mr-1">
                                {d.code}
                              </span>
                            )}
                            <span className="font-medium">{d.title}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateFromKnowledge}
                  loading={generating}
                  disabled={busy || selectedDocs.length === 0}
                >
                  {!generating && <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating course…" : "Generate course from selection"}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Mandatory training</div>
              <div className="text-xs text-muted-foreground">
                Assigned learners must complete this course.
              </div>
            </div>
            <Switch checked={mandatory} onCheckedChange={setMandatory} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy || generating}
          >
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={generating}>
            {busy ? "Creating…" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

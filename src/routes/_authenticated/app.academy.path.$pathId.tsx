/* eslint-disable @typescript-eslint/no-explicit-any */
// Academy — course page.
//
// Learners see the chapter/lesson outline and their progress. Managers with
// `academy.manage` additionally get the course editor: add chapters, add or
// edit lessons, delete them. A freshly created course starts empty, so the
// editor is what turns "Create course" into a usable flow instead of a blank
// page.
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAcademyPath,
  enrollSelf,
  startEnrollment,
  completeEnrollment,
  getEnrollmentProgress,
  listMyEnrollments,
  upsertAcademyChapter,
  deleteAcademyChapter,
  upsertAcademyLesson,
  deleteAcademyLesson,
} from "@/lib/academy.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyFailed, notifySaved } from "@/lib/feedback";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  GraduationCap,
  Award,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/academy/path/$pathId")({
  component: PathPage,
});

type LessonDraft = {
  id?: string;
  chapter_id: string;
  title: string;
  objectives: string;
  explanation: string;
  examples: string;
  best_practices: string;
  summary: string;
  estimated_minutes: number;
  publish_status: "draft" | "published";
};

function emptyLesson(chapterId: string): LessonDraft {
  return {
    chapter_id: chapterId,
    title: "",
    objectives: "",
    explanation: "",
    examples: "",
    best_practices: "",
    summary: "",
    estimated_minutes: 10,
    publish_status: "published",
  };
}

function PathPage() {
  const { pathId } = useParams({ from: Route.id });
  const { hasPermission } = useAuth();
  const canManage = hasPermission("academy.manage");

  const getPath = useServerFn(getAcademyPath);
  const enroll = useServerFn(enrollSelf);
  const start = useServerFn(startEnrollment);
  const complete = useServerFn(completeEnrollment);
  const progress = useServerFn(getEnrollmentProgress);
  const mine = useServerFn(listMyEnrollments);
  const saveChapter = useServerFn(upsertAcademyChapter);
  const removeChapter = useServerFn(deleteAcademyChapter);
  const saveLesson = useServerFn(upsertAcademyLesson);
  const removeLesson = useServerFn(deleteAcademyLesson);

  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, any>>({});

  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterDraft, setChapterDraft] = useState<{ id?: string; title: string; summary: string }>({
    title: "",
    summary: "",
  });
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const d = (await getPath({ data: { id: pathId } })) as any;
      setData(d);
      try {
        const list = ((await mine()) as any[]) ?? [];
        const mineEnr = list.find((e) => e.academy_learning_paths?.id === pathId);
        if (mineEnr) {
          setEnrollmentId(mineEnr.id);
          const p = ((await progress({ data: { enrollment_id: mineEnr.id } })) as any[]) ?? [];
          setDone(Object.fromEntries(p.map((r) => [r.lesson_id, r])));
        }
      } catch {
        /* enrollment info is optional for managers */
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this course.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [pathId]);

  const submitChapter = async () => {
    if (!chapterDraft.title.trim()) return;
    setBusy(true);
    try {
      await saveChapter({
        data: {
          id: chapterDraft.id,
          path_id: pathId,
          title: chapterDraft.title.trim(),
          summary: chapterDraft.summary.trim() || null,
          order_index: chapterDraft.id ? undefined as any : (data?.chapters?.length ?? 0),
        },
      });
      notifySaved("Chapter");
      setChapterOpen(false);
      setChapterDraft({ title: "", summary: "" });
      await load();
    } catch (err) {
      notifyFailed("save the chapter", err);
    } finally {
      setBusy(false);
    }
  };

  const submitLesson = async () => {
    if (!lessonDraft || !lessonDraft.title.trim()) return;
    setBusy(true);
    try {
      const siblings = (data?.lessons ?? []).filter(
        (l: any) => l.chapter_id === lessonDraft.chapter_id,
      );
      await saveLesson({
        data: {
          id: lessonDraft.id,
          chapter_id: lessonDraft.chapter_id,
          title: lessonDraft.title.trim(),
          objectives: lessonDraft.objectives
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          explanation: lessonDraft.explanation.trim() || null,
          examples: lessonDraft.examples.trim() || null,
          best_practices: lessonDraft.best_practices.trim() || null,
          summary: lessonDraft.summary.trim() || null,
          estimated_minutes: Math.max(1, Math.min(240, lessonDraft.estimated_minutes || 10)),
          publish_status: lessonDraft.publish_status,
          order_index: lessonDraft.id ? 0 : siblings.length,
        },
      });
      notifySaved("Lesson");
      setLessonDraft(null);
      await load();
    } catch (err) {
      notifyFailed("save the lesson", err);
    } finally {
      setBusy(false);
    }
  };

  const handleEnroll = async () => {
    try {
      const r = (await enroll({ data: { path_id: pathId } })) as any;
      await start({ data: { id: r.id } });
      await load();
    } catch (err) {
      notifyFailed("enroll in this course", err);
    }
  };
  const finish = async () => {
    if (!enrollmentId) return;
    try {
      await complete({ data: { enrollment_id: enrollmentId } });
      await load();
    } catch (err) {
      notifyFailed("complete this course", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState
          icon={AlertTriangle}
          title="This course could not be opened"
          description={loadError ?? "The course no longer exists or you do not have access to it."}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void load()}>
                Try again
              </Button>
              <Button asChild>
                <Link to="/app/academy">Back to Academy</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const { path, chapters, lessons } = data;
  const totalLessons = lessons.length;
  const completed = Object.values(done).filter((d: any) => d.status === "completed").length;
  const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
  const allDone = totalLessons > 0 && completed === totalLessons;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-semibold">{path.title}</h1>
          </div>
          {canManage && (
            <Button
              variant="outline"
              onClick={() => {
                setChapterDraft({ title: "", summary: "" });
                setChapterOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add chapter
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{path.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {path.academy_departments?.name && (
            <Badge variant="secondary">{path.academy_departments.name}</Badge>
          )}
          {path.target_role && <Badge variant="outline">{path.target_role}</Badge>}
          {path.mandatory && <Badge>Mandatory</Badge>}
          <Badge variant="outline">Passing {path.passing_score}%</Badge>
          {path.publish_status && <Badge variant="outline">{path.publish_status}</Badge>}
        </div>
      </div>

      <Card className="p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Progress</div>
          <div className="text-xs text-muted-foreground">
            {completed} / {totalLessons} lessons · {pct}%
          </div>
          <div className="w-64 h-2 bg-muted rounded mt-2 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {totalLessons === 0 ? (
          <Badge variant="outline">No lessons yet</Badge>
        ) : !enrollmentId ? (
          <Button onClick={handleEnroll}>
            <PlayCircle className="h-4 w-4 mr-1" /> Enroll &amp; start
          </Button>
        ) : allDone ? (
          <Button onClick={finish}>
            <Award className="h-4 w-4 mr-1" /> Finish &amp; get certificate
          </Button>
        ) : (
          <Badge variant="secondary">In progress</Badge>
        )}
      </Card>

      {chapters.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="This course has no content yet"
          description={
            canManage
              ? "Add a first chapter, then add lessons inside it. You can also generate a whole course from your Knowledge Base documents."
              : "Your training manager is still preparing this course."
          }
          action={
            canManage ? (
              <Button
                onClick={() => {
                  setChapterDraft({ title: "", summary: "" });
                  setChapterOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add first chapter
              </Button>
            ) : undefined
          }
        />
      )}

      {chapters.map((ch: any) => {
        const chLessons = lessons.filter((l: any) => l.chapter_id === ch.id);
        return (
          <Card key={ch.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{ch.title}</div>
                {ch.summary && <div className="text-xs text-muted-foreground">{ch.summary}</div>}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setChapterDraft({ id: ch.id, title: ch.title, summary: ch.summary ?? "" }) ||
                      setChapterOpen(true)
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await removeChapter({ data: { id: ch.id } });
                        await load();
                      } catch (err) {
                        notifyFailed("delete the chapter", err);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {chLessons.map((l: any) => {
                const status = done[l.id]?.status;
                const isDone = status === "completed";
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent text-sm"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Link
                      to="/app/academy/lesson/$lessonId"
                      params={{ lessonId: l.id }}
                      search={{ enrollmentId: enrollmentId ?? "" }}
                      className="flex-1 truncate"
                    >
                      {l.title}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {l.estimated_minutes}m
                    </span>
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setLessonDraft({
                              id: l.id,
                              chapter_id: ch.id,
                              title: l.title ?? "",
                              objectives: Array.isArray(l.objectives)
                                ? l.objectives.join("\n")
                                : "",
                              explanation: l.explanation ?? "",
                              examples: l.examples ?? "",
                              best_practices: l.best_practices ?? "",
                              summary: l.summary ?? "",
                              estimated_minutes: l.estimated_minutes ?? 10,
                              publish_status:
                                l.publish_status === "published" ? "published" : "draft",
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await removeLesson({ data: { id: l.id } });
                              await load();
                            } catch (err) {
                              notifyFailed("delete the lesson", err);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {chLessons.length === 0 && (
                <div className="text-xs text-muted-foreground italic">
                  No lessons in this chapter yet.
                </div>
              )}
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 gap-1.5"
                  onClick={() => setLessonDraft(emptyLesson(ch.id))}
                >
                  <Plus className="h-3.5 w-3.5" /> Add lesson
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {/* Chapter dialog */}
      <Dialog open={chapterOpen} onOpenChange={setChapterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chapterDraft.id ? "Edit chapter" : "Add chapter"}</DialogTitle>
            <DialogDescription>Chapters group the lessons of this course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ch-title">Title</Label>
              <Input
                id="ch-title"
                value={chapterDraft.title}
                onChange={(e) => setChapterDraft({ ...chapterDraft, title: e.target.value })}
                placeholder="e.g. Before you start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-summary">Summary</Label>
              <Textarea
                id="ch-summary"
                rows={2}
                value={chapterDraft.summary}
                onChange={(e) => setChapterDraft({ ...chapterDraft, summary: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChapterOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy || !chapterDraft.title.trim()} onClick={() => void submitChapter()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      <Dialog open={!!lessonDraft} onOpenChange={(v) => !v && setLessonDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lessonDraft?.id ? "Edit lesson" : "Add lesson"}</DialogTitle>
            <DialogDescription>
              Write the lesson content learners will read before the quiz.
            </DialogDescription>
          </DialogHeader>
          {lessonDraft && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ls-title">Title</Label>
                <Input
                  id="ls-title"
                  value={lessonDraft.title}
                  onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ls-obj">Objectives (one per line)</Label>
                <Textarea
                  id="ls-obj"
                  rows={3}
                  value={lessonDraft.objectives}
                  onChange={(e) => setLessonDraft({ ...lessonDraft, objectives: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ls-exp">Explanation</Label>
                <Textarea
                  id="ls-exp"
                  rows={6}
                  value={lessonDraft.explanation}
                  onChange={(e) => setLessonDraft({ ...lessonDraft, explanation: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ls-ex">Examples</Label>
                  <Textarea
                    id="ls-ex"
                    rows={4}
                    value={lessonDraft.examples}
                    onChange={(e) => setLessonDraft({ ...lessonDraft, examples: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ls-bp">Best practices</Label>
                  <Textarea
                    id="ls-bp"
                    rows={4}
                    value={lessonDraft.best_practices}
                    onChange={(e) =>
                      setLessonDraft({ ...lessonDraft, best_practices: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ls-sum">Summary</Label>
                <Textarea
                  id="ls-sum"
                  rows={2}
                  value={lessonDraft.summary}
                  onChange={(e) => setLessonDraft({ ...lessonDraft, summary: e.target.value })}
                />
              </div>
              <div className="space-y-2 max-w-[12rem]">
                <Label htmlFor="ls-min">Estimated minutes</Label>
                <Input
                  id="ls-min"
                  type="number"
                  min={1}
                  max={240}
                  value={lessonDraft.estimated_minutes}
                  onChange={(e) =>
                    setLessonDraft({
                      ...lessonDraft,
                      estimated_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLessonDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !lessonDraft?.title.trim()}
              onClick={() => void submitLesson()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

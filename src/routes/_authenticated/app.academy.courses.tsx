/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { academySuggestPath, listMyEnrollments, enrollSelf } from "@/lib/academy.functions";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, PlayCircle, Clock, BookOpen } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";

export const Route = createFileRoute("/_authenticated/app/academy/courses")({
  component: MyCourses,
  head: () => ({ meta: [{ title: "My Courses · Academy" }] }),
});

function MyCourses() {
  const { lang } = useT();
  const suggest = useServerFn(academySuggestPath);
  const myEnroll = useServerFn(listMyEnrollments);
  const enroll = useServerFn(enrollSelf);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("entry");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const refresh = async () => setEnrollments(((await myEnroll()) as any[]) ?? []);
  useEffect(() => {
    void refresh();
  }, []);

  const findPaths = async () => {
    const s = (await suggest({ data: { department, role, experience, language: lang } })) as any[];
    setSuggestions(s ?? []);
  };
  const doEnroll = async (pathId: string) => {
    await enroll({ data: { path_id: pathId } });
    await refresh();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-6xl mx-auto space-y-8 w-full">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> My learning journey
          </h2>
          {enrollments.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No active courses yet. Use the AI welcome below to discover learning paths tailored to
              your role.
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {enrollments.map((e) => (
                <Card key={e.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{e.academy_learning_paths?.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.academy_learning_paths?.academy_departments?.name ?? "—"}
                      </div>
                    </div>
                    <Badge variant={e.status === "completed" ? "default" : "secondary"}>
                      {e.status}
                    </Badge>
                  </div>
                  {e.due_at && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {new Date(e.due_at).toLocaleDateString()}
                    </div>
                  )}
                  <Button asChild size="sm" className="mt-1">
                    <Link
                      to="/app/academy/path/$pathId"
                      params={{ pathId: e.academy_learning_paths.id }}
                    >
                      <PlayCircle className="h-4 w-4 mr-1" /> Continue
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Discover learning paths for your role
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <Input
              placeholder="Department (e.g. Warehouse)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <Input
              placeholder="Role (e.g. Operator)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="experienced">Experienced</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={findPaths}>Find my paths</Button>
          </div>
          {suggestions.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              {suggestions.map((p) => (
                <Card key={p.id} className="p-4 space-y-2">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {p.academy_departments?.name && (
                      <Badge variant="secondary">{p.academy_departments.name}</Badge>
                    )}
                    {p.target_role && <Badge variant="outline">{p.target_role}</Badge>}
                    {p.mandatory && <Badge>Mandatory</Badge>}
                  </div>
                  <Button size="sm" onClick={() => doEnroll(p.id)} className="mt-2">
                    Enroll
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

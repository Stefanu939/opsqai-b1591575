/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  academySuggestPath, listMyEnrollments, enrollSelf, listMyCertificates, certificateSignedUrl,
} from "@/lib/academy.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Sparkles, Award, Download, PlayCircle, BookOpen, Clock } from "lucide-react";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/app/academy/")({
  component: AcademyHome,
  head: () => ({ meta: [{ title: "Academy · OPSQAI" }] }),
});

function AcademyHome() {
  const { lang } = useT();
  const suggest = useServerFn(academySuggestPath);
  const myEnroll = useServerFn(listMyEnrollments);
  const enroll = useServerFn(enrollSelf);
  const myCerts = useServerFn(listMyCertificates);
  const certUrl = useServerFn(certificateSignedUrl);

  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("entry");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);

  const refresh = async () => {
    const [e, c] = await Promise.all([myEnroll(), myCerts()]);
    setEnrollments((e as any[]) ?? []);
    setCerts((c as any[]) ?? []);
  };
  useEffect(() => { void refresh(); }, []);

  const findPaths = async () => {
    const s = (await suggest({ data: { department, role, experience, language: lang } })) as any[];
    setSuggestions(s ?? []);
  };
  const doEnroll = async (pathId: string) => {
    await enroll({ data: { path_id: pathId } });
    await refresh();
  };
  const download = async (id: string) => {
    const { url } = (await certUrl({ data: { id } })) as { url: string };
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">OPSQAI Academy</h1>
        </div>
        <p className="text-muted-foreground">
          Welcome. Let's set up your personalized onboarding — pick your department and role and I'll load your learning paths.
        </p>
      </header>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI welcome</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Input placeholder="Department (e.g. Warehouse)" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Input placeholder="Role (e.g. Operator)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
                  {p.academy_departments?.name && <Badge variant="secondary">{p.academy_departments.name}</Badge>}
                  {p.target_role && <Badge variant="outline">{p.target_role}</Badge>}
                  {p.mandatory && <Badge>Mandatory</Badge>}
                </div>
                <Button size="sm" onClick={() => doEnroll(p.id)} className="mt-2">Enroll</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> My learning</h2>
        {enrollments.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No enrollments yet. Use the AI welcome above to find paths.</Card>
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
                  <Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge>
                </div>
                {e.due_at && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(e.due_at).toLocaleDateString()}</div>}
                <Button asChild size="sm" variant="default" className="mt-1">
                  <Link to="/app/academy/path/$pathId" params={{ pathId: e.academy_learning_paths.id }}>
                    <PlayCircle className="h-4 w-4 mr-1" /> Continue
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Award className="h-5 w-5" /> My certificates</h2>
        {certs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No certificates yet — complete a learning path to earn one.</Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {certs.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="font-medium text-sm">{c.academy_learning_paths?.title}</div>
                <div className="text-xs text-muted-foreground">Score {c.final_score}% · {new Date(c.issued_at).toLocaleDateString()}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{c.certificate_code}</div>
                <Button size="sm" variant="outline" disabled={!c.pdf_path} onClick={() => download(c.id)}>
                  <Download className="h-4 w-4 mr-1" /> {c.pdf_path ? "Download PDF" : "Generating…"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

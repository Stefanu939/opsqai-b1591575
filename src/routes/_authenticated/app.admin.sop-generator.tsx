import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateSop, validateSop, publishGeneratedSop } from "@/lib/ai-features.functions";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  Upload,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/sop-generator")({
  component: SopGenerator,
});

function SopGenerator() {
  const { hasPermission } = useAuth();
  if (!hasPermission("sop.generate")) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const gen = useServerFn(generateSop);
  const val = useServerFn(validateSop);
  const pub = useServerFn(publishGeneratedSop);

  const [step, setStep] = useState<"wizard" | "edit" | "validate" | "published">("wizard");
  const [form, setForm] = useState({
    title: "",
    department: "",
    category: "Procedures",
    purpose: "",
    inputs: "",
    outputs: "",
    responsibleRole: "",
    riskLevel: "medium" as "low" | "medium" | "high" | "critical",
    approvalLevel: "manager" as "supervisor" | "manager" | "admin",
    language: "en" as "en" | "de" | "ro",
    doc_code: "",
  });
  const [markdown, setMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  const onGenerate = async () => {
    if (!form.title || !form.purpose) return toast.error("Title and Purpose are required");
    setBusy(true);
    try {
      const r = await gen({ data: form });
      setMarkdown(r.markdown);
      setStep("edit");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onValidate = async () => {
    setBusy(true);
    try {
      const r = await val({ data: { markdown, language: form.language } });
      setValidation(r);
      setStep("validate");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onPublish = async () => {
    setBusy(true);
    try {
      await pub({
        data: {
          title: form.title,
          category: form.category,
          doc_code: form.doc_code || null,
          markdown,
          language: form.language,
        },
      });
      toast.success("SOP published to Knowledge Base");
      setStep("published");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">
            Knowledge
          </p>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI SOP Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Draft → validate → publish, all assisted by AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpDialog />
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/knowledge">
              <ArrowLeft className="h-4 w-4 mr-1" /> Knowledge
            </Link>
          </Button>
        </div>
      </div>

      {step === "wizard" && (
        <Card className="card-enterprise border-0 p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title *">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Outbound shipment handover"
              />
            </Field>
            <Field label="Doc code">
              <Input
                value={form.doc_code}
                onChange={(e) => setForm({ ...form, doc_code: e.target.value })}
                placeholder="SOP-042"
              />
            </Field>
            <Field label="Department">
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Warehouse"
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Procedures",
                    "Safety",
                    "Transport",
                    "Inbound",
                    "Outbound",
                    "Quality",
                    "HR",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Responsible role">
              <Input
                value={form.responsibleRole}
                onChange={(e) => setForm({ ...form, responsibleRole: e.target.value })}
                placeholder="Shift Supervisor"
              />
            </Field>
            <Field label="Risk level">
              <Select
                value={form.riskLevel}
                onValueChange={(v: any) => setForm({ ...form, riskLevel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "critical"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Approval level">
              <Select
                value={form.approvalLevel}
                onValueChange={(v: any) => setForm({ ...form, approvalLevel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["supervisor", "manager", "admin"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Language">
              <Select
                value={form.language}
                onValueChange={(v: any) => setForm({ ...form, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["en", "de", "ro"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Purpose *">
            <Textarea
              rows={3}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="Why does this SOP exist?"
            />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Inputs">
              <Textarea
                rows={3}
                value={form.inputs}
                onChange={(e) => setForm({ ...form, inputs: e.target.value })}
                placeholder="Documents, signals, prerequisites…"
              />
            </Field>
            <Field label="Outputs">
              <Textarea
                rows={3}
                value={form.outputs}
                onChange={(e) => setForm({ ...form, outputs: e.target.value })}
                placeholder="Deliverables and records produced."
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={onGenerate} disabled={busy}>
              <Sparkles className="h-4 w-4 mr-1" /> {busy ? "Generating…" : "Generate SOP"}
            </Button>
          </div>
        </Card>
      )}

      {step === "edit" && (
        <Card className="card-enterprise border-0 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Draft (editable)
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("wizard")}>
                ← Back
              </Button>
              <Button variant="outline" size="sm" onClick={onValidate} disabled={busy}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Validate
              </Button>
              <Button size="sm" onClick={onPublish} disabled={busy}>
                <Upload className="h-4 w-4 mr-1" /> Publish
              </Button>
            </div>
          </div>
          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={24}
            className="font-mono text-xs"
          />
        </Card>
      )}

      {step === "validate" && validation && (
        <Card className="card-enterprise border-0 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Quality score
              </div>
              <div className="text-4xl font-semibold tabular-nums">{validation.score}/100</div>
              <p className="text-sm text-muted-foreground mt-1">{validation.summary}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("edit")}>
                ← Edit
              </Button>
              <Button size="sm" onClick={onPublish} disabled={busy}>
                <Upload className="h-4 w-4 mr-1" /> Publish anyway
              </Button>
            </div>
          </div>
          <Progress value={validation.score} className="h-2" />
          {validation.issues?.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2">Findings</div>
              <ul className="space-y-2">
                {validation.issues.map((i: any, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm border border-border rounded-md p-3"
                  >
                    {i.severity === "critical" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : i.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <Badge variant="outline" className="mr-1.5">
                          {i.type}
                        </Badge>
                        {i.message}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.suggestions?.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2">Suggestions</div>
              <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                {validation.suggestions.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {step === "published" && (
        <Card className="card-enterprise border-0 p-10 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <div className="text-lg font-semibold">SOP published</div>
          <p className="text-sm text-muted-foreground">
            It will be searchable in chat once indexed.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to="/app/knowledge">Open Knowledge Base</Link>
            </Button>
            <Button
              onClick={() => {
                setStep("wizard");
                setMarkdown("");
                setValidation(null);
              }}
            >
              Create another
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function HelpDialog() {
  const fields: Array<{ name: string; tip: string }> = [
    {
      name: "Title",
      tip: "Short, action-oriented name (e.g. 'Outbound shipment handover'). Avoid abbreviations.",
    },
    {
      name: "Doc code",
      tip: "Stable identifier such as SOP-042. Used for citations and version tracking.",
    },
    {
      name: "Department",
      tip: "Owning unit (Warehouse, Quality, HR…). Drives routing & permissions.",
    },
    {
      name: "Category",
      tip: "High-level type (Procedures, Safety, Transport, …) used for filtering and analytics.",
    },
    {
      name: "Responsible role",
      tip: "Job title accountable for executing the SOP (e.g. Shift Supervisor).",
    },
    {
      name: "Risk level",
      tip: "Operational/safety impact. Critical SOPs surface in dashboards and require acknowledgement.",
    },
    { name: "Approval level", tip: "Minimum role required to publish/approve revisions." },
    {
      name: "Language",
      tip: "Source language for the draft. The chat layer still answers in the user's language.",
    },
    {
      name: "Purpose",
      tip: "Why this SOP exists, in 1–3 sentences. The AI uses this to scope every section.",
    },
    {
      name: "Inputs",
      tip: "Documents, signals, equipment or prerequisites needed before starting.",
    },
    {
      name: "Outputs",
      tip: "Concrete deliverables, records, or system updates produced when the SOP is followed.",
    },
  ];
  const tips = [
    "Be specific — vague purposes produce generic SOPs.",
    "Prefer numbered procedural steps; the validator rewards measurable instructions.",
    "Always run Validate before Publish to catch missing safety/approval sections.",
    "Published SOPs are auto-chunked and embedded for the assistant — give them a clear doc code.",
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="SOP Generator help">
          <HelpCircle className="h-4 w-4 mr-1" /> Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> AI SOP Generator — Field Guide
          </DialogTitle>
          <DialogDescription>
            How each field shapes the draft, and best practices for high-quality SOPs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Fields
            </h4>
            <dl className="space-y-2">
              {fields.map((f) => (
                <div key={f.name} className="border border-border rounded-md p-3">
                  <dt className="font-medium">{f.name}</dt>
                  <dd className="text-muted-foreground text-xs mt-0.5">{f.tip}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Best practices
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Workflow
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground text-xs">
              <li>Fill the wizard → Generate produces a Markdown draft.</li>
              <li>Edit the draft inline; refine wording, numbers, responsibilities.</li>
              <li>Validate to score quality and surface missing sections.</li>
              <li>Publish to push the SOP into the Knowledge Base (chunked &amp; embedded).</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Copy, FileText, Mail, MessageCircle, Phone, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeClient, type ClientAnalysis } from "@/lib/sales-tools.functions";
import { onePagerHtml, openHtml, securityHtml } from "@/lib/sales-html";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { FollowUpRadar } from "@/components/mc/follow-up-radar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  INDUSTRY_LABELS,
  OBJECTIONS,
  TONES,
  mailtoUrl,
  telUrl,
  toneObjection,
  toneScripts,
  whatsappUrl,
  type Industry,
  type Tone,
} from "@/lib/mc-outreach";

export const Route = createFileRoute("/_authenticated/management/sales")({
  validateSearch: (s: Record<string, unknown>) => ({ company: typeof s.company === "string" ? s.company : "", contact: typeof s.contact === "string" ? s.contact : "", phone: typeof s.phone === "string" ? s.phone : "", email: typeof s.email === "string" ? s.email : "", notes: typeof s.notes === "string" ? s.notes : "" }),
  head: () => ({
    meta: [
      { title: "Sales Cockpit — OPSQAI Management Center" },
      { name: "description", content: "Script de apel, răspunsuri la obiecții și mesaje WhatsApp/email gata de trimis." },
      { property: "og:title", content: "Sales Cockpit — OPSQAI Management Center" },
      { property: "og:description", content: "Unelte de prospectare pentru echipa OPSQAI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesCockpit,
});

function copy(text: string) {
  void navigator.clipboard.writeText(text);
  toast.success("Copiat");
}

function SalesCockpit() {
  const pre = Route.useSearch();
  const [name, setName] = useState(pre.contact);
  const [company, setCompany] = useState(pre.company);
  const [phone, setPhone] = useState(pre.phone);
  const [email, setEmail] = useState(pre.email);
  const [sender, setSender] = useState("Ștefan");
  const [time, setTime] = useState("");
  const [industry, setIndustry] = useState<Industry>("transport");
  const [kind, setKind] = useState<"intro" | "followup">("intro");
  const [objection, setObjection] = useState(0);

  const [tone, setTone] = useState<Tone>("generic");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState(pre.notes);
  const [analysis, setAnalysis] = useState<ClientAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = useServerFn(analyzeClient);
  useEffect(() => { setName(pre.contact); setCompany(pre.company); setPhone(pre.phone); setEmail(pre.email); setNotes(pre.notes); setAnalysis(null); setWaEdit(null); }, [pre.company, pre.contact, pre.phone, pre.email, pre.notes]);

  const vars = { name, company, sender, time };
  const sc = toneScripts(tone, industry, vars);
  const waText = kind === "intro" ? sc.whatsapp : sc.whatsappFollowUp;
  const [waEdit, setWaEdit] = useState<string | null>(null);
  const waFinal = waEdit ?? waText;
  const mail = { subject: sc.subject, body: sc.email };
  const objections = [
    ...OBJECTIONS.map((o, i) => ({ q: o.q, a: toneObjection(tone, i) })),
    ...(analysis?.objections ?? []).map((o) => ({ q: `„${o.q.replace(/[„”"]/g, "")}”`, a: o.a })),
  ];

  const runAnalysis = async () => {
    if (!company.trim()) return toast.error("Completează firma.");
    setAnalyzing(true);
    try {
      const r = await analyze({ data: { company, industry: INDUSTRY_LABELS[industry], contact: name || null, role: role || null, notes: notes || null } });
      setAnalysis(r);
      setTone(r.tone);
      setWaEdit(null);
      toast.success("Analiză gata. Tonul recomandat a fost aplicat.");
    } catch {
      toast.error("Kai nu a putut face analiza acum.");
    } finally {
      setAnalyzing(false);
    }
  };
  const docInput = { company, contact: name, sender, industry: INDUSTRY_LABELS[industry], pains: analysis?.pains, pilotGoal: analysis?.pilotGoal, modules: analysis?.modules };

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Sales Cockpit"
      description="Ține pagina deschisă în timpul apelului: scriptul, obiecțiile și mesajele sunt la un click."
    >
      <FollowUpRadar sender={sender} />

      <Panel title="Cu cine vorbești?">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Persoană de contact" value={name} onChange={setName} placeholder="dl. Popescu" />
          <Field label="Firmă" value={company} onChange={setCompany} placeholder="Transport SRL" />
          <Field label="Numele tău" value={sender} onChange={setSender} />
          <Field label="Telefon" value={phone} onChange={setPhone} placeholder="07xx xxx xxx" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="director@firma.ro" />
          <Field label="Ora demo (follow-up)" value={time} onChange={setTime} placeholder="joi 14:00" />
          <Field label="Funcția persoanei" value={role} onChange={setRole} placeholder="Director HR" />
          <div className="sm:col-span-2">
            <Label className="text-xs">Ce știi despre firmă (opțional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex. 400 angajați, 3 depozite, interesați de HR" className="mt-1" />
          </div>
        </div>
        <div className="mt-4">
          <Label className="text-xs">Domeniu</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
              <Chip key={k} active={industry === k} onClick={() => { setIndustry(k); setWaEdit(null); }}>{INDUSTRY_LABELS[k]}</Chip>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Label className="text-xs">Tonul persoanei</Label>
          <div className="mt-1 grid gap-2 sm:grid-cols-4">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTone(t.id); setWaEdit(null); }}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  tone === t.id ? "border-primary bg-primary/15" : "border-border hover:border-primary/40",
                )}
              >
                <div className="text-sm font-medium text-foreground">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!phone} asChild={Boolean(phone)}>
            <a href={telUrl(phone)}><Phone className="mr-1.5 h-4 w-4" />Sună acum</a>
          </Button>
          <Button size="sm" onClick={runAnalysis} disabled={analyzing}>
            <Brain className="mr-1.5 h-4 w-4" />{analyzing ? "Kai analizează…" : "Analiză client cu Kai"}
          </Button>
          <Button size="sm" variant="outline" disabled={!company.trim()} onClick={() => openHtml(onePagerHtml(docInput))}>
            <FileText className="mr-1.5 h-4 w-4" />One-Pager (pilot gratuit)
          </Button>
          <Button size="sm" variant="outline" disabled={!company.trim()} onClick={() => openHtml(securityHtml(docInput))}>
            <ShieldCheck className="mr-1.5 h-4 w-4" />Pagină securitate
          </Button>
        </div>
      </Panel>

      {analysis && (
        <Panel title={`Analiza lui Kai · ${company}`}>
          <p className="text-sm leading-relaxed text-foreground">{analysis.profile}</p>
          {analysis.angle && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              <span className="text-xs font-medium uppercase tracking-wider text-primary">Unghi de deschidere · </span>{analysis.angle}
            </div>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Dureri probabile (de verificat)</div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">{analysis.pains.map((p) => <li key={p}>{p}</li>)}</ul>
              {analysis.pilotGoal && <p className="mt-3 text-sm text-muted-foreground"><b className="text-foreground">Obiectiv pilot:</b> {analysis.pilotGoal}</p>}
              {analysis.modules.length > 0 && <p className="mt-1 text-sm text-muted-foreground"><b className="text-foreground">Module:</b> {analysis.modules.join(", ")}</p>}
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Întrebări de diagnostic</div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">{analysis.questions.map((q) => <li key={q}>{q}</li>)}</ol>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Analiza e o ipoteză, nu date verificate. One-Pager-ul folosește automat aceste dureri și obiectivul pilotului.</p>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Teleprompter apel (60 secunde)">
          <Step n={1} title="Deschidere — primele 15 secunde" text={sc.opening} />
          <Step n={2} title="Dacă spune „Da, spuneți”" text={sc.pitch} />
          <p className="mt-3 text-xs text-muted-foreground">
            Regula de aur: ținta apelului e doar un demo de 15 minute, nu vânzarea.
          </p>
        </Panel>

        <Panel title="Răspuns la obiecții">
          <div className="flex flex-wrap gap-2">
            {objections.map((o, i) => (
              <button
                key={o.q}
                type="button"
                onClick={() => setObjection(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  i === objection
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {o.q}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <ShieldQuestion className="h-4 w-4" /> Replica ta
            </div>
            <p className="text-base leading-relaxed text-foreground">{objections[objection]?.a}</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Mesaj WhatsApp">
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip active={kind === "intro"} onClick={() => { setKind("intro"); setWaEdit(null); }}>
              Primul mesaj
            </Chip>
            <Chip active={kind === "followup"} onClick={() => { setKind("followup"); setWaEdit(null); }}>
              Follow-up după apel
            </Chip>
          </div>
          <Textarea rows={7} value={waFinal} onChange={(e) => setWaEdit(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={whatsappUrl(phone, waFinal)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />Deschide în WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(waFinal)}>
              <Copy className="mr-1.5 h-4 w-4" />Copiază
            </Button>
          </div>
        </Panel>

        <Panel title="Email la rece">
          <Label className="text-xs text-muted-foreground">Subiect</Label>
          <p className="mb-2 text-sm font-medium text-foreground">{mail.subject}</p>
          <Textarea rows={11} readOnly value={mail.body} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={mailtoUrl(email, mail.subject, mail.body)}>
                <Mail className="mr-1.5 h-4 w-4" />Deschide în email
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(`${mail.subject}\n\n${mail.body}`)}>
              <Copy className="mr-1.5 h-4 w-4" />Copiază
            </Button>
          </div>
        </Panel>
      </div>
    </ModulePage>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="mb-3 rounded-lg border border-border bg-secondary/40 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">{n}. {title}</span>
        <button type="button" onClick={() => copy(text)} className="text-muted-foreground hover:text-foreground" aria-label="Copiază">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-base leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

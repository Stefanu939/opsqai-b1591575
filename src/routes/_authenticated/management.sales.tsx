import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Mail, MessageCircle, Phone, ShieldQuestion } from "lucide-react";
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
  CALL_OPENING,
  CALL_PITCH,
  INDUSTRY_LABELS,
  OBJECTIONS,
  coldEmail,
  fillScript,
  mailtoUrl,
  telUrl,
  whatsappTemplate,
  whatsappUrl,
  type Industry,
} from "@/lib/mc-outreach";

export const Route = createFileRoute("/_authenticated/management/sales")({
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
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState("Ștefan");
  const [time, setTime] = useState("");
  const [industry, setIndustry] = useState<Industry>("transport");
  const [kind, setKind] = useState<"intro" | "followup">("intro");
  const [objection, setObjection] = useState(0);

  const vars = { name, company, sender, time };
  const waText = whatsappTemplate(kind === "intro" ? industry : "followup", vars);
  const [waEdit, setWaEdit] = useState<string | null>(null);
  const waFinal = waEdit ?? waText;
  const mail = coldEmail(vars);

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
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!phone} asChild={Boolean(phone)}>
            <a href={telUrl(phone)}><Phone className="mr-1.5 h-4 w-4" />Sună acum</a>
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Teleprompter apel (60 secunde)">
          <Step n={1} title="Deschidere — primele 15 secunde" text={fillScript(CALL_OPENING, vars)} />
          <Step n={2} title="Dacă spune „Da, spuneți”" text={fillScript(CALL_PITCH, vars)} />
          <p className="mt-3 text-xs text-muted-foreground">
            Regula de aur: ținta apelului e doar un demo de 15 minute, nu vânzarea.
          </p>
        </Panel>

        <Panel title="Răspuns la obiecții">
          <div className="flex flex-wrap gap-2">
            {OBJECTIONS.map((o, i) => (
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
            <p className="text-base leading-relaxed text-foreground">{OBJECTIONS[objection].a}</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Mesaj WhatsApp">
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
              <Chip key={k} active={kind === "intro" && industry === k} onClick={() => { setKind("intro"); setIndustry(k); setWaEdit(null); }}>
                {INDUSTRY_LABELS[k]}
              </Chip>
            ))}
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
          <Textarea rows={9} readOnly value={mail.body} />
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

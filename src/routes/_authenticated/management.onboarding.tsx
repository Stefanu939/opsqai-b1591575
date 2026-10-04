import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Check, Copy, Dices, Download, Mail, MessageCircle, Package, Rocket, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COMPANY_PROFILES } from "@/lib/product-architecture";
import { createCompany } from "@/lib/companies.functions";
import { onboardCustomer } from "@/lib/onboarding.functions";
import { lookupCompanyByCui } from "@/lib/mc-growth.functions";
import { WORKSPACES } from "@/lib/mc-pricing";
import { generatePassword, mailtoUrl, whatsappUrl } from "@/lib/mc-outreach";

export const Route = createFileRoute("/_authenticated/management/onboarding")({
  head: () => ({
    meta: [
      { title: "Client nou în 3 pași — OPSQAI Management Center" },
      { name: "description", content: "De la prospect la client instalat: firmă, pachet, licență și kit de instalare." },
      { property: "og:title", content: "Client nou în 3 pași — OPSQAI" },
      { property: "og:description", content: "Firmă, pachet, licență și mesaj gata de trimis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    company: typeof s.company === "string" ? s.company : undefined,
    contact: typeof s.contact === "string" ? s.contact : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
    phone: typeof s.phone === "string" ? s.phone : undefined,
  }),
  component: OnboardingWizard,
});

function makeInstallId(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "client";
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${/^[a-z0-9]/.test(base) ? base : "c" + base}-${rnd}`;
}

type Result = { installId: string; url?: string; packageError?: string };

function OnboardingWizard() {
  const pre = Route.useSearch();
  const [preFirst, ...preRest] = (pre.contact ?? "").trim().split(/\s+/);
  const [step, setStep] = useState(1);
  // step 1
  const [cui, setCui] = useState("");
  const [name, setName] = useState(pre.company ?? "");
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState("");
  const [first, setFirst] = useState(preFirst ?? "");
  const [last, setLast] = useState(preRest.join(" "));
  const [email, setEmail] = useState(pre.email ?? "");
  const [phone, setPhone] = useState(pre.phone ?? "");
  const [password, setPassword] = useState(() => generatePassword());
  // step 2
  const [workstations, setWorkstations] = useState(2);
  const [products, setProducts] = useState<string[]>([]);
  const [tier, setTier] = useState<"basic" | "standard" | "business" | "enterprise">("standard");
  const [months, setMonths] = useState(12);
  const [result, setResult] = useState<Result | null>(null);

  const lookup = useServerFn(lookupCompanyByCui);
  const lookupMut = useMutation({
    mutationFn: () => lookup({ data: { cui } }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.error);
      setName(r.name);
      setAddress(r.address);
      if (r.phone && !phone) setPhone(r.phone);
      toast.success("Date completate din registrul ANAF — verifică-le");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useServerFn(createCompany);
  const onboard = useServerFn(onboardCustomer);
  const runMut = useMutation({
    mutationFn: async () => {
      const seats = 1 + workstations;
      await create({
        data: {
          name: name.trim(),
          business_type: profile,
          enabled_products: products,
          subscription_plan: "pro",
          max_users: Math.max(seats, 10),
          admin_email: email.trim(),
          admin_password: password,
          admin_first_name: first.trim() || undefined,
          admin_last_name: last.trim() || undefined,
        },
      } as never);
      const installId = makeInstallId(name);
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      const r = await onboard({
        data: {
          install_id: installId,
          company_name: name.trim(),
          contact_email: email.trim(),
          tier,
          seats,
          expires_at: expires.toISOString(),
          modules: [],
          notes: [cui && `CUI ${cui}`, address].filter(Boolean).join(" · ") || undefined,
          send_email: false,
        },
      } as never);
      return { installId, url: r.signed_url, packageError: r.package_error } as Result;
    },
    onSuccess: (r) => {
      setResult(r);
      setStep(3);
      toast.success("Client creat și licență emisă");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const step1Ok = name.trim() && profile && /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  const greeting = first ? `Bună ziua, ${first}!` : "Bună ziua!";
  const message = result
    ? `${greeting} Bun venit la OPSQAI. Instalarea pentru ${name} se face în 3 pași:\n\n1. Descărcați kitul de instalare pe calculatorul principal: ${result.url ?? "(link-ul vi-l trimitem separat)"}\n2. Rulați OPSQAI-Setup.exe și alegeți „Calculator principal”. Licența este deja inclusă în kit.\n3. Conectați-vă cu: ${email} / parolă temporară: ${password} (o schimbați la prima autentificare). Pe celelalte ${workstations} calculatoare instalați „Stație de lucru”.\n\nSuntem aici pentru orice întrebare. — Echipa OPSQAI`
    : "";

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Client nou în 3 pași"
      description="Firma, pachetul, apoi licența și kitul de instalare sunt create automat, cu mesajul gata de trimis."
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: 1, label: "Firma", icon: Building2 },
          { n: 2, label: "Pachetul", icon: Package },
          { n: 3, label: "Licență & kit", icon: Rocket },
        ].map((s) => (
          <div
            key={s.n}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              step === s.n ? "border-primary bg-primary/10" : step > s.n ? "border-success/40 bg-success/5" : "border-border bg-card",
            )}
          >
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold", step > s.n ? "bg-success text-success-foreground" : step === s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {step > s.n ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <span className="text-sm font-medium text-foreground">{s.label}</span>
            <s.icon className="ml-auto hidden h-4 w-4 text-muted-foreground sm:block" />
          </div>
        ))}
      </div>

      {step === 1 && (
        <Panel title="Datele firmei">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label className="text-xs">CUI / CIF</Label>
              <Input className="mt-1" value={cui} onChange={(e) => setCui(e.target.value)} placeholder="RO12345678" />
            </div>
            <Button variant="outline" disabled={cui.replace(/\D/g, "").length < 2 || lookupMut.isPending} onClick={() => lookupMut.mutate()}>
              <Wand2 className="mr-1.5 h-4 w-4" />{lookupMut.isPending ? "Caut…" : "Completează automat din ANAF"}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Completarea manuală e standard. Butonul e opțional și preia doar datele publice ale firmei.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label className="text-xs">Denumire firmă</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Profil companie</Label>
              <Select value={profile} onValueChange={setProfile}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Alege profilul" /></SelectTrigger>
                <SelectContent>{COMPANY_PROFILES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Adresă</Label><Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div><Label className="text-xs">Prenume director / administrator</Label><Input className="mt-1" value={first} onChange={(e) => setFirst(e.target.value)} /></div>
            <div><Label className="text-xs">Nume</Label><Input className="mt-1" value={last} onChange={(e) => setLast(e.target.value)} /></div>
            <div><Label className="text-xs">Email (cont administrator)</Label><Input type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label className="text-xs">Telefon (WhatsApp)</Label><Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Parolă temporară</Label>
              <div className="mt-1 flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
                <Button variant="outline" onClick={() => setPassword(generatePassword())} aria-label="Generează parolă"><Dices className="h-4 w-4" /></Button>
              </div>
              {password.length > 0 && password.length < 8 && <p className="mt-1 text-[11px] text-destructive">Minim 8 caractere.</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!step1Ok} onClick={() => setStep(2)}>Continuă la pachet</Button>
          </div>
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Pachetul clientului">
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Calculatoare (locuri în licență)</span>
                <span className="font-medium text-foreground">1 principal + {workstations} stații = {1 + workstations} locuri</span>
              </div>
              <Slider min={0} max={50} step={1} value={[workstations]} onValueChange={(v) => setWorkstations(v[0] ?? 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Module</Label>
              <label className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <Checkbox checked disabled /> OPSQAI Core (AI pe proceduri, FAQ, Academy) — inclus
              </label>
              {WORKSPACES.map((w) => (
                <label key={w.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                  <Checkbox
                    checked={products.includes(w.key)}
                    onCheckedChange={() => setProducts((p) => (p.includes(w.key) ? p.filter((x) => x !== w.key) : [...p, w.key]))}
                  />
                  {w.label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nivel licență</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valabilitate (luni)</Label>
                <Input type="number" min={1} max={60} className="mt-1" value={months} onChange={(e) => setMonths(Number(e.target.value) || 12)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Înapoi</Button>
            <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
              <Rocket className="mr-1.5 h-4 w-4" />{runMut.isPending ? "Se creează clientul, licența și kitul…" : "Creează client, licență și kit"}
            </Button>
          </div>
        </Panel>
      )}

      {step === 3 && result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Gata — totul este creat">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Clientul <b>{name}</b> și contul administratorului</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Licență semnată: {1 + workstations} locuri, {months} luni</li>
              <li className="flex items-center gap-2">
                {result.url ? <Check className="h-4 w-4 text-success" /> : <span className="h-4 w-4 rounded-full bg-warning" />}
                {result.url ? "Kitul de instalare Windows (link securizat, temporar)" : `Kitul nu s-a putut genera acum: ${result.packageError ?? "încearcă din fișa clientului"}`}
              </li>
            </ul>
            <p className="mt-3 font-mono text-xs text-muted-foreground">ID instalare: {result.installId}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.url && (
                <Button asChild variant="outline"><a href={result.url} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-4 w-4" />Descarcă kitul</a></Button>
              )}
              <Button asChild variant="outline"><Link to="/management/customers">Vezi clienții</Link></Button>
              <Button variant="ghost" onClick={() => { setStep(1); setResult(null); setName(""); setCui(""); setEmail(""); setPassword(generatePassword()); }}>Client nou</Button>
            </div>
          </Panel>
          <Panel title="Mesaj gata de trimis directorului">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-3 text-sm text-foreground">{message}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild><a href={whatsappUrl(phone, message)} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp</a></Button>
              <Button asChild variant="outline"><a href={mailtoUrl(email, `Bun venit la OPSQAI — instalare ${name}`, message)}><Mail className="mr-1.5 h-4 w-4" />Email</a></Button>
              <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(message); toast.success("Copiat"); }}><Copy className="mr-1.5 h-4 w-4" />Copiază</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Mesajul conține parola temporară — trimite-l doar persoanei autorizate.</p>
          </Panel>
        </div>
      )}
    </ModulePage>
  );
}

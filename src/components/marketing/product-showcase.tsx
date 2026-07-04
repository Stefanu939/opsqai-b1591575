import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Users, BookOpen, MessageSquare, Sparkles, Languages,
  GraduationCap, FileText, ShieldCheck, History, LayoutGrid,
  Play, Pause, Maximize2, Volume2, VolumeX, CheckCircle2, Upload,
  FileCheck2, Search, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Narration script + captions per scene, EN + DE.                            */
/*  Timing driven by the timeline (see SCENES). Voice-over is per-scene:      */
/*  we request one MP3 per scene per language and play on scene enter.         */
/* -------------------------------------------------------------------------- */

type Lang = "en" | "de";

interface SceneDef {
  id: string;
  seconds: number;                     // scene duration
  captionEn: string;
  captionDe: string;
  narrationEn: string;                 // slightly longer than caption, natural VO
  narrationDe: string;
  render: (t: number) => React.ReactNode;  // t = 0..1 progress within scene
}

/* ---------------- Frame primitives (faithful to app tokens) --------------- */

function AppFrame({ title, sidebar, children }: { title: string; sidebar: { icon: React.ElementType; label: string; active?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border/60 bg-background shadow-2xl grid grid-cols-[220px_1fr]">
      <aside className="bg-muted/40 border-r border-border/60 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 pb-3 mb-2 border-b border-border/60">
          <div className="h-7 w-7 rounded-md bg-primary/15 grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-[13px] font-semibold tracking-tight">OPSQAI</div>
        </div>
        {sidebar.map((s) => (
          <div key={s.label} className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px]",
            s.active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground",
          )}>
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </div>
        ))}
      </aside>
      <div className="flex flex-col min-h-0">
        <header className="h-11 border-b border-border/60 flex items-center px-5 text-[12px] font-medium text-muted-foreground">
          {title}
        </header>
        <div className="flex-1 min-h-0 overflow-hidden p-5">{children}</div>
      </div>
    </div>
  );
}

const NAV_PLATFORM = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: Building2, label: "Companies", active: true },
  { icon: Users, label: "Users" },
  { icon: ShieldCheck, label: "Roles" },
  { icon: History, label: "Audit" },
];
const NAV_WORKSPACE = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: MessageSquare, label: "AI Assistant" },
  { icon: BookOpen, label: "Knowledge" },
  { icon: FileText, label: "FAQ" },
  { icon: GraduationCap, label: "Academy" },
  { icon: ShieldCheck, label: "Governance" },
  { icon: History, label: "Audit" },
];

/* ------------------------------ Scenes ----------------------------------- */

// 1. Create company
function SceneCompany(t: number) {
  const created = t > 0.55;
  return (
    <AppFrame title="Platform · Companies" sidebar={NAV_PLATFORM.map(s => ({ ...s, active: s.label === "Companies" }))}>
      <div className="grid grid-cols-[1fr_1fr] gap-6 h-full">
        <div className="rounded-xl border border-border/60 p-5 bg-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">New tenant</div>
          <div className="mt-1 text-lg font-semibold">Create company</div>
          <div className="mt-4 space-y-3 text-[12px]">
            {[
              ["Company name", "ACME Logistics"],
              ["Workspace slug", "acme-logistics"],
              ["Primary language", "English"],
              ["Region", "EU · Frankfurt"],
            ].map(([k, v], i) => (
              <div key={k} className="space-y-1">
                <div className="text-muted-foreground">{k}</div>
                <div className={cn(
                  "h-8 rounded-md border border-border/60 bg-background px-3 flex items-center overflow-hidden",
                  t > 0.1 + i * 0.08 ? "text-foreground" : "text-transparent",
                )}>{v}</div>
              </div>
            ))}
            <div className={cn(
              "mt-4 h-9 rounded-md grid place-items-center text-[12px] font-medium transition-all",
              t > 0.5 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>Create workspace</div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 p-5 bg-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Tenants</div>
          <div className="mt-3 space-y-2">
            {[
              { name: "NordLog GmbH", users: 42 },
              { name: "Heinrich Freight", users: 18 },
              created && { name: "ACME Logistics", users: 1, fresh: true },
            ].filter(Boolean).map((c: any) => (
              <div key={c.name} className={cn(
                "flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-[12px] transition-all",
                c.fresh && "ring-2 ring-primary/40 bg-primary/5 animate-in fade-in slide-in-from-bottom-2",
              )}>
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted-foreground text-[11px]">{c.users} user{c.users !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                {c.fresh && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// 2. Users & roles
function SceneUsers(t: number) {
  const users = [
    { name: "Anna Weber", email: "anna@acme.eu", role: "Admin" },
    { name: "Marco Rossi", email: "marco@acme.eu", role: "Manager" },
    { name: "Petra Klein", email: "petra@acme.eu", role: "Team Leader" },
    { name: "Jonas Schmidt", email: "jonas@acme.eu", role: "Employee" },
  ];
  return (
    <AppFrame title="Admin · Users" sidebar={[
      { icon: LayoutGrid, label: "Dashboard" },
      { icon: Users, label: "Users", active: true },
      { icon: ShieldCheck, label: "Roles" },
      { icon: Building2, label: "Companies" },
      { icon: History, label: "Audit" },
    ]}>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_140px_90px] px-4 py-2.5 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div>Name</div><div>Email</div><div>Role</div><div>Status</div>
        </div>
        {users.map((u, i) => {
          const shown = t > 0.05 + i * 0.15;
          return (
            <div key={u.email} className={cn(
              "grid grid-cols-[1fr_1fr_140px_90px] px-4 py-3 border-b border-border/60 text-[12px] transition-all",
              shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            )}>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] font-medium">
                  {u.name.split(" ").map(n => n[0]).join("")}
                </div>
                {u.name}
              </div>
              <div className="text-muted-foreground">{u.email}</div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
                  {u.role}
                </span>
              </div>
              <div className="text-emerald-600 text-[11px] font-medium">Active</div>
            </div>
          );
        })}
      </div>
    </AppFrame>
  );
}

// 3. Knowledge base
function SceneKnowledge(t: number) {
  const docs = [
    { code: "SOP-INB-01", title: "Warehouse Receiving SOP" },
    { code: "SOP-OUT-02", title: "Returns Procedure" },
    { code: "SOP-SAFE-01", title: "Forklift Safety Manual" },
    { code: "SOP-EMR-01", title: "Emergency Response Process" },
    { code: "QMS-01",     title: "Quality Manual" },
  ];
  return (
    <AppFrame title="Knowledge Base" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "Knowledge" }))}>
      <div className="grid grid-cols-[1fr_240px] gap-4 h-full">
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
            <div className="text-[12px] font-medium">Documents</div>
            <div className="text-[11px] text-muted-foreground">{docs.length} indexed</div>
          </div>
          {docs.map((d, i) => {
            const step = Math.max(0, Math.min(1, (t - i * 0.12) * 3));
            const status = step < 0.4 ? "Processing" : step < 0.8 ? "Indexing" : "Ready";
            const color = status === "Ready" ? "text-emerald-600 bg-emerald-500/10" : status === "Indexing" ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground bg-muted";
            return (
              <div key={d.code} className="grid grid-cols-[24px_120px_1fr_100px] items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0 text-[12px]">
                <FileCheck2 className="h-4 w-4 text-primary/70" />
                <div className="font-mono text-[11px] text-muted-foreground">{d.code}</div>
                <div>{d.title}</div>
                <span className={cn("justify-self-end px-2 py-0.5 rounded-md text-[11px] font-medium", color)}>{status}</span>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Upload</div>
          <div className="border-2 border-dashed border-border/60 rounded-lg p-4 text-center">
            <Upload className="h-5 w-5 mx-auto text-primary" />
            <div className="mt-2 text-[11px] text-muted-foreground">PDF · DOCX · TXT</div>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Semantic indexing with citations. Chunked by section, embedded per tenant.
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// 4. FAQ
function SceneFAQ(t: number) {
  const faqs = [
    { q: "What is the maximum receiving time for a truck?", a: "Receiving must be completed within 90 minutes of dock assignment." },
    { q: "Where do damaged goods go?", a: "To the QC quarantine area — never to standard putaway." },
    { q: "When is hearing protection mandatory?", a: "In every zone marked above 80 dB." },
    { q: "Who signs off on outbound loads?", a: "The loader signs the loading sheet; the driver signs the CMR." },
  ];
  return (
    <AppFrame title="FAQ" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "FAQ" }))}>
      <div className="space-y-2">
        {faqs.map((f, i) => {
          const shown = t > 0.05 + i * 0.18;
          return (
            <div key={f.q} className={cn(
              "rounded-xl border border-border/60 bg-card px-4 py-3 transition-all",
              shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            )}>
              <div className="text-[13px] font-medium">{f.q}</div>
              <div className="text-[12px] text-muted-foreground mt-1">{f.a}</div>
            </div>
          );
        })}
      </div>
    </AppFrame>
  );
}

// 5. AI Assistant
function SceneAssistant(t: number, lang: Lang) {
  const question = lang === "de"
    ? "Was ist die maximale Empfangszeit für einen LKW?"
    : "What is the maximum receiving time for a truck?";
  const answer = lang === "de"
    ? "Der Empfang muss innerhalb von 90 Minuten nach Zuweisung der Rampe abgeschlossen sein. Wird die Zeit überschritten, wird der Schichtleiter informiert."
    : "Receiving must be completed within 90 minutes of dock assignment. If the time is exceeded, the shift team leader is notified.";
  const answerShown = t > 0.35;
  const chars = answerShown ? Math.floor(((t - 0.35) / 0.5) * answer.length) : 0;
  return (
    <AppFrame title="AI Assistant" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "AI Assistant" }))}>
      <div className="grid grid-cols-[1fr_260px] gap-4 h-full">
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-[13px]">
              {question}
            </div>
          </div>
          {answerShown && (
            <div className="flex gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/15 grid place-items-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border/60 bg-card px-4 py-2.5 text-[13px] leading-relaxed">
                {answer.slice(0, chars)}
                {chars < answer.length && <span className="inline-block w-1.5 h-4 bg-primary/70 align-middle ml-0.5 animate-pulse" />}
                {chars >= answer.length && (
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    {lang === "de" ? "Quellen:" : "Sources:"}{" "}
                    <span className="font-mono text-primary">SOP-INB-01</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-auto rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="text-[12px] text-muted-foreground">
              {lang === "de" ? "Frag OPSQAI etwas…" : "Ask OPSQAI anything…"}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Source</div>
          <div className="mt-2 font-mono text-[11px] text-primary">SOP-INB-01</div>
          <div className="text-[12px] font-medium">Warehouse Receiving SOP</div>
          <div className="mt-3 text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-2">
            "Receiving must be completed within 90 minutes of dock assignment. If receiving exceeds 60 minutes, the team leader must be informed."
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Confidence</span>
            <span className="text-emerald-600 font-medium">High</span>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// 6. Multi-language cycle
const MULTI_LANGS: { code: string; label: string; q: string; a: string; src: string }[] = [
  { code: "en", label: "English",  q: "What is the maximum receiving time?", a: "Receiving must be completed within 90 minutes of dock assignment.", src: "Sources:" },
  { code: "de", label: "Deutsch",  q: "Was ist die maximale Empfangszeit?", a: "Der Empfang muss innerhalb von 90 Minuten nach Zuweisung der Rampe abgeschlossen sein.", src: "Quellen:" },
  { code: "ro", label: "Română",   q: "Care este timpul maxim de recepție?", a: "Recepția trebuie finalizată în 90 de minute de la alocarea rampei.", src: "Surse:" },
  { code: "fr", label: "Français", q: "Quel est le temps de réception maximum ?", a: "La réception doit être terminée dans les 90 minutes suivant l'affectation du quai.", src: "Sources :" },
  { code: "es", label: "Español",  q: "¿Cuál es el tiempo máximo de recepción?", a: "La recepción debe completarse en 90 minutos tras la asignación del muelle.", src: "Fuentes:" },
  { code: "pl", label: "Polski",   q: "Jaki jest maksymalny czas przyjęcia?", a: "Przyjęcie musi zakończyć się w ciągu 90 minut od przydzielenia rampy.", src: "Źródła:" },
  { code: "it", label: "Italiano", q: "Qual è il tempo massimo di ricezione?", a: "La ricezione deve concludersi entro 90 minuti dall'assegnazione della banchina.", src: "Fonti:" },
  { code: "sv", label: "Svenska",  q: "Vad är den maximala mottagningstiden?", a: "Mottagningen måste slutföras inom 90 minuter efter kajtilldelning.", src: "Källor:" },
  { code: "ja", label: "日本語",    q: "受入時間の上限は？", a: "受け入れはドック割り当てから 90 分以内に完了する必要があります。", src: "出典:" },
  { code: "ko", label: "한국어",    q: "최대 입고 시간은?", a: "입고는 도크 배정 후 90분 이내에 완료해야 합니다.", src: "출처:" },
  { code: "zh", label: "中文",      q: "最长收货时间是多少？", a: "收货必须在指派月台后 90 分钟内完成。", src: "来源:" },
  { code: "ar", label: "العربية",   q: "ما الحد الأقصى لوقت الاستلام؟", a: "يجب إتمام الاستلام خلال 90 دقيقة من تخصيص الرصيف.", src: "المصادر:" },
];
function SceneMultilang(t: number) {
  const idx = Math.min(MULTI_LANGS.length - 1, Math.floor(t * MULTI_LANGS.length));
  const l = MULTI_LANGS[idx];
  const rtl = l.code === "ar";
  return (
    <AppFrame title="AI Assistant" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "AI Assistant" }))}>
      <div className="grid grid-cols-[1fr_260px] gap-4 h-full" dir={rtl ? "rtl" : "ltr"}>
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-[13px] transition-all">
              {l.q}
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/15 grid place-items-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border/60 bg-card px-4 py-2.5 text-[13px] leading-relaxed transition-all">
              {l.a}
              <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                {l.src} <span className="font-mono text-primary">SOP-INB-01</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Language</div>
          <div className="text-[15px] font-semibold flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" /> {l.label}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            One knowledge base. Same citations. The interface, sources and answers adapt to every language your teams speak.
          </div>
          <div className="mt-auto flex flex-wrap gap-1">
            {MULTI_LANGS.map((x, i) => (
              <span key={x.code} className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors",
                i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>{x.code}</span>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// 7. Academy
function SceneAcademy(t: number) {
  const progress = Math.min(1, t * 1.2);
  return (
    <AppFrame title="Academy · Warehouse Onboarding" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "Academy" }))}>
      <div className="grid grid-cols-[1fr_260px] gap-4 h-full">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Lesson 3 of 7</div>
          <div className="mt-1 text-lg font-semibold">Forklift pre-shift check</div>
          <div className="mt-4 aspect-[16/8] rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-border/60 grid place-items-center">
            <GraduationCap className="h-10 w-10 text-primary/60" />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Progress</span><span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Quiz</div>
          {["Brakes tested", "Horn works", "Forks aligned"].map((q, i) => (
            <div key={q} className={cn(
              "flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-[12px] transition-all",
              t > 0.3 + i * 0.15 && "bg-emerald-500/5 border-emerald-500/30",
            )}>
              <CheckCircle2 className={cn("h-3.5 w-3.5", t > 0.3 + i * 0.15 ? "text-emerald-600" : "text-muted-foreground")} />
              {q}
            </div>
          ))}
          {t > 0.85 && (
            <div className="mt-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-[11px] text-primary font-medium">
              Certificate issued
            </div>
          )}
        </div>
      </div>
    </AppFrame>
  );
}

// 8. Enterprise documents (SOP generator)
function SceneEnterpriseDocs(t: number) {
  const gen = Math.min(1, t * 1.4);
  const lines = [
    "1. Purpose",
    "2. Scope",
    "3. Responsibilities",
    "4. Procedure",
    "5. Escalation",
    "6. Records",
  ];
  return (
    <AppFrame title="Enterprise Documents · SOP Generator" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "Governance" }))}>
      <div className="grid grid-cols-[240px_1fr] gap-4 h-full">
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Template</div>
          <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-[12px] font-medium">Standard Operating Procedure</div>
          <div className="rounded-md border border-border/60 px-3 py-2 text-[12px] text-muted-foreground">Compliance Report</div>
          <div className="rounded-md border border-border/60 px-3 py-2 text-[12px] text-muted-foreground">Training Documentation</div>
          <div className="mt-auto text-[11px] text-muted-foreground leading-relaxed">
            Grounded in your own knowledge base — never generic.
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5 overflow-hidden">
          <div className="text-[11px] font-mono text-muted-foreground">SOP-INB-01 · draft v0.1</div>
          <div className="mt-1 text-lg font-semibold">Warehouse Inbound Receiving</div>
          <div className="mt-4 space-y-2 text-[12px]">
            {lines.map((l, i) => {
              const shown = gen > (i + 1) / (lines.length + 1);
              return (
                <div key={l} className={cn("flex items-center gap-2 transition-all", shown ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2")}>
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  <span>{l}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// 9. Governance
function SceneGovernance(t: number) {
  return (
    <AppFrame title="Governance" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "Governance" }))}>
      <div className="grid grid-cols-2 gap-4 h-full">
        {[
          { icon: ShieldCheck, title: "Roles", body: "Admin · Manager · Team Leader · Employee", metric: "4 roles" },
          { icon: Search,      title: "Knowledge gaps", body: "Unanswered questions tracked and assigned", metric: "3 open" },
          { icon: History,     title: "Versioning", body: "Every SOP has audit-trailed versions", metric: "v3 latest" },
          { icon: MessageSquare, title: "Notifications", body: "Ack requests, gap resolutions, approvals", metric: "12 today" },
        ].map((c, i) => (
          <div key={c.title} className={cn(
            "rounded-xl border border-border/60 bg-card p-4 flex flex-col transition-all",
            t > i * 0.15 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          )}>
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-[13px] font-semibold">{c.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{c.body}</div>
            <div className="mt-auto pt-3 text-[11px] font-mono text-primary">{c.metric}</div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

// 10. Audit
function SceneAudit(t: number) {
  const events = [
    { time: "09:14", who: "Anna W.", what: "asked", target: "receiving time policy" },
    { time: "09:22", who: "Marco R.", what: "published", target: "SOP-INB-01 v3" },
    { time: "09:31", who: "System", what: "resolved gap", target: "damaged goods flow" },
    { time: "09:45", who: "Petra K.", what: "assigned role", target: "Team Leader" },
    { time: "10:02", who: "Jonas S.", what: "acknowledged", target: "SOP-SAFE-01" },
  ];
  return (
    <AppFrame title="Audit Log" sidebar={NAV_WORKSPACE.map(s => ({ ...s, active: s.label === "Audit" }))}>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {events.map((e, i) => (
          <div key={i} className={cn(
            "grid grid-cols-[70px_120px_100px_1fr] items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0 text-[12px] transition-all",
            t > i * 0.15 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2",
          )}>
            <div className="font-mono text-[11px] text-muted-foreground">{e.time}</div>
            <div className="font-medium">{e.who}</div>
            <div className="text-muted-foreground">{e.what}</div>
            <div className="text-primary">{e.target}</div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

// 11. Final platform mosaic
function SceneFinal(t: number) {
  const modules = [
    { icon: BookOpen, label: "Knowledge Base" },
    { icon: Bot, label: "AI Assistant" },
    { icon: MessageSquare, label: "FAQ" },
    { icon: GraduationCap, label: "Academy" },
    { icon: FileText, label: "Enterprise Docs" },
    { icon: ShieldCheck, label: "Governance" },
    { icon: History, label: "Audit" },
    { icon: Users, label: "Users & Roles" },
    { icon: Building2, label: "Workspaces" },
  ];
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium">OPSQAI</div>
      <div className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight max-w-2xl">
        Enterprise AI Platform for Operational Knowledge
      </div>
      <div className="mt-2 text-[13px] text-muted-foreground max-w-lg">
        Transform company knowledge into operational excellence.
      </div>
      <div className="mt-6 grid grid-cols-3 md:grid-cols-9 gap-2 max-w-3xl">
        {modules.map((m, i) => {
          const on = t > i * 0.08;
          return (
            <div key={m.label} className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
              on ? "border-primary/40 bg-primary/5 text-foreground" : "border-border/60 bg-card text-muted-foreground",
            )}>
              <m.icon className={cn("h-4 w-4", on ? "text-primary" : "text-muted-foreground")} />
              <div className="text-[10px] font-medium text-center leading-tight">{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Timeline --------------------------------- */

const SCENES: SceneDef[] = [
  { id: "company",   seconds: 9,
    captionEn: "Every customer starts with a secure isolated workspace.",
    captionDe: "Jeder Kunde startet mit einem sicheren, isolierten Workspace.",
    narrationEn: "Every OPSQAI customer starts with their own isolated workspace — secure, branded, and completely separated from every other tenant.",
    narrationDe: "Jeder OPSQAI-Kunde beginnt mit seinem eigenen isolierten Workspace — sicher, individuell gebrandet und vollständig von anderen Mandanten getrennt.",
    render: SceneCompany },
  { id: "users",     seconds: 8,
    captionEn: "Role-based permissions keep every department organized.",
    captionDe: "Rollenbasierte Berechtigungen halten jede Abteilung organisiert.",
    narrationEn: "Enterprise role-based access — Admin, Manager, Team Leader, Employee — keeps every department aligned with what they need to see.",
    narrationDe: "Rollenbasierte Enterprise-Berechtigungen — Admin, Manager, Teamleiter, Mitarbeiter — halten jede Abteilung auf das ausgerichtet, was sie sehen muss.",
    render: SceneUsers },
  { id: "kb",        seconds: 10,
    captionEn: "OPSQAI transforms documentation into searchable knowledge.",
    captionDe: "OPSQAI verwandelt Dokumentation in durchsuchbares Wissen.",
    narrationEn: "SOPs, manuals and quality documents are uploaded, indexed and made semantically searchable — grounded in your company's real procedures.",
    narrationDe: "SOPs, Handbücher und Qualitätsdokumente werden hochgeladen, indexiert und semantisch durchsuchbar gemacht — verankert in den echten Prozessen Ihres Unternehmens.",
    render: SceneKnowledge },
  { id: "faq",       seconds: 8,
    captionEn: "Centralize recurring operational knowledge.",
    captionDe: "Zentralisieren Sie wiederkehrendes operatives Wissen.",
    narrationEn: "Frequent operational questions are captured as curated FAQs, so teams never search twice for the same answer.",
    narrationDe: "Häufige operative Fragen werden als kuratierte FAQs erfasst, damit Teams nie zweimal nach derselben Antwort suchen müssen.",
    render: SceneFAQ },
  { id: "assistant", seconds: 11,
    captionEn: "Every answer is grounded in your company's own knowledge.",
    captionDe: "Jede Antwort ist in Ihrem eigenen Unternehmenswissen verankert.",
    narrationEn: "Ask a question. OPSQAI answers only from your knowledge base — every response is source-backed, with the exact document, section and confidence.",
    narrationDe: "Stellen Sie eine Frage. OPSQAI antwortet ausschließlich aus Ihrer Wissensdatenbank — mit Quellenangabe, exaktem Dokument, Abschnitt und Konfidenz.",
    render: (t) => SceneAssistant(t, "en") },
  { id: "multi",     seconds: 14,
    captionEn: "One knowledge base. Virtually every language.",
    captionDe: "Eine Wissensdatenbank. Praktisch jede Sprache.",
    narrationEn: "The same question. The same sources. The same answer — delivered in virtually every language your workforce speaks. Nothing else changes.",
    narrationDe: "Dieselbe Frage. Dieselben Quellen. Dieselbe Antwort — in praktisch jeder Sprache, die Ihre Belegschaft spricht. Nichts anderes ändert sich.",
    render: SceneMultilang },
  { id: "academy",   seconds: 9,
    captionEn: "Train employees directly inside OPSQAI.",
    captionDe: "Schulen Sie Mitarbeitende direkt in OPSQAI.",
    narrationEn: "Learning paths, lessons, quizzes and certificates — turn your SOPs into structured onboarding without leaving the platform.",
    narrationDe: "Lernpfade, Lektionen, Quizze und Zertifikate — machen Sie aus Ihren SOPs strukturiertes Onboarding, ohne die Plattform zu verlassen.",
    render: SceneAcademy },
  { id: "docs",      seconds: 9,
    captionEn: "Create professional operational documentation in minutes.",
    captionDe: "Erstellen Sie professionelle Betriebsdokumentation in Minuten.",
    narrationEn: "Generate SOPs, compliance reports and training material — drafted from your existing knowledge, ready to review and publish.",
    narrationDe: "Generieren Sie SOPs, Compliance-Berichte und Schulungsunterlagen — aus Ihrem vorhandenen Wissen entworfen, bereit zur Freigabe.",
    render: SceneEnterpriseDocs },
  { id: "gov",       seconds: 8,
    captionEn: "Enterprise governance built into the platform.",
    captionDe: "Enterprise-Governance ist in die Plattform integriert.",
    narrationEn: "Roles, versioning, knowledge gaps and notifications — the governance layer enterprises expect, built in from day one.",
    narrationDe: "Rollen, Versionierung, Wissenslücken und Benachrichtigungen — die Governance-Ebene, die Enterprises erwarten, von Anfang an integriert.",
    render: SceneGovernance },
  { id: "audit",     seconds: 8,
    captionEn: "Every action is fully traceable.",
    captionDe: "Jede Aktion ist vollständig nachvollziehbar.",
    narrationEn: "Every question, every document change, every role update — recorded in a per-tenant audit log your compliance team can rely on.",
    narrationDe: "Jede Frage, jede Dokumentänderung, jede Rollenaktualisierung — protokolliert in einem mandantenspezifischen Audit-Log, auf das sich Ihr Compliance-Team verlassen kann.",
    render: SceneAudit },
  { id: "final",     seconds: 9,
    captionEn: "OPSQAI — Enterprise AI Platform for Operational Knowledge.",
    captionDe: "OPSQAI — Enterprise-KI-Plattform für operatives Wissen.",
    narrationEn: "OPSQAI. Enterprise AI platform for operational knowledge. Transform company knowledge into operational excellence.",
    narrationDe: "OPSQAI. Enterprise-KI-Plattform für operatives Wissen. Verwandeln Sie Unternehmenswissen in operative Exzellenz.",
    render: SceneFinal },
];

const TOTAL_SECONDS = SCENES.reduce((s, x) => s + x.seconds, 0);

/* ------------------------------ Player ---------------------------------- */

export function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const [time, setTime] = useState(0);            // seconds
  const [playing, setPlaying] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  const [muted, setMuted] = useState(true);
  const [hover, setHover] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioCache = useRef<Map<string, string>>(new Map());
  const lastSceneRef = useRef<string>("");

  // Compute scene from time
  const { sceneIdx, sceneProgress, scene } = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < SCENES.length; i++) {
      if (time < acc + SCENES[i].seconds) {
        return { sceneIdx: i, sceneProgress: (time - acc) / SCENES[i].seconds, scene: SCENES[i] };
      }
      acc += SCENES[i].seconds;
    }
    return { sceneIdx: SCENES.length - 1, sceneProgress: 1, scene: SCENES[SCENES.length - 1] };
  }, [time]);

  // Timeline tick (pauses on hover if playing)
  useEffect(() => {
    const paused = !playing || hover;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) {
        setTime((t) => {
          const next = t + dt;
          return next >= TOTAL_SECONDS ? 0 : next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, hover]);

  // Load TTS for current scene on scene change (when not muted)
  const loadAndPlayScene = useCallback(async (sceneId: string, lng: Lang) => {
    const s = SCENES.find(x => x.id === sceneId);
    if (!s) return;
    const text = lng === "de" ? s.narrationDe : s.narrationEn;
    const key = `${lng}:${sceneId}`;
    let url = audioCache.current.get(key);
    if (!url) {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: lng }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        audioCache.current.set(key, url);
      } catch { return; }
    }
    const a = audioRef.current;
    if (!a) return;
    a.src = url;
    a.currentTime = 0;
    try { await a.play(); setAudioReady(true); } catch { /* autoplay blocked until interaction */ }
  }, []);

  useEffect(() => {
    if (muted) {
      if (audioRef.current) audioRef.current.pause();
      lastSceneRef.current = "";
      return;
    }
    if (lastSceneRef.current !== scene.id) {
      lastSceneRef.current = scene.id;
      loadAndPlayScene(scene.id, lang);
    }
  }, [scene.id, lang, muted, loadAndPlayScene]);

  // Change lang → clear scene-audio memoization so it fetches new lang
  useEffect(() => { lastSceneRef.current = ""; }, [lang]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const caption = lang === "de" ? scene.captionDe : scene.captionEn;
  const progressPct = (time / TOTAL_SECONDS) * 100;

  return (
    <section className="relative border-y border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Product walkthrough</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">See OPSQAI in action</h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            Follow a complete operational workflow — from company creation to enterprise governance — in under two minutes.
          </p>
        </div>

        <div
          ref={containerRef}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="group relative mx-auto max-w-6xl aspect-[16/9] rounded-3xl overflow-hidden border border-border/60 bg-card shadow-[0_30px_80px_-30px_rgba(15,23,41,0.35)]"
        >
          {/* Scene surface */}
          <div className="absolute inset-0 p-6 md:p-10">
            <div key={scene.id} className="w-full h-full animate-in fade-in duration-500">
              {scene.render(sceneProgress)}
            </div>
          </div>

          {/* Caption */}
          <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6">
            <div key={scene.id + ":" + lang} className="max-w-2xl text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="inline-block rounded-full bg-background/90 backdrop-blur px-4 py-2 text-[13px] md:text-sm font-medium shadow-lg border border-border/60">
                {caption}
              </div>
            </div>
          </div>

          {/* Progress bar (always visible, thin) */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
            <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Chapter ticks */}
          <div className="absolute inset-x-0 bottom-1 flex pointer-events-none">
            {SCENES.map((s, i) => {
              const w = (s.seconds / TOTAL_SECONDS) * 100;
              return <div key={s.id} style={{ width: `${w}%` }} className={cn("h-2", i > 0 && "border-l border-background/60")} />;
            })}
          </div>

          {/* Controls (hidden until hover) */}
          <div className={cn(
            "absolute top-3 right-3 flex items-center gap-1.5 transition-opacity",
            hover ? "opacity-100" : "opacity-0",
          )}>
            <div className="rounded-full bg-background/90 backdrop-blur border border-border/60 shadow flex items-center overflow-hidden text-[11px] font-medium">
              <button onClick={() => setLang("en")} className={cn("px-2.5 py-1", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>EN</button>
              <button onClick={() => setLang("de")} className={cn("px-2.5 py-1", lang === "de" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>DE</button>
            </div>
            <IconBtn onClick={() => setMuted(m => !m)} label={muted ? "Unmute narration" : "Mute narration"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconBtn>
            <IconBtn onClick={() => setPlaying(p => !p)} label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </IconBtn>
            <IconBtn onClick={toggleFullscreen} label="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </IconBtn>
          </div>

          {/* Scene counter */}
          <div className={cn(
            "absolute top-3 left-3 rounded-full bg-background/90 backdrop-blur border border-border/60 shadow px-3 py-1 text-[11px] font-mono text-muted-foreground transition-opacity",
            hover ? "opacity-100" : "opacity-0",
          )}>
            {String(sceneIdx + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")} · {scene.id}
          </div>

          <audio ref={audioRef} preload="auto" onEnded={() => setAudioReady(false)} />
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Autoplay silent · Loops continuously · Hover to reveal controls · Toggle EN / DE narration
        </p>
      </div>
    </section>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="h-8 w-8 grid place-items-center rounded-full bg-background/90 backdrop-blur border border-border/60 shadow text-foreground hover:bg-background transition-colors"
    >
      {children}
    </button>
  );
}

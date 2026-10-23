import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  Users,
  Truck,
  ShieldCheck,
  Server,
  FileSearch,
  KeyRound,
  ClipboardCheck,
  ArrowUp,
  ArrowRight,
  Check,
  X,
  LayoutDashboard,
  CalendarDays,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { KaiFace } from "@/components/kai/kai-face";

type L = "ro" | "en" | "de";
const pick = <T,>(lang: string, v: Record<L, T>): T => v[(lang as L) in v ? (lang as L) : "ro"];

/* ---------- Scroll reveal ---------- */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-all duration-700 ease-out motion-reduce:transition-none", shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
    >
      {children}
    </div>
  );
}

/* ---------- Hero with interactive product preview ---------- */
const TABS = [
  { id: "kai", icon: MessageSquare },
  { id: "hr", icon: Users },
  { id: "fleet", icon: Truck },
  { id: "sec", icon: ShieldCheck },
] as const;

export function HeroV2() {
  const { lang } = useT();
  const t = pick(lang, {
    ro: {
      eyebrow: "AI on-premise pentru companii",
      title: "AI-ul firmei tale, pe serverul firmei tale.",
      sub: "KAI și spațiile de lucru OPSQAI rulează local. Datele nu pleacă în cloud, iar fiecare acțiune importantă e aprobată de un om.",
      cta: "Discută cu KAI",
      pilot: "Pilot gratuit 30 zile",
      note: "Fără card. Fără cont pentru primele întrebări.",
      tabs: ["KAI", "HR", "Flotă", "Securitate"],
    },
    en: {
      eyebrow: "On-premise AI for companies",
      title: "Your company's AI, on your company's server.",
      sub: "KAI and the OPSQAI workspaces run locally. Data never leaves for the cloud, and every important action is approved by a human.",
      cta: "Talk to KAI",
      pilot: "Free 30-day pilot",
      note: "No card. No account for the first questions.",
      tabs: ["KAI", "HR", "Fleet", "Security"],
    },
    de: {
      eyebrow: "On-Premise-KI für Unternehmen",
      title: "Die KI Ihres Unternehmens, auf Ihrem Server.",
      sub: "KAI und die OPSQAI-Arbeitsbereiche laufen lokal. Daten verlassen nie Ihr Haus, und jede wichtige Aktion bestätigt ein Mensch.",
      cta: "Mit KAI sprechen",
      pilot: "Kostenloser 30-Tage-Pilot",
      note: "Keine Karte. Kein Konto für die ersten Fragen.",
      tabs: ["KAI", "HR", "Flotte", "Sicherheit"],
    },
  });
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("kai");

  // Gentle auto-rotation until the visitor clicks a tab.
  const touched = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (touched.current) return;
      setTab((cur) => TABS[(TABS.findIndex((x) => x.id === cur) + 1) % TABS.length].id);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-14 md:px-10 md:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t.eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl md:text-6xl">{t.title}</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{t.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/kai" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              <KaiFace size={22} /> {t.cta}
            </Link>
            <Link to="/pilot" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-card">
              {t.pilot} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t.note}</p>
        </Reveal>

        <Reveal delay={150}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="ml-3 text-xs text-muted-foreground">OPSQAI · server local</span>
            </div>
            <div className="flex gap-1 border-b border-border p-2" role="tablist">
              {TABS.map((x, i) => (
                <button
                  key={x.id}
                  role="tab"
                  aria-selected={tab === x.id}
                  onClick={() => {
                    touched.current = true;
                    setTab(x.id);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition sm:text-sm",
                    tab === x.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <x.icon className="h-4 w-4" /> {t.tabs[i]}
                </button>
              ))}
            </div>
            <div className="grid min-h-[300px] grid-cols-[48px_1fr]">
              <div className="flex flex-col items-center gap-4 border-r border-border py-4 text-muted-foreground">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <MessageSquare className="h-4 w-4" />
                <CalendarDays className="h-4 w-4" />
                <FileText className="h-4 w-4" />
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div key={tab} className="animate-in fade-in slide-in-from-bottom-2 p-5 duration-500">
                <PreviewBody tab={tab} lang={lang} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({ label, value, tone = "muted" }: { label: string; value: string; tone?: "ok" | "warn" | "muted" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm">
      <span className="text-foreground">{label}</span>
      <span className={cn("text-xs font-medium", tone === "ok" ? "text-primary" : tone === "warn" ? "text-destructive" : "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function PreviewBody({ tab, lang }: { tab: string; lang: string }) {
  const c = pick(lang, {
    ro: {
      q: "Ce termen de plată avem în contractul cu Transilvania Logistic?",
      a: "Termenul este de 45 de zile de la factură (art. 7.2, pagina 4). Vrei să îți pregătesc un memento pentru scadențe?",
      src: "Sursă: Contract_TL_2026.pdf",
      hr: ["Cerere concediu · Andrei M.", "Aprobat", "Pontaj săptămâna 43", "Complet", "Act adițional · Ioana P.", "De semnat"],
      fleet: ["B-21-OPS · București → Cluj", "În cursă", "CMR 2026-0412", "Semnat", "ITP CJ-08-XYZ", "Expiră în 9 zile"],
      sec: ["Trafic extern către AI", "0 cereri", "Date stocate", "Server local", "Backup criptat", "Azi 02:00", "Jurnal de audit", "Activ"],
    },
    en: {
      q: "What payment term do we have with Transilvania Logistic?",
      a: "The term is 45 days from invoice (art. 7.2, page 4). Shall I set a due-date reminder?",
      src: "Source: Contract_TL_2026.pdf",
      hr: ["Leave request · Andrei M.", "Approved", "Timesheet week 43", "Complete", "Contract addendum · Ioana P.", "To sign"],
      fleet: ["B-21-OPS · Bucharest → Cluj", "On trip", "CMR 2026-0412", "Signed", "Inspection CJ-08-XYZ", "Due in 9 days"],
      sec: ["External AI traffic", "0 requests", "Data stored", "Local server", "Encrypted backup", "Today 02:00", "Audit log", "Active"],
    },
    de: {
      q: "Welche Zahlungsfrist haben wir mit Transilvania Logistic?",
      a: "Die Frist beträgt 45 Tage ab Rechnung (Art. 7.2, Seite 4). Soll ich eine Erinnerung anlegen?",
      src: "Quelle: Contract_TL_2026.pdf",
      hr: ["Urlaubsantrag · Andrei M.", "Genehmigt", "Zeiterfassung KW 43", "Vollständig", "Nachtrag · Ioana P.", "Zu unterschreiben"],
      fleet: ["B-21-OPS · Bukarest → Cluj", "Unterwegs", "CMR 2026-0412", "Signiert", "TÜV CJ-08-XYZ", "In 9 Tagen fällig"],
      sec: ["Externer KI-Verkehr", "0 Anfragen", "Datenspeicher", "Lokaler Server", "Verschl. Backup", "Heute 02:00", "Audit-Log", "Aktiv"],
    },
  });
  if (tab === "kai")
    return (
      <div className="space-y-3">
        <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{c.q}</div>
        <div className="flex gap-2">
          <KaiFace size={28} />
          <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-border bg-background/40 px-3 py-2 text-sm text-foreground">
            {c.a}
            <p className="mt-2 text-[11px] text-muted-foreground">{c.src}</p>
          </div>
        </div>
      </div>
    );
  const rows = tab === "hr" ? c.hr : tab === "fleet" ? c.fleet : c.sec;
  const pairs: [string, string][] = [];
  for (let i = 0; i < rows.length; i += 2) pairs.push([rows[i], rows[i + 1]]);
  return (
    <div className="space-y-2">
      {pairs.map(([a, b], i) => (
        <Row key={a} label={a} value={b} tone={tab === "sec" || i < 2 ? "ok" : "warn"} />
      ))}
    </div>
  );
}

/* ---------- Sticky scroll walkthrough ---------- */
const STEP_ICONS = [Server, FileSearch, KeyRound, ClipboardCheck];

export function ScrollWalkthrough() {
  const { lang } = useT();
  const t = pick(lang, {
    ro: {
      eyebrow: "Cum funcționează",
      title: "De la instalare la audit, în patru pași.",
      steps: [
        ["Instalezi pe serverul tău", "Un singur installer pentru Windows. Baza de date și modelul AI rulează local, fără servicii cloud externe."],
        ["KAI învață procedurile firmei", "Încarci documente, contracte și proceduri. KAI răspunde cu sursa exactă, în română, engleză sau germană."],
        ["Fiecare vede doar ce are voie", "Roluri pe departamente. KAI propune, omul confirmă — nicio acțiune importantă fără aprobare."],
        ["Ești pregătit pentru control", "Jurnal de audit, backup criptat și rapoarte locale care susțin cerințele GDPR, NIS2 și DORA."],
      ],
    },
    en: {
      eyebrow: "How it works",
      title: "From install to audit, in four steps.",
      steps: [
        ["Install on your own server", "One Windows installer. Database and AI model run locally, no external cloud services."],
        ["KAI learns your procedures", "Upload documents, contracts and procedures. KAI answers with the exact source, in RO, EN or DE."],
        ["Everyone sees only what they may", "Roles per department. KAI proposes, a human confirms — no important action without approval."],
        ["Ready for inspection", "Audit log, encrypted backup and local reports that support GDPR, NIS2 and DORA requirements."],
      ],
    },
    de: {
      eyebrow: "So funktioniert es",
      title: "Von der Installation bis zum Audit, in vier Schritten.",
      steps: [
        ["Auf Ihrem Server installieren", "Ein Windows-Installer. Datenbank und KI-Modell laufen lokal, ohne externe Cloud."],
        ["KAI lernt Ihre Abläufe", "Dokumente, Verträge und Verfahren hochladen. KAI antwortet mit genauer Quelle, auf RO, EN oder DE."],
        ["Jeder sieht nur, was er darf", "Rollen je Abteilung. KAI schlägt vor, ein Mensch bestätigt."],
        ["Bereit für die Prüfung", "Audit-Log, verschlüsselte Backups und lokale Berichte für DSGVO, NIS2 und DORA."],
      ],
    },
  });
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  const Icon = STEP_ICONS[active];

  return (
    <section id="cum-functioneaza" className="mx-auto w-full max-w-7xl px-5 py-20 md:px-10">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t.eyebrow}</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-foreground md:text-5xl">{t.title}</h2>
      </Reveal>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6 lg:space-y-[30vh] lg:pb-[20vh]">
          {t.steps.map(([h, p], i) => (
            <div
              key={h}
              data-i={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              onClick={() => setActive(i)}
              className={cn(
                "cursor-pointer rounded-xl border p-6 transition-all duration-500",
                active === i ? "border-primary/60 bg-card" : "border-border bg-transparent opacity-60 hover:opacity-100",
              )}
            >
              <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-display text-xl font-semibold text-foreground">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-28 flex aspect-square items-center justify-center rounded-2xl border border-border bg-card">
            <div key={active} className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-6 p-10 text-center duration-500">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/15">
                <Icon className="h-12 w-12 text-primary" strokeWidth={1.4} />
              </div>
              <p className="font-display text-2xl font-semibold text-foreground">{t.steps[active][0]}</p>
              <div className="flex gap-2">
                {t.steps.map((_, i) => (
                  <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-8 bg-primary" : "w-3 bg-border")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- KAI question pills ---------- */
export function KaiPrompts() {
  const { lang } = useT();
  const t = pick(lang, {
    ro: {
      title: "Întreabă-l pe KAI ce ar face pentru firma ta.",
      sub: "Alege o întrebare — o găsești gata scrisă în chat.",
      qs: ["Cum funcționează pilotul gratuit de 30 de zile?", "De ce e mai sigur decât ChatGPT sau Copilot pentru datele firmei?", "Ce calculator sau server îmi trebuie pentru instalare?", "Cum folosește KAI documentele noastre interne?"],
    },
    en: {
      title: "Ask KAI what it would do for your company.",
      sub: "Pick a question — it opens ready-written in the chat.",
      qs: ["How does the free 30-day pilot work?", "Why is it safer than ChatGPT or Copilot for company data?", "What computer or server do I need to install it?", "How does KAI use our internal documents?"],
    },
    de: {
      title: "Fragen Sie KAI, was es für Ihr Unternehmen tun würde.",
      sub: "Wählen Sie eine Frage — sie steht fertig im Chat.",
      qs: ["Wie funktioniert der kostenlose 30-Tage-Pilot?", "Warum ist es sicherer als ChatGPT oder Copilot?", "Welchen Rechner oder Server brauche ich?", "Wie nutzt KAI unsere internen Dokumente?"],
    },
  });
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-20 md:px-10">
      <Reveal>
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
          <div className="flex items-center gap-4">
            <KaiFace size={56} float />
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">{t.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {t.qs.map((q) => (
              <a
                key={q}
                href={`/kai?q=${encodeURIComponent(q)}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3.5 text-sm text-foreground transition hover:border-primary/60 hover:bg-primary/10"
              >
                {q}
                <ArrowRight className="h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Cloud vs on-premise ---------- */
export function CompareTable() {
  const { lang } = useT();
  const t = pick(lang, {
    ro: {
      title: "AI în cloud public vs. OPSQAI pe serverul tău",
      cols: ["", "AI în cloud public", "OPSQAI on-premise"],
      rows: [
        ["Unde stau datele", "Servere externe, adesea în afara UE", "Pe serverul firmei tale"],
        ["Cine controlează modelul", "Furnizorul", "Firma ta"],
        ["Acțiuni fără aprobare", "Posibile", "Niciodată — omul confirmă"],
        ["Funcționează fără internet", "Nu", "Da, pentru lucrul zilnic"],
      ],
    },
    en: {
      title: "Public cloud AI vs. OPSQAI on your server",
      cols: ["", "Public cloud AI", "OPSQAI on-premise"],
      rows: [
        ["Where data lives", "External servers, often outside the EU", "On your company's server"],
        ["Who controls the model", "The vendor", "Your company"],
        ["Actions without approval", "Possible", "Never — a human confirms"],
        ["Works without internet", "No", "Yes, for daily work"],
      ],
    },
    de: {
      title: "Public-Cloud-KI vs. OPSQAI auf Ihrem Server",
      cols: ["", "Public-Cloud-KI", "OPSQAI On-Premise"],
      rows: [
        ["Wo die Daten liegen", "Externe Server, oft außerhalb der EU", "Auf Ihrem Server"],
        ["Wer das Modell kontrolliert", "Der Anbieter", "Ihr Unternehmen"],
        ["Aktionen ohne Freigabe", "Möglich", "Nie — ein Mensch bestätigt"],
        ["Funktioniert offline", "Nein", "Ja, im Tagesgeschäft"],
      ],
    },
  });
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-20 md:px-10">
      <Reveal>
        <h2 className="text-center font-display text-3xl font-semibold text-foreground md:text-4xl">{t.title}</h2>
        <div className="mt-10 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-3 bg-card text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.cols.map((c, i) => (
              <div key={i} className={cn("px-4 py-3", i === 2 && "text-primary")}>{c}</div>
            ))}
          </div>
          {t.rows.map(([a, b, c]) => (
            <div key={a} className="grid grid-cols-3 border-t border-border text-sm">
              <div className="px-4 py-4 font-medium text-foreground">{a}</div>
              <div className="flex items-start gap-2 px-4 py-4 text-muted-foreground"><X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{b}</div>
              <div className="flex items-start gap-2 bg-primary/5 px-4 py-4 text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{c}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Floating back-to-top ---------- */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 800);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <button
      type="button"
      aria-label="Sus"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-all",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { pageHead } from "@/lib/seo";
import {
  STUDY_BENCHMARK_MIN,
  STUDY_COUNTRIES,
  STUDY_COUNTRY_LABELS,
  STUDY_LOCALES,
  STUDY_LOCALE_LABELS,
  STUDY_QUESTIONS,
  studyCopy,
  type StudyLocale,
} from "@/i18n/pages/study";

const STORAGE_KEY = "opsqai.study.locale";

export const Route = createFileRoute("/study")({
  head: () =>
    pageHead({
      title: "European Operations Study 2026 — how companies really find information",
      description:
        "Anonymous 2-minute study in 9 languages: where your procedures live, how long people search, what audits cost. No email required.",
      path: "/study",
      keywords: "operations study 2026, knowledge management survey, audit preparation benchmark, SOP survey",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Study", path: "/study" },
      ],
    }),
  component: StudyPage,
});

interface Benchmark {
  total: number;
  open: boolean;
  byQuestion: Record<string, Record<string, number>>;
}

function detectLocale(): StudyLocale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (STUDY_LOCALES as readonly string[]).includes(stored)) return stored as StudyLocale;
  const nav = window.navigator.language?.slice(0, 2).toLowerCase() ?? "en";
  return (STUDY_LOCALES as readonly string[]).includes(nav) ? (nav as StudyLocale) : "en";
}

function StudyPage() {
  const [locale, setLocale] = useState<StudyLocale>("en");
  const [step, setStep] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [country, setCountry] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [contactDone, setContactDone] = useState(false);

  const t = useMemo(() => studyCopy(locale), [locale]);
  const total = STUDY_QUESTIONS.length;
  const done = responseId !== null;

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const chooseLocale = useCallback((next: StudyLocale) => {
    setLocale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/public/study-submit")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.benchmark) setBenchmark(d.benchmark as Benchmark);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const current = step >= 0 && step < total ? STUDY_QUESTIONS[step]! : null;
  const currentAnswer = current ? answers[current.id] : undefined;

  async function submit() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/public/study-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, country, answers }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "failed");
      setResponseId(data.responseId as string);
      if (data.benchmark) setBenchmark(data.benchmark as Benchmark);
      setStep(total);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSending(false);
    }
  }

  return (
    <OixLayout>
      <section className="relative overflow-hidden border-b border-[var(--oix-gold-line)]">
        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-32 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.serifAccent}>
            {t.headline}
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream-dim)]">{t.intro}</p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.langLabel}
            </span>
            {STUDY_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => chooseLocale(code)}
                aria-pressed={locale === code}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  locale === code
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {STUDY_LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <SectionShell>
        <div className="mx-auto max-w-3xl">
          {step === -1 && (
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <p className="text-sm leading-relaxed text-muted-foreground">{t.why}</p>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <p className="text-xs leading-relaxed text-muted-foreground">{t.privacy}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t.start}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          {current && (
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.progress.replace("{current}", String(step + 1)).replace("{total}", String(total))}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((step + 1) / total) * 100}%` }}
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-foreground md:text-2xl">{t.questions[current.id].label}</h2>

              <div className="mt-5 grid gap-2">
                {current.options.map((opt) => {
                  const selected = currentAnswer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, [current.id]: opt }));
                        if (step < total - 1) setStep(step + 1);
                      }}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <span>{t.questions[current.id].options[opt]}</span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>

              {step === total - 1 && (
                <div className="mt-6">
                  <label
                    htmlFor="study-country"
                    className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t.countryLabel}
                  </label>
                  <select
                    id="study-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  >
                    <option value="">—</option>
                    {STUDY_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c === "OTHER" ? t.countryOther : STUDY_COUNTRY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {t.back}
                </button>
                {step === total - 1 ? (
                  <button
                    type="button"
                    disabled={!currentAnswer || sending}
                    onClick={submit}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {sending ? t.submitting : t.submit}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!currentAnswer}
                    onClick={() => setStep(step + 1)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {t.next}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )}

          {done && (
            <div className="grid gap-6">
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-foreground">{t.thanksTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.thanksBody}</p>
              </div>

              <BenchmarkPanel locale={locale} benchmark={benchmark} />

              {!contactDone ? (
                <ContactCard
                  locale={locale}
                  responseId={responseId}
                  country={country}
                  onDone={() => setContactDone(true)}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
                  <p className="text-sm text-foreground">{t.contactDone}</p>
                  <Link
                    to="/pilot"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    {t.wantsPilot}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionShell>
    </OixLayout>
  );
}

function BenchmarkPanel({ locale, benchmark }: { locale: StudyLocale; benchmark: Benchmark | null }) {
  const t = studyCopy(locale);
  const totalResponses = benchmark?.total ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">{t.benchmarkTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {totalResponses} {t.benchmarkResponses}
        </p>
      </div>

      {!benchmark?.open ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.benchmarkLocked} ({totalResponses}/{STUDY_BENCHMARK_MIN})
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {STUDY_QUESTIONS.filter((q) => q.id !== "size").map((q) => {
            const dist = benchmark.byQuestion[q.id] ?? {};
            const sum = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
            return (
              <div key={q.id}>
                <h3 className="text-sm font-semibold text-foreground">{t.questions[q.id].label}</h3>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt) => {
                    const pct = Math.round(((dist[opt] ?? 0) / sum) * 100);
                    return (
                      <div key={opt} className="grid gap-1">
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{t.questions[q.id].options[opt]}</span>
                          <span className="font-semibold text-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  locale,
  responseId,
  country,
  onDone,
}: {
  locale: StudyLocale;
  responseId: string | null;
  country: string;
  onDone: () => void;
}) {
  const t = studyCopy(locale);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [wantsReport, setWantsReport] = useState(true);
  const [wantsPilot, setWantsPilot] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/public/study-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          responseId: responseId ?? "",
          email,
          contactName: name,
          companyName: company,
          country,
          wantsReport,
          wantsPilot,
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error("failed");
      onDone();
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSending(false);
    }
  }

  const field = "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">{t.contactTitle}</h2>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{t.optional}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.contactBody}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="study-email" className={labelCls}>
            {t.emailLabel}
          </label>
          <input
            id="study-email"
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="study-name" className={labelCls}>
            {t.nameLabel}
          </label>
          <input
            id="study-name"
            type="text"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="study-company" className={labelCls}>
            {t.companyLabel}
          </label>
          <input
            id="study-company"
            type="text"
            maxLength={160}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={wantsReport} onChange={(e) => setWantsReport(e.target.checked)} />
          <span>{t.wantsReport}</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={wantsPilot} onChange={(e) => setWantsPilot(e.target.checked)} />
          <span>{t.wantsPilot}</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t.consent}</span>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!consent || !email.includes("@") || sending}
          onClick={send}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t.contactSubmit}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {t.skip}
        </button>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import {
  RESOURCE_SLUGS,
  resourcesCopyEn,
  useResourcesCopy,
  type ResourceSlug,
} from "@/i18n/pages/resources";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/resources")({
  head: () =>
    pageHead({
      title: resourcesCopyEn.meta.title,
      description: resourcesCopyEn.meta.description,
      path: "/resources",
      keywords:
        "SOP checklist download, knowledge cost calculator, operational knowledge audit template, operations resources",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" },
        ]),
      ],
    }),
  component: ResourcesPage,
});

const inputCls =
  "bg-[var(--oix-onyx)]/60 border-[var(--oix-gold-line)]/40 text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:border-[var(--oix-gold)]/70 focus-visible:ring-0";

function ResourcesPage() {
  const t = useResourcesCopy();
  const { lang } = useT();
  const [slug, setSlug] = useState<ResourceSlug>("sop-30-day-checklist");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string | null; href: string } | null>(null);

  const fileHref = (s: ResourceSlug) => `/resources/opsqai-${s}-${lang}.pdf`;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      subject: "other" as const,
      message: `[Lead magnet: ${slug}] [Language: ${lang}]\n\nRequested a free resource download from /resources.`,
      website: String(fd.get("website") ?? ""), // honeypot
    };
    try {
      const res = await fetch("/api/public/contact-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        referenceId?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? t.form.errorGeneric);
        return;
      }
      setResult({ reference: json.referenceId ?? null, href: fileHref(slug) });
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error(t.form.errorNetwork);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]/40">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-40">
          <EditorialHeadline
            as="h1"
            size="xl"
            eyebrow={t.hero.eyebrow}
            serifAccent={t.hero.serifAccent}
          >
            {t.hero.headline}
          </EditorialHeadline>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
            {t.hero.body}
          </p>
        </div>
      </section>

      <SectionShell>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-5">
            {RESOURCE_SLUGS.map((s) => {
              const item = t.items[s];
              const active = s === slug;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlug(s)}
                  className={`w-full rounded-sm border p-6 text-left transition-colors ${
                    active
                      ? "border-[var(--oix-gold)]/70 bg-[var(--oix-onyx)]/70"
                      : "border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/40"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <FileText className="mt-1 h-5 w-5 shrink-0 text-[var(--oix-gold)]" />
                    <div>
                      <div className="oix-eyebrow text-[10px]">{item.kind}</div>
                      <div className="mt-2 text-base font-semibold text-[var(--oix-cream)]">
                        {item.title}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--oix-cream)]/70">
                        {item.body}
                      </p>
                      <ul className="mt-4 space-y-1.5">
                        {item.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2 text-sm text-[var(--oix-cream)]/65"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--oix-gold)]" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Card
            id="get"
            className="h-fit border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 p-8 backdrop-blur oix-brackets"
          >
            {result ? (
              <div>
                <div className="oix-display text-2xl text-[var(--oix-cream)]">
                  {t.form.successTitle}
                </div>
                {result.reference ? (
                  <p className="mt-3 text-sm text-[var(--oix-cream)]/70">
                    {t.form.successBody}{" "}
                    <span className="font-mono text-[var(--oix-gold)]">{result.reference}</span>.
                  </p>
                ) : null}
                <a
                  href={result.href}
                  download
                  className="mt-6 inline-flex items-center gap-2 rounded-sm border border-[var(--oix-gold)]/70 px-5 py-3 text-sm font-semibold text-[var(--oix-gold)]"
                >
                  <Download className="h-4 w-4" />
                  {t.form.download}
                </a>
                <div className="mt-6">
                  <OixButton variant="ghost" onClick={() => setResult(null)}>
                    {t.form.another}
                  </OixButton>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="oix-eyebrow text-[10px]">{t.form.eyebrow}</div>
                <div className="oix-display text-xl text-[var(--oix-cream)]">{t.form.title}</div>
                <p className="text-sm leading-relaxed text-[var(--oix-cream)]/65">{t.form.body}</p>

                <div className="space-y-2">
                  <Label className="oix-eyebrow text-[10px]">{t.form.pick}</Label>
                  <Select value={slug} onValueChange={(v) => setSlug(v as ResourceSlug)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_SLUGS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t.items[s].title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="res-name" className="oix-eyebrow text-[10px]">
                    {t.form.nameLabel}
                  </Label>
                  <Input
                    id="res-name"
                    name="name"
                    required
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-email" className="oix-eyebrow text-[10px]">
                    {t.form.emailLabel}
                  </Label>
                  <Input
                    id="res-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-company" className="oix-eyebrow text-[10px]">
                    {t.form.companyLabel}
                  </Label>
                  <Input
                    id="res-company"
                    name="company"
                    autoComplete="organization"
                    className={inputCls}
                  />
                </div>

                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <OixButton type="submit" variant="gold" withArrow disabled={submitting}>
                  {submitting ? t.form.submitting : t.form.submit}
                </OixButton>

                <p className="text-xs text-[var(--oix-cream)]/50">
                  {t.form.consent}{" "}
                  <a href="/legal/privacy" className="underline">
                    {t.form.privacy}
                  </a>
                  .
                </p>
              </form>
            )}
          </Card>
        </div>
      </SectionShell>

      <SectionShell>
        <Card className="border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 p-10">
          <h2 className="oix-display text-2xl text-[var(--oix-cream)]">{t.cta.title}</h2>
          <p className="mt-4 max-w-2xl text-[var(--oix-cream)]/70">{t.cta.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <OixButton to="/pilot" variant="gold" withArrow>
              {t.cta.pilot}
            </OixButton>
            <OixButton to="/contact?subject=demo" variant="ghost">
              {t.cta.demo}
            </OixButton>
          </div>
        </Card>
      </SectionShell>
    </OixLayout>
  );
}

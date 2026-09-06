import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
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
import { usePilotCopy } from "@/i18n/pages/pilot";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pilot")({
  head: () => {
    const t = usePilotCopy();
    return pageHead({
      title: t.meta.title,
      description: t.meta.description,
      path: "/pilot",
      keywords:
        "OPSQAI pilot, free trial operational AI, Windows self-hosted AI pilot, logistics AI pilot, HR AI pilot, Romania, Germany",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Pilot Program", path: "/pilot" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Pilot Program", path: "/pilot" },
        ]),
      ],
    });
  },
  component: PilotPage,
});

const inputCls =
  "bg-[var(--oix-onyx)]/60 border-[var(--oix-gold-line)]/40 text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:border-[var(--oix-gold)]/70 focus-visible:ring-0";

function PilotPage() {
  const t = usePilotCopy();
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [vertical, setVertical] = useState<string>("logistics");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      country: String(fd.get("country") ?? ""),
      subject: "pilot" as const,
      message: `[Vertical: ${vertical}]\n\n${String(fd.get("message") ?? "")}`,
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
      setReference(json.referenceId ?? null);
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error(t.form.errorNetwork);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OixLayout>
      <section className="relative isolate min-h-[70vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-32 md:grid-cols-2 md:px-10 md:pb-24 md:pt-40">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={t.hero.eyebrow}
              serifAccent={t.hero.serifAccent}
            >
              {t.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {t.hero.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="#apply" variant="gold" withArrow>
                {t.form.submit}
              </OixButton>
              <OixButton to="/contact?subject=demo" variant="ghost">
                Book a demo
              </OixButton>
            </div>
          </div>
          <EnterpriseIntelligence variant="contact" compact className="hidden md:block" />
        </div>
      </section>

      <SectionShell>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="oix-eyebrow mb-6">{t.terms.eyebrow}</div>
            <h2 className="oix-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[var(--oix-cream)]">
              {t.terms.title}
            </h2>
            <div className="mt-8 space-y-4">
              {t.terms.items.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-sm border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/40 p-5"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--oix-gold)] mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm text-[var(--oix-cream)]">
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--oix-cream)]/70">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card
            id="apply"
            className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur oix-brackets"
          >
            {reference ? (
              <div>
                <div className="oix-display text-2xl text-[var(--oix-cream)]">
                  {t.form.successTitle}
                </div>
                <p className="mt-4 text-[var(--oix-cream)]/70 leading-relaxed">
                  {t.form.successBody}{" "}
                  <span className="font-mono font-medium text-[var(--oix-gold)]">
                    {reference}
                  </span>
                  . {t.form.successFooter}
                </p>
                <div className="mt-6">
                  <OixButton variant="ghost" onClick={() => setReference(null)}>
                    {t.form.sendAnother}
                  </OixButton>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="oix-display text-xl text-[var(--oix-cream)]">
                  {t.form.title}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="oix-eyebrow text-[10px]">
                      {t.form.nameLabel}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="oix-eyebrow text-[10px]">
                      {t.form.emailLabel}
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="oix-eyebrow text-[10px]">
                      {t.form.companyLabel}
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      autoComplete="organization"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="oix-eyebrow text-[10px]">
                      {t.form.countryLabel}
                    </Label>
                    <Input
                      id="country"
                      name="country"
                      autoComplete="country-name"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vertical" className="oix-eyebrow text-[10px]">
                    {t.form.verticalLabel}
                  </Label>
                  <Select
                    value={vertical}
                    onValueChange={(v) => setVertical(v)}
                  >
                    <SelectTrigger id="vertical" className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(t.form.verticalOptions).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="oix-eyebrow text-[10px]">
                    {t.form.messageLabel}
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    minLength={10}
                    className="flex min-h-[120px] w-full rounded-none border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 px-3 py-2.5 text-sm text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:outline-none focus-visible:border-[var(--oix-gold)]/70"
                  />
                </div>
                {/* Honeypot */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <div className="pt-2">
                  <OixButton variant="gold" withArrow disabled={submitting} type="submit">
                    {submitting ? t.form.sending : t.form.submit}
                  </OixButton>
                </div>
                <p className="text-xs text-[var(--oix-cream)]/50">
                  {t.form.consentPrefix}{" "}
                  <a href="/legal/privacy" className="underline">
                    {t.form.privacyNotice}
                  </a>
                  .
                </p>
              </form>
            )}
          </Card>
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />
    </OixLayout>
  );
}

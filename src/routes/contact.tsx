import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
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
import { Mail, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_SUBJECT_LABELS, type ContactSubject } from "@/lib/email/routing";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";

const SearchSchema = z.object({
  subject: z
    .enum([
      "general",
      "demo",
      "sales",
      "pricing",
      "support",
      "bug",
      "security",
      "privacy",
      "partnership",
      "other",
    ])
    .optional(),
});

export const Route = createFileRoute("/contact")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Contact — OPSQAI" },
      {
        name: "description",
        content: "Book a demo, ask sales, request privacy support or report a security issue.",
      },
      { property: "og:title", content: "Contact — OPSQAI" },
      { property: "og:url", content: "https://opsqai.de/contact" },
      {
        property: "og:description",
        content: "Book a demo, ask sales, request privacy support or report a security issue.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/contact" }],
  }),
  component: ContactPage,
});

const SUBJECT_OPTIONS: Array<{ value: ContactSubject; label: string }> = (
  Object.entries(CONTACT_SUBJECT_LABELS) as Array<[ContactSubject, string]>
).map(([value, label]) => ({ value, label }));

const inputCls =
  "bg-[var(--oix-onyx)]/60 border-[var(--oix-gold-line)]/40 text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:border-[var(--oix-gold)]/70 focus-visible:ring-0";

function ContactPage() {
  const search = useSearch({ from: "/contact" });
  const [subject, setSubject] = useState<ContactSubject>(search.subject ?? "general");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      country: String(fd.get("country") ?? ""),
      subject,
      message: String(fd.get("message") ?? ""),
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
        toast.error(json.error ?? "We couldn't send your message. Please try again.");
        return;
      }
      setReference(json.referenceId ?? null);
      toast.success("Message sent — check your inbox for the confirmation.");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OixLayout>
      {/* Hero */}
      <section className="relative isolate min-h-[60vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[0, 1.2, 5]} cameraFov={44}>
            <ambientLight intensity={0.4} />
            <pointLight position={[3, 3, 3]} intensity={1} color="#c9a84c" />
            <GridFloor />
            <EmberFog />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.92) 88%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow="Contact · Routed to the right team"
              serifAccent="operations."
            >
              Let&apos;s talk
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              Pick the topic that best fits — your message routes straight to the
              right team, and you&apos;ll get a confirmation by email.
            </p>
          </div>
        </div>
      </section>

      {/* Form + channels */}
      <SectionShell>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="p-8 md:col-span-2 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur oix-brackets">
            {reference ? (
              <div>
                <div className="oix-display text-2xl text-[var(--oix-cream)]">
                  Thanks — we received your request.
                </div>
                <p className="mt-4 text-[var(--oix-cream)]/70 leading-relaxed">
                  We&apos;ve emailed a confirmation. Reference{" "}
                  <span className="font-mono font-medium text-[var(--oix-gold)]">
                    {reference}
                  </span>
                  . Our team typically responds within 1 business day (CET).
                </p>
                <div className="mt-6">
                  <OixButton variant="ghost" onClick={() => setReference(null)}>
                    Send another message
                  </OixButton>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="oix-eyebrow text-[10px]">
                    What can we help with?
                  </Label>
                  <Select
                    value={subject}
                    onValueChange={(v) => setSubject(v as ContactSubject)}
                  >
                    <SelectTrigger id="subject" className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="oix-eyebrow text-[10px]">Name</Label>
                    <Input id="name" name="name" required autoComplete="name" className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="oix-eyebrow text-[10px]">Work email</Label>
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
                    <Label htmlFor="company" className="oix-eyebrow text-[10px]">Company</Label>
                    <Input
                      id="company"
                      name="company"
                      autoComplete="organization"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="oix-eyebrow text-[10px]">
                      Phone (optional)
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="oix-eyebrow text-[10px]">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    autoComplete="country-name"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="oix-eyebrow text-[10px]">Message</Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    minLength={10}
                    className="flex min-h-[140px] w-full rounded-none border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 px-3 py-2.5 text-sm text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:outline-none focus-visible:border-[var(--oix-gold)]/70"
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
                    {submitting ? "Sending…" : "Send message"}
                  </OixButton>
                </div>
                <p className="text-xs text-[var(--oix-cream)]/50">
                  By submitting you agree to our{" "}
                  <a
                    href="/legal/privacy"
                    className="underline hover:text-[var(--oix-gold-soft)]"
                  >
                    privacy notice
                  </a>
                  .
                </p>
              </form>
            )}
          </Card>

          <div className="space-y-4">
            {[
              { label: "General", email: "info@opsqai.de", subject: "general", icon: Mail },
              { label: "Support", email: "support@opsqai.de", subject: "support", icon: Mail },
              {
                label: "Security",
                email: "security@opsqai.de",
                subject: "security",
                icon: ShieldCheck,
              },
              {
                label: "Privacy & GDPR",
                email: "policy@opsqai.de",
                subject: "privacy",
                icon: Lock,
              },
            ].map((c) => (
              <Card
                key={c.email}
                className="p-5 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur"
              >
                <div className="oix-eyebrow text-[10px]">{c.label}</div>
                <a
                  href={`/contact?subject=${c.subject}`}
                  className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--oix-cream)] hover:text-[var(--oix-gold-soft)] transition-colors"
                >
                  <c.icon className="h-4 w-4 text-[var(--oix-gold)]" /> {c.email}
                </a>
              </Card>
            ))}
          </div>
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />
    </OixLayout>
  );
}

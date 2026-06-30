import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_SUBJECT_LABELS, type ContactSubject } from "@/lib/email/routing";

const SearchSchema = z.object({
  subject: z
    .enum(["general", "demo", "sales", "pricing", "support", "bug", "security", "privacy", "partnership", "other"])
    .optional(),
});

export const Route = createFileRoute("/contact")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Contact — OPSQAI" },
      { name: "description", content: "Book a demo, ask sales, request privacy support or report a security issue." },
      { property: "og:title", content: "Contact — OPSQAI" },
      { property: "og:url", content: "https://opsqai.de/contact" },
      { property: "og:description", content: "Book a demo, ask sales, request privacy support or report a security issue." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/contact" }],
  }),
  component: ContactPage,
});

const SUBJECT_OPTIONS: Array<{ value: ContactSubject; label: string }> = (
  Object.entries(CONTACT_SUBJECT_LABELS) as Array<[ContactSubject, string]>
).map(([value, label]) => ({ value, label }));

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
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; referenceId?: string; error?: string };
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
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Contact</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Let's talk operations.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Pick the topic that best fits — your message routes straight to the right team, and you'll get a confirmation by email.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <Card className="p-6 md:col-span-2">
            {reference ? (
              <div className="text-sm">
                <div className="text-base font-semibold">Thanks — we received your request.</div>
                <p className="mt-2 text-muted-foreground">
                  We've emailed a confirmation. Reference <span className="font-mono font-medium text-foreground">{reference}</span>.
                  Our team typically responds within 1 business day (CET).
                </p>
                <Button className="mt-4" variant="outline" onClick={() => setReference(null)}>Send another message</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">What can we help with?</Label>
                  <Select value={subject} onValueChange={(v) => setSubject(v as ContactSubject)}>
                    <SelectTrigger id="subject"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" required autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" autoComplete="organization" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" name="phone" type="tel" autoComplete="tel" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" autoComplete="country-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    minLength={10}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                {/* Honeypot — hidden from users, visible to bots */}
                <div className="hidden" aria-hidden="true">
                  <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
                </div>
                <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send message"}</Button>
                <p className="text-xs text-muted-foreground">
                  By submitting you agree to our <a href="/legal/privacy" className="underline">privacy notice</a>.
                </p>
              </form>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">General</div>
              <a href="/contact?subject=general" className="mt-2 flex items-center gap-2 font-medium hover:underline">
                <Mail className="h-4 w-4" /> info@opsqai.de
              </a>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Support</div>
              <a href="/contact?subject=support" className="mt-2 flex items-center gap-2 font-medium hover:underline">
                <Mail className="h-4 w-4" /> support@opsqai.de
              </a>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Security</div>
              <a href="/contact?subject=security" className="mt-2 flex items-center gap-2 font-medium hover:underline">
                <ShieldCheck className="h-4 w-4" /> security@opsqai.de
              </a>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Privacy &amp; GDPR</div>
              <a href="/contact?subject=privacy" className="mt-2 flex items-center gap-2 font-medium hover:underline">
                <Lock className="h-4 w-4" /> policy@opsqai.de
              </a>
            </Card>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

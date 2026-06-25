import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — OPSQAI" },
      { name: "description", content: "Book a demo, request a quote or get in touch with the OPSQAI team." },
      { property: "og:title", content: "Contact — OPSQAI" },
      { property: "og:url", content: "https://opsqai.de/contact" },
      { property: "og:description", content: "Book a demo, request a quote or get in touch with the OPSQAI team." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`OPSQAI inquiry — ${data.get("company") ?? "(no company)"}`);
    const body = encodeURIComponent(
      `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nCompany: ${data.get("company")}\n\nMessage:\n${data.get("message")}`,
    );
    window.location.href = `mailto:notify@opsqai.de?subject=${subject}&body=${body}`;
    setSent(true);
    toast.success("Your email client is opening — send the prefilled message and we'll reply within 1 business day.");
  };

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Contact</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Let's talk operations.</h1>
        <p className="mt-5 text-lg text-muted-foreground">Tell us about your setup — sites, languages, document volume — and we'll set up a tailored walkthrough.</p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <Card className="p-6 md:col-span-2">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">How can we help?</Label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit" disabled={sent}>{sent ? "Sent" : "Send message"}</Button>
              <p className="text-xs text-muted-foreground">By submitting you agree to our <a href="/legal/privacy" className="underline">privacy notice</a>.</p>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
              <a href="mailto:notify@opsqai.de" className="mt-2 flex items-center gap-2 font-medium hover:underline">
                <Mail className="h-4 w-4" /> notify@opsqai.de
              </a>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">For customers</div>
              <p className="mt-2 text-sm">Existing customer? Reach support from inside the app — admins have a dedicated channel.</p>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Response time</div>
              <p className="mt-2 text-sm">We reply to sales inquiries within 1 business day (CET).</p>
            </Card>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

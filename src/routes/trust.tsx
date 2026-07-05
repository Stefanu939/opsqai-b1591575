import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Lock, FileCheck, Server, Eye, Users, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust Center — OPSQAI" },
      { name: "description", content: "How OPSQAI protects customer data: multi-tenant isolation, encryption, audit logs, GDPR, responsible AI and incident response." },
      { property: "og:title", content: "Trust Center — OPSQAI" },
      { property: "og:description", content: "Security, privacy and compliance posture for OPSQAI." },
      { property: "og:url", content: "https://opsqai.de/trust" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust" }],
  }),
  component: TrustPage,
});

const SECTIONS = [
  {
    icon: Lock,
    title: "Encryption",
    body: "Data is encrypted in transit (TLS 1.2+) and at rest. Database backups are encrypted. Application secrets are stored in managed key storage and never committed to source.",
  },
  {
    icon: Users,
    title: "Multi-tenant isolation",
    body: "Every record in OPSQAI carries a company_id. PostgreSQL row-level security policies enforce that authenticated users see only data for their own company. A separate platform super-admin role exists for our internal operations.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Roles are stored separately from user profiles. Admin, manager, team leader and employee permissions are enforced both at the API layer and in the database. Privilege escalation is blocked by a restrictive INSERT policy on user_roles.",
  },
  {
    icon: Eye,
    title: "Audit logs",
    body: "Questions asked, sources used, document uploads, role changes and admin actions are recorded in an append-only audit log scoped to each tenant. Admins can review activity for their own company.",
  },
  {
    icon: FileCheck,
    title: "GDPR posture",
    body: "OPSQAI is operated from the EU. Customer application data is hosted on managed Supabase infrastructure in AWS eu-west-1 (Dublin, Ireland). Customers can request export or deletion of their tenant data; we support data portability and the right to be forgotten. A DPA is available on request (currently in draft, pending final legal review).",
  },
  {
    icon: Server,
    title: "Infrastructure",
    body: "OPSQAI runs on managed cloud infrastructure with automatic backups, region failover and DDoS protection. Production access is restricted to a small operations team using MFA.",
  },
  {
    icon: AlertCircle,
    title: "Responsible AI",
    body: "OPSQAI answers strictly from retrieved customer documents. When no source matches, the model returns a refusal — never a guess. Customer documents and questions are not used to train Google's or OpenAI's foundation models under the terms of the Lovable AI Gateway.",
  },
];

const SUBPROCESSORS = [
  { name: "Lovable Cloud (Supabase)", role: "Application database, authentication, storage, edge functions", region: "AWS eu-west-1 (Dublin, Ireland)" },
  { name: "Cloudflare", role: "Edge runtime, DNS, DDoS protection", region: "Global with EU termination" },
  { name: "Google (via Lovable AI Gateway)", role: "Gemini models (gemini-3-flash-preview, gemini-2.5-flash) for chat / retrieval responses", region: "Google Cloud; transfers outside EEA safeguarded by SCCs (Art. 46 GDPR). Not used to train foundation models." },
  { name: "OpenAI (via Lovable AI Gateway)", role: "gpt-5-mini for generation, gpt-4o-mini-tts for text-to-speech, text-embedding-3-small for embeddings", region: "OpenAI infrastructure; transfers outside EEA safeguarded by SCCs (Art. 46 GDPR). Not used to train foundation models." },
];

function TrustPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Trust Center</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Security, privacy & responsible AI.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          This page is maintained by OPSQAI to summarize how we protect customer data, isolate tenants and operate the platform responsibly. It is informational and is not a substitute for independent certification.
        </p>

        <div className="mt-8 rounded-lg border border-border/60 bg-muted/30 p-5 text-sm leading-relaxed">
          <p className="font-semibold text-foreground">Certification status</p>
          <p className="mt-2 text-muted-foreground">
            OPSQAI (the product and company) is <strong className="text-foreground">not currently SOC 2 or ISO/IEC 27001 certified</strong>.
            Our infrastructure subprocessor's platform (<strong className="text-foreground">Lovable</strong>) holds
            <strong className="text-foreground"> SOC 2 Type II</strong> and
            <strong className="text-foreground"> ISO 27001:2022</strong> certifications at the company level.
            Our current subscription is <strong className="text-foreground">Lovable's Pro tier</strong>;
            <strong className="text-foreground"> Business-tier contractual coverage is being confirmed</strong> and
            the relevant documentation will be provided upon request. Certification of a subprocessor reduces, but
            does not eliminate, OPSQAI's own responsibility as a data processor under Art. 28 GDPR.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="p-6 border-border/60">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Subprocessors</h2>
        <p className="mt-2 text-sm text-muted-foreground">OPSQAI engages the following subprocessors to operate the service. Customers are notified of material changes.</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left p-3">Subprocessor</th><th className="text-left p-3">Role</th><th className="text-left p-3">Region</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}><td className="p-3 font-medium">{s.name}</td><td className="p-3 text-muted-foreground">{s.role}</td><td className="p-3 text-muted-foreground">{s.region}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Trust topics</h2>
        <p className="mt-2 text-sm text-muted-foreground">Detailed write-ups on the controls behind OPSQAI.</p>
        <div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            { to: "/trust/gdpr", label: "GDPR" },
            { to: "/trust/security-architecture", label: "Security Architecture" },
            { to: "/trust/multi-tenant-isolation", label: "Multi-Tenant Isolation" },
            { to: "/trust/encryption", label: "Encryption" },
            { to: "/trust/audit-logs", label: "Audit Logs" },
            { to: "/trust/responsible-ai", label: "Responsible AI" },
            { to: "/trust/data-retention", label: "Data Retention" },
            { to: "/trust/incident-response", label: "Incident Response" },
            { to: "/trust/backup-policy", label: "Backup Policy" },
            { to: "/trust/availability", label: "Availability" },
            { to: "/trust/iso-27001-roadmap", label: "ISO 27001 Roadmap" },
          ].map((t) => (
            <Link key={t.to} to={t.to} className="rounded-md border border-border/60 px-4 py-3 hover:bg-muted/40">{t.label} →</Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20">
        <h2 className="text-2xl font-semibold tracking-tight">Reporting a vulnerability</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We welcome reports from security researchers. Please email <a href="mailto:notify@opsqai.de" className="underline">notify@opsqai.de</a> with a description, reproduction steps and your contact details. We will acknowledge within 2 business days.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-2 text-sm">
          <Link to="/legal/privacy" className="rounded-md border border-border/60 px-4 py-3 hover:bg-muted/40">Privacy Policy →</Link>
          <Link to="/legal/dpa" className="rounded-md border border-border/60 px-4 py-3 hover:bg-muted/40">Data Processing Agreement →</Link>
          <Link to="/legal/responsible-ai" className="rounded-md border border-border/60 px-4 py-3 hover:bg-muted/40">Responsible AI →</Link>
          <Link to="/legal/terms" className="rounded-md border border-border/60 px-4 py-3 hover:bg-muted/40">Terms of Service →</Link>

        </div>
      </section>
    </MarketingLayout>
  );
}

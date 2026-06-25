import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — OPSQAI" },
      { name: "description", content: "Source-grounded RAG, SOP version control, multi-tenant RLS, multilingual EN/DE/RO, audit log, knowledge gaps, internal requests, PWA install." },
      { property: "og:title", content: "Features — OPSQAI" },
      { property: "og:description", content: "The full OPSQAI feature set for logistics operations." },
      { property: "og:url", content: "https://opsqai.de/features" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/features" }],
  }),
  component: FeaturesPage,
});

const GROUPS = [
  {
    title: "Knowledge & retrieval",
    items: [
      "Server-side PDF / DOCX / TXT extraction",
      "Section-aware recursive chunking",
      "pgvector semantic search + keyword hybrid",
      "Multilingual embeddings (EN / DE / RO)",
      "Source-grounded answers with verbatim excerpts",
      "Knowledge gap detection on repeat unanswered questions",
    ],
  },
  {
    title: "SOP & content management",
    items: [
      "SOP re-sync with replace-or-cancel prompt",
      "Version history preserved for audit",
      "FAQ management with manager promotion flow",
      "Internal request queue when AI can't answer",
      "Promote a request to a new FAQ or SOP in one click",
    ],
  },
  {
    title: "Roles, security & compliance",
    items: [
      "Roles: admin · manager · team leader · employee · platform super admin",
      "Row-level security per company tenant",
      "Append-only audit log with question + sources",
      "Invite-only onboarding (no public signup)",
      "EU-hosted infrastructure",
      "Storage hardened: only admins write knowledge documents",
    ],
  },
  {
    title: "Experience",
    items: [
      "Bilingual UI plus Romanian (3 languages)",
      "PWA install on Android, iOS, Windows, macOS",
      "Mobile-first chat with copy + source panel",
      "Per-tenant workspace switching for platform admins",
      "Light & dark theme parity",
    ],
  },
];

function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Features</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Everything operations teams need.</h1>
        <p className="mt-5 text-lg text-muted-foreground">A complete platform — not a wrapper around a chatbot.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {GROUPS.map((g) => (
            <Card key={g.title} className="p-6 border-border/60">
              <h2 className="font-semibold text-lg">{g.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {g.items.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Need something specific?</h2>
          <p className="mt-3 text-muted-foreground">SSO, on-prem, custom integrations and white-label branding are available on the Enterprise plan.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button asChild><Link to="/contact">Talk to sales</Link></Button>
            <Button asChild variant="outline"><Link to="/pricing">See pricing</Link></Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

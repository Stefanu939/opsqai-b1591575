import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead, faqLd } from "@/lib/seo";

const FAQS = [
  {
    q: "What is OPSQAI?",
    a: "OPSQAI is an enterprise AI knowledge platform for logistics and warehouse operations. It ingests your SOPs, manuals and FAQs, indexes them per company, and answers employee questions with grounded, source-cited responses.",
  },
  {
    q: "Does OPSQAI invent answers?",
    a: "No. Answers are grounded exclusively in your uploaded documents. When nothing matches, OPSQAI returns an explicit refusal instead of guessing, and every response includes citations back to the source document and section.",
  },
  {
    q: "How is my data isolated from other companies?",
    a: "OPSQAI is a multi-tenant SaaS with row-level security. Every document, embedding, question and audit event is scoped to your workspace; no cross-company retrieval is possible by design.",
  },
  {
    q: "Is OPSQAI GDPR-compliant?",
    a: "Yes. The platform is designed for GDPR posture: data residency in the EU, documented retention policies, DPA, role-based access, encryption in transit and at rest, and full audit logs. See /trust for the current posture.",
  },
  {
    q: "Which document formats does OPSQAI support?",
    a: "PDF, DOCX and TXT today. Text is extracted server-side and chunked section-aware before being embedded into pgvector with multilingual models.",
  },
  {
    q: "In which languages can employees ask questions?",
    a: "Employees can ask in virtually any language OPSQAI's multilingual embedding models support. Answers are returned in the same language, grounded in the underlying document regardless of source language.",
  },
  {
    q: "Can we control who sees what?",
    a: "Yes. OPSQAI supports role-based permissions across departments and sites. Administrators define who can upload, who can query, and who can view analytics or audit logs.",
  },
  {
    q: "How long does implementation take?",
    a: "Typical first-value onboarding is measured in days, not months. A single workspace with an initial SOP library can be operational within one week; multi-site rollouts are staged over 30–90 days.",
  },
];

export const Route = createFileRoute("/help")({
  head: () =>
    pageHead({
      title: "Help Center — OPSQAI FAQ for Operators & Administrators",
      description:
        "Answers to the most common questions about OPSQAI: how it grounds answers, how data is isolated across companies, GDPR posture, supported formats, and rollout time.",
      path: "/help",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Help Center", path: "/help" },
      ],
      jsonLd: [faqLd(FAQS.map((f) => ({ question: f.q, answer: f.a })))],
    }),
  component: HelpCenter,
});

function HelpCenter() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/resources" className="hover:text-foreground">
          Resources
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-foreground">Help Center</span>
      </nav>
      <header className="mb-14">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Help Center
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Frequently asked questions.
        </h1>
      </header>
      <dl className="space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="rounded-2xl border border-border/60 bg-card/50 p-6">
            <dt className="text-base font-semibold text-foreground">{f.q}</dt>
            <dd className="mt-3 text-muted-foreground">{f.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-12 text-sm text-muted-foreground">
        Didn't find your answer?{" "}
        <Link to="/contact" className="text-primary hover:underline">
          Contact us
        </Link>
        .
      </p>
    </main>
  );
}

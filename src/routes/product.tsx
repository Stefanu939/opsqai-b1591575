import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { pageHead, softwareApplicationLd } from "@/lib/seo";

export const Route = createFileRoute("/product")({
  head: () =>
    pageHead({
      title: "Product — OPSQAI Enterprise AI Knowledge Platform",
      description:
        "How OPSQAI works: ingestion, retrieval, grounded generation, multi-tenant isolation and the operations-grade UX warehouse teams actually adopt.",
      path: "/product",
      keywords: "enterprise AI platform, RAG, retrieval augmented generation, source-backed AI, warehouse AI, multi-tenant AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Product", path: "/product" },
      ],
      jsonLd: [
        softwareApplicationLd({
          description:
            "OPSQAI ingests SOPs and manuals, indexes them with multilingual embeddings, and answers questions with grounded, source-cited responses under multi-tenant isolation.",
        }),
      ],
    }),
  component: ProductPage,
});

const FLOW = [
  { step: "1", title: "Ingest", body: "Upload SOPs, manuals, work instructions and FAQs in PDF, DOCX or TXT. OPSQAI extracts text server-side and chunks it section-aware." },
  { step: "2", title: "Index", body: "Each chunk is embedded into pgvector with multilingual models so meaning — not just keywords — is searchable." },
  { step: "3", title: "Retrieve", body: "On every question, OPSQAI runs hybrid semantic + keyword retrieval scoped to your company by row-level security." },
  { step: "4", title: "Ground", body: "The model answers strictly from retrieved sources. If nothing matches, it returns a clear refusal instead of guessing." },
  { step: "5", title: "Cite", body: "Each answer ships with document, section and verbatim excerpt — your auditors and your team see exactly where it came from." },
];

function ProductPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Product</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">A knowledge engine, not a chatbot.</h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          OPSQAI is built around one principle: the only acceptable answer is one your team can verify. Every layer of the platform — ingestion, retrieval, generation, audit — exists to keep answers grounded in your company's source of truth.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-3 md:grid-cols-5">
          {FLOW.map((f) => (
            <Card key={f.step} className="p-5 border-border/60">
              <div className="text-xs font-mono text-primary">STEP {f.step}</div>
              <div className="mt-2 font-semibold">{f.title}</div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 border-y border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Operations-grade UX</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              A warehouse floor is not a desk. OPSQAI is mobile-first, installable as a PWA, works in three languages, and surfaces escalations when the answer isn't in the documents — so people aren't stuck guessing.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Enterprise-grade backend</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Per-tenant row-level security, role-based access (admin / manager / team leader / employee), append-only audit logs, invite-only onboarding and EU hosting.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">See it on your own SOPs.</h2>
        <p className="mt-3 text-muted-foreground">Bring a handful of documents and we'll spin up a tenant for your evaluation.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button asChild><Link to="/contact">Book a demo</Link></Button>
          <Button asChild variant="outline"><Link to="/features">See features</Link></Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { ShieldCheck, Layers, Users, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About OPSQAI — Enterprise AI for Operational Knowledge",
      description:
        "OPSQAI builds AI infrastructure for logistics, warehousing and supply chain — engineered for source-backed answers, multi-tenant isolation and audit-oriented governance (OPSQAI itself is not yet SOC 2 / ISO 27001 certified — see /trust).",
      path: "/about",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ],
    }),
  component: AboutPage,
});

const principles = [
  {
    icon: ShieldCheck,
    title: "Enterprise by default",
    body: "Multi-tenant isolation, role-based access, encryption in transit and at rest, and a documented GDPR posture from day one.",
  },
  {
    icon: Sparkles,
    title: "Source-backed AI",
    body: "Every answer is grounded in an approved company document. No hallucinations, no guesses — an explicit refusal when nothing matches.",
  },
  {
    icon: Layers,
    title: "Operational reality",
    body: "Built with real logistics teams: 3PL, cold chain, e-commerce fulfilment, distribution centers, air cargo — not generic enterprise chatbots.",
  },
  {
    icon: Users,
    title: "Governed at scale",
    body: "Roles across departments and sites, audit trails on every operation, and multi-company SaaS architecture for group operators.",
  },
];

function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        <span className="mx-2">/</span> <span className="text-foreground">About</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          About OPSQAI
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Enterprise AI for the operations that actually move the physical world.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Warehouses, distribution centers and 3PL networks run on institutional knowledge — SOPs,
          work instructions, tribal know-how. OPSQAI turns that knowledge into an answer surface
          that operators can trust, auditors can inspect, and executives can govern.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {principles.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border/60 bg-card/50 p-6">
            <p.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      <section className="mt-16 rounded-2xl border border-border/60 bg-card/40 p-8">
        <h2 className="text-2xl font-semibold text-foreground">How we work</h2>
        <p className="mt-4 text-muted-foreground">
          OPSQAI is developed alongside operational teams, not in isolation. Every feature ships
          against a real workflow: onboarding a new hire in a distribution center, digitizing a
          paper SOP library, preparing for an ISO-aligned audit, or standing up a multi-site
          knowledge base across a 3PL network. Nothing ships that hasn't been shaped by an operator.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/product"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-card"
          >
            See the product <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/trust"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-card"
          >
            Trust Center <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Explore the demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/security-architecture")({
  head: () => ({ meta: [
    { title: "Security Architecture — OPSQAI Trust Center" },
    { name: "description", content: "How OPSQAI is built: edge runtime, managed Postgres with RLS, segregated AI gateway, no service-role keys in the browser." },
    { property: "og:title", content: "Security Architecture — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/security-architecture" },
      { property: "og:description", content: "How OPSQAI is built: edge runtime, managed Postgres with RLS, segregated AI gateway, no service-role keys in the browser." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/security-architecture" }],
  }),
  component: () => (
    <TrustTopic
      title="Security Architecture"
      intro="OPSQAI is a single-page React application served from an edge runtime, talking to a managed PostgreSQL backend through a publishable API and to AI models through a server-side gateway."
    >
      <p className="mb-6 rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary">
        Built on modern architecture: TanStack, Supabase, pgvector, RLS, PWA-ready. OPSQAI itself is not SOC 2 or ISO/IEC 27001 certified; the underlying Supabase / Lovable platform is (see the ISO 27001 Roadmap for scope).
      </p>
      <h2>Layers</h2>
      <ul>
        <li><strong>Edge / CDN:</strong> TLS termination, DDoS protection, static asset caching, request routing.</li>
        <li><strong>Application (TanStack Start on Workers):</strong> SSR for the marketing site, server functions and server routes for all privileged work.</li>
        <li><strong>Data plane (Lovable Cloud / Postgres):</strong> Row-level security on every public table, separate roles for <code>anon</code>, <code>authenticated</code> and <code>service_role</code>.</li>
        <li><strong>AI gateway:</strong> Customer prompts and document chunks reach LLMs only via the server gateway. No model API key ships to the browser.</li>
      </ul>
      <h2>Trust boundaries</h2>
      <ul>
        <li>The browser holds only the publishable anon key and the authenticated user's JWT.</li>
        <li>The service-role key is held server-side, never sent to the browser, and only used by verified server code (webhooks, admin maintenance).</li>
        <li>Privileged server functions verify the caller's session and role before reading or writing.</li>
      </ul>
      <h2>Defense in depth</h2>
      <ul>
        <li>RLS at the database layer, role checks at the API layer, and UI gating at the route layer — three independent locks.</li>
        <li>Strict Content-Security-Policy-friendly architecture (no inline eval).</li>
        <li>Audit logging for sensitive actions, scoped per tenant.</li>
      </ul>
      <h2>Change management</h2>
      <p>All schema changes ship as reviewed migrations. RLS policies are revisited whenever a new table or column is introduced.</p>
    </TrustTopic>
  ),
});
